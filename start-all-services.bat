@echo off
color 0A
echo.
echo ========================================
echo    FINTEL AI - Starting All Services
echo ========================================
echo.
echo [1/3] Starting Backend (Node.js)...
start "FINTEL Backend - Port 5000" cmd /k "cd /d %~dp0Backend && echo Starting Backend Server... && node server.js"
timeout /t 2 >nul

echo [2/3] Starting AI Agent (Python)...
start "FINTEL AI Agent - Port 8000" cmd /k "cd /d %~dp0AI-Agent && echo Starting AI Agent... && python fintel_api_fixed.py"
timeout /t 2 >nul

echo [3/3] Starting Frontend (React)...
start "FINTEL Frontend - Port 8080" cmd /k "cd /d %~dp0Frontend && echo Starting Frontend... && npm run dev"
timeout /t 2 >nul

echo.
echo ========================================
echo    ALL SERVICES STARTED!
echo ========================================
echo.
echo  Backend:  http://localhost:5000
echo  AI Agent: http://localhost:8000
echo  Frontend: http://localhost:8080
echo.
echo ========================================
echo  Opening browser in 5 seconds...
echo ========================================
timeout /t 5 >nul
start http://localhost:8080
echo.
echo  All services are running!
echo  Keep the 3 terminal windows open.
echo.
echo  Press any key to exit this window...
pause >nul
