@echo off
rem BlogPost hidden entrypoint (no window flash)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-server.ps1"
