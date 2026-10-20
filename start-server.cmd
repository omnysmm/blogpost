@echo off
rem BlogPost persistent server entrypoint (used by Scheduled Task)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
