# BlogPost local server - truly detached Vite on :3000
# No Register-ObjectEvent, no stdio redirect (those hang the shell and kill Vite).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File start-server.ps1
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 3000
$logDir = Join-Path $root "logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("server-" + (Get-Date -Format yyyyMMdd) + ".log")

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
    $r = Invoke-WebRequest -Uri ("http://localhost:" + $port + "/") -UseBasicParsing -TimeoutSec 3
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

# Already healthy? exit fast (idempotent).
$existing = Get-PortPid
if ($existing -and (Test-SiteUp)) {
  Write-Log ("healthy pid=" + $existing)
  Write-Output ("BlogPost OK http://localhost:" + $port + "/ pid=" + $existing)
  exit 0
}

# Port held but HTTP dead - kill it.
if ($existing) {
  Write-Log ("stale pid=" + $existing + " - killing")
  cmd /c "taskkill /PID $existing /F" 2>$null | Out-Null
  Start-Sleep -Milliseconds 800
}

$viteJs = Join-Path $root "node_modules\vite\bin\vite.js"
if (!(Test-Path $viteJs)) {
  Write-Log "vite missing"
  Write-Error "vite missing - run npm.cmd install"
  exit 1
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
Write-Log "start detached vite"

# Known-good pattern (MEMORY): Start-Process minimized, no redirect, no events.
Start-Process -FilePath $node -ArgumentList @(
  "`"$viteJs`"",
  "--host", "0.0.0.0",
  "--port", "$port",
  "--strictPort"
) -WorkingDirectory $root -WindowStyle Minimized

$deadline = (Get-Date).AddSeconds(20)
$ok = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 400
  if ((Get-PortPid) -and (Test-SiteUp)) { $ok = $true; break }
}

if ($ok) {
  $pidNow = Get-PortPid
  Write-Log ("READY pid=" + $pidNow)
  Write-Output ("BlogPost READY http://localhost:" + $port + "/ pid=" + $pidNow)
  exit 0
}

Write-Log "FAILED to bind"
Write-Error ("Failed to start Vite on " + $port)
exit 1
