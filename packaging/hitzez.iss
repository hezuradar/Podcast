; Inno Setup 6 script for Hitzez. Built by packaging\build.ps1, which passes:
;   AppVersion, SourceDir (the portable folder), OutputDir, IconFile.
; Installs per user (no administrator rights) into %LOCALAPPDATA%\Programs\Hitzez.
; User data lives in %LOCALAPPDATA%\Hitzez and is kept when uninstalling.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{6B0F3A52-5C4E-4C1B-9E25-2F55D4A1E7B1}
AppName=Hitzez
AppVersion={#AppVersion}
AppPublisher=hezuradar
AppPublisherURL=https://github.com/hezuradar/Podcast
DefaultDirName={localappdata}\Programs\Hitzez
DefaultGroupName=Hitzez
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=Hitzez-Setup-{#AppVersion}
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\Hitzez.exe
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
WizardStyle=modern
CloseApplications=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; GroupDescription: "Accesos directos:"

[Files]
; route-cache and .next\cache are written by the server at runtime (e.g. if the portable folder was
; tried before packaging): never ship them. Their paths are also deep enough to hit MAX_PATH.
Source: "{#SourceDir}\*"; DestDir: "{app}"; Excludes: "\app\.next\server\route-cache\*,\app\.next\cache\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Hitzez"; Filename: "{app}\Hitzez.exe"
Name: "{group}\Desinstalar Hitzez"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Hitzez"; Filename: "{app}\Hitzez.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Hitzez.exe"; Description: "Abrir Hitzez ahora"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Cache the web server writes while running (not installed by us, so not tracked by the uninstaller).
Type: filesandordirs; Name: "{app}\app\.next\server\route-cache"
Type: filesandordirs; Name: "{app}\app\.next\cache"

[UninstallRun]
; Close a running Hitzez (its Job Object then ends the web server and the worker).
Filename: "{sys}\taskkill.exe"; Parameters: "/IM Hitzez.exe /F"; Flags: runhidden; RunOnceId: "CloseHitzez"
