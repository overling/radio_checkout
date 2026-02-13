@echo off
title Asset Tracker Server Manager
color 0A

:MENU
cls
echo.
echo  ========================================
echo   Asset Tracker - Server Manager
echo  ========================================
echo.
echo   1. Start Server
echo   2. Stop Server
echo   3. Restart Server
echo   4. Check Server Status
echo   5. Start Server + Open Browser
echo   6. Open Browser Only
echo   7. Exit
echo.
set /p choice="  Select option (1-7): "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto START_OPEN
if "%choice%"=="6" goto OPEN
if "%choice%"=="7" goto EXIT
echo.
echo  Invalid choice. Try again.
timeout /t 2 >nul
goto MENU

:START
cls
echo.
echo  Starting server on http://localhost:8000 ...
echo.
:: Check if already running
powershell -Command "if (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue) { Write-Host '  Server is already running on port 8000!' -ForegroundColor Yellow; exit 1 }" && (
    echo  Server already running. Use Restart to reset it.
    echo.
    pause
    goto MENU
)
start "Asset Tracker Server" powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
echo  Server started.
echo.
pause
goto MENU

:STOP
cls
echo.
echo  Stopping server...
echo.
:: Kill any PowerShell process running server.ps1 on port 8000
powershell -Command ^
    "$procs = Get-Process powershell, pwsh -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Asset Tracker*' }; ^
     if ($procs) { $procs | Stop-Process -Force; Write-Host '  Server stopped.' -ForegroundColor Green } ^
     else { Write-Host '  No running server found.' -ForegroundColor Yellow }"
:: Also kill by port as fallback
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  Killed process on port 8000.' -ForegroundColor Green }"
echo.
pause
goto MENU

:RESTART
cls
echo.
echo  Restarting server...
echo.
:: Stop
powershell -Command ^
    "$procs = Get-Process powershell, pwsh -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Asset Tracker*' }; ^
     if ($procs) { $procs | Stop-Process -Force; Write-Host '  Old server stopped.' -ForegroundColor Green } ^
     else { Write-Host '  No running server found, starting fresh.' -ForegroundColor Yellow }"
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  Killed process on port 8000.' -ForegroundColor Green }"
:: Wait for port to free up
timeout /t 2 >nul
:: Start
start "Asset Tracker Server" powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
echo.
echo  Server restarted on http://localhost:8000
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  ========================================
echo   Server Status
echo  ========================================
echo.
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { ^
         $pid = $conn[0].OwningProcess; ^
         $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue; ^
         Write-Host '  STATUS: RUNNING' -ForegroundColor Green; ^
         Write-Host \"  PID: $pid\" -ForegroundColor Cyan; ^
         Write-Host \"  Process: $($proc.ProcessName)\" -ForegroundColor Cyan; ^
         Write-Host \"  URL: http://localhost:8000\" -ForegroundColor Cyan ^
     } else { ^
         Write-Host '  STATUS: STOPPED' -ForegroundColor Red; ^
         Write-Host '  No process listening on port 8000.' -ForegroundColor Yellow ^
     }"
echo.
pause
goto MENU

:START_OPEN
cls
echo.
echo  Starting server and opening browser...
echo.
powershell -Command "if (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue) { Write-Host '  Server already running.' -ForegroundColor Yellow } else { Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0server.ps1\"' -WindowStyle Normal; Write-Host '  Server started.' -ForegroundColor Green; Start-Sleep -Seconds 2 }"
start http://localhost:8000
echo  Browser opened.
echo.
pause
goto MENU

:OPEN
cls
echo.
echo  Opening browser...
start http://localhost:8000
echo  Done.
echo.
pause
goto MENU

:EXIT
echo.
echo  Goodbye.
timeout /t 1 >nul
exit
