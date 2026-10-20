# BlogPost watchdog - keep :3000 alive. Safe to run every 1-2 minutes.
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $root "start-server.ps1")
exit $LASTEXITCODE
