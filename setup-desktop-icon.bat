@echo off
echo Creating desktop shortcut...
powershell -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
pause