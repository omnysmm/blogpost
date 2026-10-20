# BlogPost watchdog - keep :3000 alive WITHOUT restart loops.
# Only helps when the site is down; start-server itself uses fail counters.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File (Join-Path $root "start-server.ps1")
exit 0
