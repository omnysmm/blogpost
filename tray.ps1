# BlogPost tray icon - hidden Vite server + system tray controls
# Double-click tray icon: open http://localhost:3000
# Menu: Open, Restart, Exit (stops tray only; server keeps running unless "Stop server")
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File tray.ps1
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 3000
$logDir = Join-Path $root "logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("tray-" + (Get-Date -Format yyyyMMdd) + ".log")

function Write-Log([string]$msg) {
  try { Add-Content -Path $log -Value ("[" + (Get-Date -Format o) + "] " + $msg) -Encoding utf8 } catch {}
}

function Start-Server {
  powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $root "start-server.ps1") | Out-Null
}

function Stop-Server {
  try {
    $out = cmd /c "netstat -ano | findstr :$port | findstr LISTENING" 2>$null
    if ($out) {
      $line = (@($out) | Select-Object -First 1).ToString()
      if ($line -match '\s(\d+)\s*$') {
        Stop-Process -Id ([int]$Matches[1]) -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}
}

function Open-Site {
  Start-Process ("http://localhost:" + $port + "/")
}

# --- Tray icon ---
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Text = "BlogPost server :$port"
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$miOpen = $menu.Items.Add("Open BlogPost")
$miRestart = $menu.Items.Add("Restart server")
$miStop = $menu.Items.Add("Stop server")
$menu.Items.Add("-") | Out-Null
$miExit = $menu.Items.Add("Exit tray")
$notify.ContextMenuStrip = $menu

$miOpen.Add_Click({ Open-Site })
$miRestart.Add_Click({
  Write-Log "menu restart"
  Stop-Server
  Start-Sleep -Milliseconds 800
  Start-Server
  [System.Windows.Forms.MessageBox]::Show("BlogPost server restarted", "BlogPost") | Out-Null
})
$miStop.Add_Click({
  Write-Log "menu stop"
  Stop-Server
})
$miExit.Add_Click({
  Write-Log "exit tray"
  $notify.Visible = $false
  $notify.Dispose()
  [System.Windows.Forms.Application]::Exit()
})

$notify.Add_DoubleClick({ Open-Site })

# Start server once when tray launches
Start-Server
Write-Log "tray started"

# Periodic keep-alive (every 3 min) - conservative
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 180000
$timer.Add_Tick({ Start-Server })
$timer.Start()

[System.Windows.Forms.Application]::Run()
