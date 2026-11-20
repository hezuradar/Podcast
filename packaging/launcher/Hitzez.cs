// Hitzez launcher: starts the web server (bundled Node) and the audio worker (frozen Python) with no
// console windows, opens the browser when the app answers, and lives in the notification area.
// Compiled with the C# 5 compiler that ships with Windows (.NET Framework 4.x): no C# 6+ syntax.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace Hitzez
{
    static class Program
    {
        public const int Port = 3210;
        const string MutexName = "Local\\Hitzez.SingleInstance";
        static readonly string Url = "http://127.0.0.1:" + Port + "/";

        [STAThread]
        static void Main()
        {
            bool isFirst;
            using (var mutex = new Mutex(true, MutexName, out isFirst))
            {
                if (!isFirst)
                {
                    // Already running: just bring the user to it.
                    OpenBrowser();
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (var tray = new TrayApp())
                {
                    Application.Run(tray);
                }
            }
        }

        public static string AppUrl { get { return Url; } }

        public static void OpenBrowser()
        {
            try { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); }
            catch (Exception) { /* no default browser: the tray menu still shows the address */ }
        }
    }

    sealed class TrayApp : ApplicationContext
    {
        readonly string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        readonly string dataDir;
        readonly string logDir;
        readonly NotifyIcon icon;
        readonly ChildProcesses children = new ChildProcesses();
        bool exiting;

        public TrayApp()
        {
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            dataDir = Path.Combine(local, "Hitzez", "data");
            logDir = Path.Combine(local, "Hitzez", "logs");
            Directory.CreateDirectory(dataDir);
            Directory.CreateDirectory(logDir);

            var menu = new ContextMenuStrip();
            menu.Items.Add("Abrir Hitzez", null, delegate { Program.OpenBrowser(); });
            menu.Items.Add("Abrir carpeta de datos", null, delegate { Process.Start("explorer.exe", "\"" + dataDir + "\""); });
            menu.Items.Add("Ver registros", null, delegate { Process.Start("explorer.exe", "\"" + logDir + "\""); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Salir", null, delegate { Exit(); });

            icon = new NotifyIcon
            {
                Icon = LoadIcon(),
                Text = "Hitzez",
                ContextMenuStrip = menu,
                Visible = true,
            };
            icon.DoubleClick += delegate { Program.OpenBrowser(); };
            icon.ShowBalloonTip(3000, "Hitzez", "Arrancando… se abrirá en el navegador en unos segundos.", ToolTipIcon.Info);

            var starter = new Thread(Start) { IsBackground = true };
            starter.Start();
        }

        Icon LoadIcon()
        {
            try { return Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch (Exception) { return SystemIcons.Application; }
        }

        void Start()
        {
            try
            {
                string runtime = Path.Combine(baseDir, "runtime");
                string ffmpegDir = Path.Combine(runtime, "ffmpeg");
                string path = ffmpegDir + ";" + Environment.GetEnvironmentVariable("PATH");

                var web = new ProcessStartInfo(Path.Combine(runtime, "node.exe"), "server.js");
                web.WorkingDirectory = Path.Combine(baseDir, "app");
                web.EnvironmentVariables["PORT"] = Program.Port.ToString();
                web.EnvironmentVariables["HOSTNAME"] = "127.0.0.1";
                web.EnvironmentVariables["NODE_ENV"] = "production";
                web.EnvironmentVariables["DATA_DIR"] = dataDir;
                web.EnvironmentVariables["NEXT_TELEMETRY_DISABLED"] = "1";
                children.Start(web, Path.Combine(logDir, "web.log"), OnChildExited);

                var worker = new ProcessStartInfo(Path.Combine(baseDir, "worker", "worker.exe"));
                worker.WorkingDirectory = Path.Combine(baseDir, "worker");
                worker.EnvironmentVariables["DATA_DIR"] = dataDir;
                worker.EnvironmentVariables["WHISPER_MODEL"] = Path.Combine(baseDir, "models", "whisper-small");
                worker.EnvironmentVariables["HF_HUB_OFFLINE"] = "1";
                worker.EnvironmentVariables["PATH"] = path;
                worker.EnvironmentVariables["PYTHONIOENCODING"] = "utf-8";
                children.Start(worker, Path.Combine(logDir, "worker.log"), OnChildExited);

                if (WaitForWeb(TimeSpan.FromSeconds(60)))
                {
                    Program.OpenBrowser();
                }
                else
                {
                    ShowError("La aplicación no ha respondido. Mira los registros (clic derecho en el icono > Ver registros).");
                }
            }
            catch (Exception error)
            {
                ShowError("No se pudo arrancar: " + error.Message);
            }
        }

        static bool WaitForWeb(TimeSpan timeout)
        {
            var deadline = DateTime.UtcNow + timeout;
            while (DateTime.UtcNow < deadline)
            {
                try
                {
                    var request = (HttpWebRequest)WebRequest.Create(Program.AppUrl);
                    request.Timeout = 2000;
                    using (var response = (HttpWebResponse)request.GetResponse())
                    {
                        if ((int)response.StatusCode < 500) return true;
                    }
                }
                catch (WebException) { /* not up yet */ }
                Thread.Sleep(500);
            }
            return false;
        }

        void OnChildExited(string name, int code)
        {
            if (exiting) return;
            ShowError("Se ha cerrado una parte de Hitzez (" + name + ", código " + code + "). Vuelve a abrir Hitzez; si se repite, mira los registros.");
        }

        void ShowError(string message)
        {
            if (icon != null) icon.ShowBalloonTip(10000, "Hitzez", message, ToolTipIcon.Error);
        }

        void Exit()
        {
            exiting = true;
            icon.Visible = false;
            children.Dispose();
            ExitThread();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                exiting = true;
                children.Dispose();
                icon.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    /// <summary>
    /// Child processes tied to a Windows Job Object with "kill on close": if the launcher exits or is
    /// killed, Windows ends the web server and the worker too, so nothing is left running.
    /// </summary>
    sealed class ChildProcesses : IDisposable
    {
        readonly IntPtr job;

        public ChildProcesses()
        {
            job = NativeMethods.CreateJobObject(IntPtr.Zero, null);
            var info = new NativeMethods.JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = NativeMethods.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            int length = Marshal.SizeOf(typeof(NativeMethods.JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            IntPtr buffer = Marshal.AllocHGlobal(length);
            try
            {
                Marshal.StructureToPtr(info, buffer, false);
                NativeMethods.SetInformationJobObject(job, NativeMethods.JobObjectExtendedLimitInformation, buffer, (uint)length);
            }
            finally { Marshal.FreeHGlobal(buffer); }
        }

        public void Start(ProcessStartInfo info, string logFile, Action<string, int> onExit)
        {
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.RedirectStandardOutput = true;
            info.RedirectStandardError = true;
            var log = new StreamWriter(logFile, false) { AutoFlush = true };
            var process = new Process { StartInfo = info, EnableRaisingEvents = true };
            DataReceivedEventHandler write = delegate(object sender, DataReceivedEventArgs e)
            {
                if (e.Data == null) return;
                lock (log) { log.WriteLine(e.Data); }
            };
            process.OutputDataReceived += write;
            process.ErrorDataReceived += write;
            string name = Path.GetFileNameWithoutExtension(info.FileName);
            process.Exited += delegate { onExit(name, process.ExitCode); };
            process.Start();
            NativeMethods.AssignProcessToJobObject(job, process.Handle);
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
        }

        public void Dispose()
        {
            // Closing the last handle to the job ends every process in it.
            if (job != IntPtr.Zero) NativeMethods.CloseHandle(job);
        }
    }

    static class NativeMethods
    {
        public const int JobObjectExtendedLimitInformation = 9;
        public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

        [StructLayout(LayoutKind.Sequential)]
        public struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
        public static extern IntPtr CreateJobObject(IntPtr attributes, string name);

        [DllImport("kernel32.dll")]
        public static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint length);

        [DllImport("kernel32.dll")]
        public static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

        [DllImport("kernel32.dll")]
        public static extern bool CloseHandle(IntPtr handle);
    }
}
