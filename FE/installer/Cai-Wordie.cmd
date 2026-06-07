@echo off
setlocal
title Cai dat Wordie MOS Add-in

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Wordie.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Cai dat Wordie MOS Add-in thanh cong.
) else (
  echo Cai dat khong thanh cong. Ma loi: %EXIT_CODE%
)
echo.
pause
exit /b %EXIT_CODE%
