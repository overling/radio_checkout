@echo off
title Asset Tracker Manager
color 0A

:MENU
cls
echo.
echo  ========================================
echo   Asset Tracker - Manager
echo  ========================================
echo.
echo   1. Start App (serve files + open browser)
echo   2. Stop App (kill file server)
echo   3. Restart App
echo   4. Check Status
echo   5. Open Browser Only
echo   6. Run Test Harness (open test page)
echo   7. Exit
echo.
set /p choice="  Select option (1-7): "

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto STATUS
if "%choice%"=="5" goto OPEN
if "%choice%"=="6" goto TEST
if "%choice%"=="7" goto EXIT
echo.
echo  Invalid choice. Try again.
timeout /t 2 >nul
goto MENU

:START
cls
echo.
echo  Starting Asset Tracker on http://localhost:8000 ...
echo.
:: Check if already running
powershell -Command "if (Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue) { Write-Host '  Already running on port 8000!' -ForegroundColor Yellow; exit 1 }" && (
    echo  Already running. Use Restart to reset it.
    echo.
    pause
    goto MENU
)
start "Asset Tracker" powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 2 >nul
start http://localhost:8000
echo  App started and browser opened.
echo.
pause
goto MENU

:STOP
cls
echo.
echo  Stopping Asset Tracker...
echo.
powershell -Command ^
    "$procs = Get-Process powershell, pwsh -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Asset Tracker*' }; ^
     if ($procs) { $procs | Stop-Process -Force; Write-Host '  Stopped.' -ForegroundColor Green } ^
     else { Write-Host '  Not running.' -ForegroundColor Yellow }"
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  Killed process on port 8000.' -ForegroundColor Green }"
echo.
pause
goto MENU

:RESTART
cls
echo.
echo  Restarting Asset Tracker...
echo.
powershell -Command ^
    "$procs = Get-Process powershell, pwsh -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Asset Tracker*' }; ^
     if ($procs) { $procs | Stop-Process -Force; Write-Host '  Old instance stopped.' -ForegroundColor Green } ^
     else { Write-Host '  No running instance found, starting fresh.' -ForegroundColor Yellow }"
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { $conn | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '  Freed port 8000.' -ForegroundColor Green }"
timeout /t 2 >nul
start "Asset Tracker" powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
timeout /t 2 >nul
start http://localhost:8000
echo.
echo  Restarted and browser opened.
echo.
pause
goto MENU

:STATUS
cls
echo.
echo  ========================================
echo   Status
echo  ========================================
echo.
powershell -Command ^
    "$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue; ^
     if ($conn) { ^
         $pid = $conn[0].OwningProcess; ^
         $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue; ^
         Write-Host '  STATUS: RUNNING' -ForegroundColor Green; ^
         Write-Host \"  PID: $pid\" -ForegroundColor Cyan; ^
         Write-Host \"  URL: http://localhost:8000\" -ForegroundColor Cyan ^
     } else { ^
         Write-Host '  STATUS: NOT RUNNING' -ForegroundColor Red ^
     }"
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

:TEST
cls
echo.
echo  Opening test harness...
start http://localhost:8000#test-harness
echo  Done.
echo.
pause
goto MENU

:EXIT
echo.
echo  Goodbye.
timeout /t 1 >nul
exit
