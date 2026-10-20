@echo off
rem BlogPost detached server entrypoint (Scheduled Task / Startup)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-server.ps1"
