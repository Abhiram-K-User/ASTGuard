@echo off
echo =====================================================================
echo               Starting ASTGuard Plagiarism Detector
echo =====================================================================
echo.

:: Start Backend FastAPI Server
echo [+] Launching Backend Server (FastAPI)...
start "ASTGuard Backend" cmd /k "venv\Scripts\python backend\main.py"

:: Start Frontend Vite Server
echo [+] Launching Frontend Dev Server (Vite)...
start "ASTGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =====================================================================
echo  Both backend and frontend servers are launching in separate windows!
echo  - Backend API: http://127.0.0.1:8000
echo  - Frontend Web UI: http://localhost:5173
echo =====================================================================
echo.
pause
