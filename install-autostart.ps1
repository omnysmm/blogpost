# Register BlogPost local server to start after reboot (logon + startup)
# Run once: powershell -ExecutionPolicy Bypass -File install-autostart.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$cmd = Join-Path $root "start-server.cmd"
$taskName = "BlogPost-Local-Server"

# Clean previous
foreach ($n in @($taskName, "$taskName-Startup")) {
  Unregister-ScheduledTask -TaskName $n -Confirm:$false -ErrorAction SilentlyContinue
}

# 1) At user logon - primary trigger (no admin required)
$action = New-ScheduledTaskAction -Execute $cmd -WorkingDirectory $root
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $triggerLogon `
  -Settings $settings `
  -Description "BlogPost Vite server on http://localhost:3000 (persistent after reboot)" `
  -RunLevel Limited `
  -Force | Out-Null

Write-Output "Registered logon task: $taskName"

# 2) At system startup - best-effort (needs admin)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($isAdmin) {
  $triggerBoot = New-ScheduledTaskTrigger -AtStartup
  Register-ScheduledTask `
    -TaskName "$taskName-Startup" `
    -Action $action `
    -Trigger $triggerBoot `
    -Settings $settings `
    -Description "BlogPost Vite server at boot (before logon)" `
    -RunLevel Limited `
    -Force | Out-Null
  Write-Output "Registered startup task: $taskName-Startup"
} else {
  Write-Output "Skipped startup task (no admin) - logon task is enough after user sign-in."
}

# Start now if not running
& $cmd
