# Install BlogPost autostart + 2-minute watchdog (ASCII-only for PS 5.1)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$watchdog = Join-Path $root "watchdog.ps1"
$logonTask = "BlogPost-Local-Server"
$watchTask = "BlogPost-Watchdog"

foreach ($n in @($logonTask, "$logonTask-Startup", $watchTask)) {
  Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$root\start-server.ps1`"" -WorkingDirectory $root
$watchAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdog`"" -WorkingDirectory $root

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $logonTask `
  -Action $action `
  -Trigger (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME) `
  -Settings $settings `
  -Description "BlogPost Vite http://localhost:3000 (detached, at logon)" `
  -Force | Out-Null

Register-ScheduledTask `
  -TaskName $watchTask `
  -Action $watchAction `
  -Trigger (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 2) -RepetitionDuration (New-TimeSpan -Days 3650)) `
  -Settings $settings `
  -Description "Restart BlogPost Vite if :3000 is down (every 2 min)" `
  -Force | Out-Null

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  Register-ScheduledTask `
    -TaskName "$logonTask-Startup" `
    -Action $action `
    -Trigger (New-ScheduledTaskTrigger -AtStartup) `
    -Settings $settings `
    -Description "BlogPost Vite at boot" `
    -Force | Out-Null
  Write-Output "Registered boot task"
}

& (Join-Path $root "start-server.ps1")
Write-Output "Watchdog task: $watchTask (every 2 min)"
