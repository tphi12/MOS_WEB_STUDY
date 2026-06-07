@echo off
setlocal
title Go cai dat Wordie MOS Add-in

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-Wordie.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Da go Wordie MOS Add-in.
) else (
  echo Go cai dat khong thanh cong. Ma loi: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
