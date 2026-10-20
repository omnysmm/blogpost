# BlogPost local server - hidden Vite on :3000 (no window, no restart loops)
# Safe to run from tray, Task Scheduler, or CLI. Idempotent.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File start-server.ps1
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 3000
$logDir = Join-Path $root "logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("server-" + (Get-Date -Format yyyyMMdd) + ".log")
$failMarker = Join-Path $logDir "watchdog-fail.count"

function Write-Log([string]$msg) {
  try { Add-Content -Path $log -Value ("[" + (Get-Date -Format o) + "] " + $msg) -Encoding utf8 } catch {}
}

function Get-PortPid {
  try {
    $out = cmd /c "netstat -ano | findstr :$port | findstr LISTENING" 2>$null
    if ($out) {
      $line = (@($out) | Select-Object -First 1).ToString()
      if ($line -match '\s(\d+)\s*$') { return [int]$Matches[1] }
    }
  } catch {}
  return $null
}

function Test-SiteUp {
  try {
    $r = Invoke-WebRequest -Uri ("http://localhost:" + $port + "/") -UseBasicParsing -TimeoutSec 4
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Clear-FailCounter {
  try { Remove-Item $failMarker -Force -ErrorAction SilentlyContinue } catch {}
}

function Step-UpFailCounter {
  $n = 0
  if (Test-Path $failMarker) {
    try { $n = [int](Get-Content $failMarker -Raw).Trim() } catch { $n = 0 }
  }
  $n++
  Set-Content -Path $failMarker -Value $n -Encoding ascii
  return $n
}

# --- Already healthy: do nothing (prevents restart loops) ---
$existing = Get-PortPid
if ($existing) {
  $up = $false
  for ($i = 0; $i -lt 3; $i++) {
    if (Test-SiteUp) { $up = $true; break }
    Start-Sleep -Milliseconds 600
  }
  if ($up) {
    Clear-FailCounter
    Write-Log ("healthy pid=" + $existing)
    exit 0
  }
  # Unhealthy but process is alive: require 3 consecutive watchdog failures before kill
  $fails = Step-UpFailCounter
  Write-Log ("unhealthy pid=" + $existing + " failCount=" + $fails)
  if ($fails -lt 3) {
    exit 0
  }
  Write-Log ("stale pid=" + $existing + " - killing after " + $fails + " fails")
  try { Stop-Process -Id $existing -Force -ErrorAction SilentlyContinue } catch {}
  Start-Sleep -Milliseconds 1000
  Clear-FailCounter
}

$viteJs = Join-Path $root "node_modules\vite\bin\vite.js"
if (!(Test-Path $viteJs)) {
  Write-Log "vite missing"
  exit 1
}
$node = (Get-Command node.exe -ErrorAction Stop).Source
$vbs = Join-Path $root "run-vite-hidden.vbs"
Write-Log "start hidden vite"

# Fully hidden: wscript shows no console (unlike Start-Process Minimized)
Start-Process -FilePath "wscript.exe" -ArgumentList @(
  "`"$vbs`"",
  "`"$node`"",
  "`"$viteJs`"",
  "`"$root`"",
  "`"$port`""
) -WindowStyle Hidden

$deadline = (Get-Date).AddSeconds(25)
$ok = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if ((Get-PortPid) -and (Test-SiteUp)) { $ok = $true; break }
}

if ($ok) {
  Clear-FailCounter
  $pidNow = Get-PortPid
  Write-Log ("READY pid=" + $pidNow)
  exit 0
}

Write-Log "FAILED to bind"
exit 1
