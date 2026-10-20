# BlogPost local server - start/keep-alive Vite on port 3000
# Usage: powershell -ExecutionPolicy Bypass -File start-server.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 3000
$logDir = Join-Path $root "logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$log = Join-Path $logDir ("server-" + (Get-Date -Format yyyyMMdd) + ".log")

function Get-PortPid {
  try {
    $out = netstat -ano | Select-String (":" + $port) | Select-String "LISTENING"
    if ($out) {
      $line = @($out)[0]
      if ($line.ToString() -match '\s(\d+)\s*$') { return [int]$Matches[1] }
    }
  } catch {}
  return $null
}

$existing = Get-PortPid
if ($existing) {
  $proc = Get-Process -Id $existing -ErrorAction SilentlyContinue
  if ($proc) {
    ("[" + (Get-Date -Format o) + "] already running pid=" + $existing) | Add-Content -Path $log -Encoding utf8
    Write-Output ("BlogPost already running at http://localhost:" + $port + "/ (pid=" + $existing + ")")
    exit 0
  }
  try { taskkill /PID $existing /F 2>&1 | Out-Null } catch {}
  Start-Sleep -Milliseconds 500
}

$viteCmd = Join-Path $root "node_modules\vite\bin\vite.js"
if (!(Test-Path $viteCmd)) {
  ("[" + (Get-Date -Format o) + "] vite missing - run npm.cmd install") | Add-Content -Path $log -Encoding utf8
  Write-Error "vite missing"
  exit 1
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
("[" + (Get-Date -Format o) + "] starting vite cwd=" + $root) | Add-Content -Path $log -Encoding utf8

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $node
$psi.Arguments = "`"$viteCmd`" --host 0.0.0.0 --port $port --strictPort"
$psi.WorkingDirectory = $root
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $psi
$outHandler = {
  if (![string]::IsNullOrEmpty($EventArgs.Data)) {
    Add-Content -Path $Event.MessageData -Value $EventArgs.Data -Encoding utf8
  }
}
Register-ObjectEvent -InputObject $p -EventName OutputDataReceived -Action $outHandler -MessageData $log | Out-Null
Register-ObjectEvent -InputObject $p -EventName ErrorDataReceived -Action $outHandler -MessageData $log | Out-Null
[void]$p.Start()
$p.BeginOutputReadLine()
$p.BeginErrorReadLine()

$deadline = (Get-Date).AddSeconds(25)
$ok = $false
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if (Get-PortPid) { $ok = $true; break }
  if ($p.HasExited) { break }
}

if ($ok) {
  $pidNow = Get-PortPid
  ("[" + (Get-Date -Format o) + "] READY pid=" + $pidNow) | Add-Content -Path $log -Encoding utf8
  Write-Output ("BlogPost READY at http://localhost:" + $port + "/ (pid=" + $pidNow + ")")
  exit 0
} else {
  ("[" + (Get-Date -Format o) + "] FAILED to bind port " + $port) | Add-Content -Path $log -Encoding utf8
  Write-Error ("Failed to start Vite on port " + $port)
  exit 1
}
