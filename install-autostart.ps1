# Install BlogPost autostart: TRAY at logon + quiet watchdog (no windows)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$logonTask = "BlogPost-Tray"
$watchTask = "BlogPost-Watchdog"
$legacy = @("BlogPost-Local-Server", "BlogPost-Local-Server-Startup", "BlogPost-Tray-Startup")

foreach ($n in @($logonTask, $watchTask) + $legacy) {
  Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
}

# Remove Startup shortcut if present (it flashed a window)
$startup = Join-Path ([Environment]::GetFolderPath('Startup')) "BlogPost Server.lnk"
if (Test-Path $startup) { Remove-Item $startup -Force -ErrorAction SilentlyContinue }

# 1) Tray at logon — Hidden, no window
$trayAction = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\tray.ps1`"" `
  -WorkingDirectory $root
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $logonTask `
  -Action $trayAction `
  -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME) `
  -Settings $settings `
  -Description "BlogPost tray + hidden Vite :3000 (no window)" `
  -Force | Out-Null

# 2) Quiet watchdog every 5 min (was 2 min — less aggressive)
$watchAction = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\watchdog.ps1`"" `
  -WorkingDirectory $root
Register-ScheduledTask `
  -TaskName $watchTask `
  -Action $watchAction `
  -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)) `
  -Settings $settings `
  -Description "BlogPost watchdog (only if :3000 down, 5 min)" `
  -Force | Out-Null

# Start tray now (hidden)
Start-Process -FilePath "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\tray.ps1`"" `
  -WorkingDirectory $root -WindowStyle Hidden

Write-Output "Installed: $logonTask (tray, hidden) + $watchTask (5 min)"
