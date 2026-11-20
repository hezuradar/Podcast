<#
  Builds the Windows version of Hitzez.

    powershell -ExecutionPolicy Bypass -File packaging\build.ps1

  Output:
    packaging\dist\Hitzez\                 portable folder (double-click Hitzez.exe)
    packaging\dist\Hitzez-Setup-<ver>.exe  installer, if Inno Setup 6 is installed

  Needs on the build machine: Node.js, the worker venv (worker\.venv with requirements + pyinstaller),
  ffmpeg/ffprobe on PATH and the Whisper model in the Hugging Face cache (or pass -ModelDir).
  The end user's PC needs nothing: everything is copied into the folder.
#>
param(
  [string]$Version = "1.0.0",
  [string]$ModelDir = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$app = Join-Path $root "app"
$build = Join-Path $PSScriptRoot "build"
$dist = Join-Path $PSScriptRoot "dist"
$out = Join-Path $dist "Hitzez"
$python = Join-Path $root "worker\.venv\Scripts\python.exe"

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Require($path, $what) { if (-not (Test-Path $path)) { throw "Falta $what en $path" } }

Require $python "el entorno del worker (py -m venv worker\.venv; pip install -r worker\requirements.txt pyinstaller)"
$node = (Get-Command node -ErrorAction Stop).Source
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source
$ffprobe = (Get-Command ffprobe -ErrorAction Stop).Source
if (-not $ModelDir) {
  $snapshots = Join-Path $env:USERPROFILE ".cache\huggingface\hub\models--Systran--faster-whisper-small\snapshots"
  Require $snapshots "el modelo Whisper small (transcribe un audio una vez con la app para descargarlo)"
  $ModelDir = (Get-ChildItem $snapshots -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}
Require (Join-Path $ModelDir "model.bin") "el modelo Whisper"

Step "1/6 Web (Next.js standalone)"
Push-Location $app
npm run build
if ($LASTEXITCODE -ne 0) { throw "La compilación de la web falló" }
Pop-Location

Step "2/6 Worker (PyInstaller)"
& $python -m PyInstaller (Join-Path $root "worker\main.py") --name worker --onedir --noconfirm --console `
  --paths (Join-Path $root "worker") --collect-all faster_whisper --collect-all ctranslate2 `
  --collect-all onnxruntime --collect-all tokenizers `
  --distpath (Join-Path $build "dist") --workpath (Join-Path $build "work") --specpath $build
if ($LASTEXITCODE -ne 0) { throw "PyInstaller falló" }

Step "3/6 Icono"
$iconPng = Join-Path $build "icon.png"
$iconIco = Join-Path $build "hitzez.ico"
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"; $g.TextRenderingHint = "AntiAliasGridFit"
$g.Clear([System.Drawing.Color]::Transparent)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#2f55d4"))
$g.FillEllipse($brush, 8, 8, 240, 240)
$font = New-Object System.Drawing.Font "Segoe UI", 132, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$format = New-Object System.Drawing.StringFormat; $format.Alignment = "Center"; $format.LineAlignment = "Center"
$g.DrawString("H", $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 4, 256, 256), $format)
$bmp.Save($iconPng, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
& $ffmpeg -hide_banner -loglevel error -y -i $iconPng -vf scale=256:256 $iconIco
if ($LASTEXITCODE -ne 0) { throw "No se pudo crear el icono" }

Step "4/6 Lanzador (Hitzez.exe)"
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
Require $csc "el compilador de C# de .NET Framework"
$launcher = Join-Path $build "Hitzez.exe"
& $csc /nologo /target:winexe /optimize+ "/out:$launcher" "/win32icon:$iconIco" `
  /reference:System.Windows.Forms.dll /reference:System.Drawing.dll (Join-Path $PSScriptRoot "launcher\Hitzez.cs")
if ($LASTEXITCODE -ne 0) { throw "La compilación del lanzador falló" }

Step "5/6 Carpeta portable"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $out "runtime\ffmpeg"), (Join-Path $out "models") | Out-Null
Copy-Item $launcher $out
Copy-Item $node (Join-Path $out "runtime\node.exe")
Copy-Item $ffmpeg, $ffprobe (Join-Path $out "runtime\ffmpeg")
Copy-Item (Join-Path $app ".next\standalone") (Join-Path $out "app") -Recurse
Copy-Item (Join-Path $app ".next\static") (Join-Path $out "app\.next\static") -Recurse
Copy-Item (Join-Path $app "public") (Join-Path $out "app\public") -Recurse
Copy-Item (Join-Path $build "dist\worker") (Join-Path $out "worker") -Recurse
Copy-Item $ModelDir (Join-Path $out "models\whisper-small") -Recurse
Copy-Item (Join-Path $PSScriptRoot "LICENCIAS.txt") $out
$size = "{0:N0} MB" -f ((Get-ChildItem $out -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
Write-Host "Carpeta lista: $out ($size)"

Step "6/6 Instalador (Inno Setup)"
$iscc = @(
  "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
  "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
  Write-Warning "Inno Setup 6 no está instalado: se omite el Setup.exe. La carpeta portable funciona igual."
  exit 0
}
$setupDir = Join-Path $dist "setup"
& $iscc /Qp "/DAppVersion=$Version" "/DSourceDir=$out" "/DOutputDir=$setupDir" "/DIconFile=$iconIco" (Join-Path $PSScriptRoot "hitzez.iss")
if ($LASTEXITCODE -ne 0) { throw "Inno Setup falló" }
Write-Host "Instalador listo en $setupDir" -ForegroundColor Green
