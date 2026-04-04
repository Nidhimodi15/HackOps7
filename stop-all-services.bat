@echo off
color 0C
echo.
echo ========================================
echo    FINTEL AI - Stopping All Services
echo ========================================
echo.

echo [1/2] Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% == 0 (
    echo  Backend stopped successfully!
) else (
    echo  No Backend processes found.
)

echo [2/2] Stopping Python processes...
taskkill /F /IM python.exe >nul 2>&1
if %errorlevel% == 0 (
    echo  AI Agent stopped successfully!
) else (
    echo  No AI Agent processes found.
)

echo.
echo ========================================
echo    ALL SERVICES STOPPED!
echo ========================================
echo.
echo  All FINTEL AI services have been stopped.
echo  You can now close this window.
echo.
pause
