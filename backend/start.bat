@echo off
echo ====================================
echo JobMate AI Backend - Quick Start
echo ====================================
echo.

cd /d "%~dp0"

REM Check if venv exists
if not exist "venv\" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        echo Make sure Python is installed and in PATH
        pause
        exit /b 1
    )
) else (
    echo [1/4] Virtual environment already exists
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing/updating dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo [4/4] Starting FastAPI server...
echo.
echo ========================================
echo Backend running at http://localhost:8000
echo API Docs at http://localhost:8000/docs
echo Press Ctrl+C to stop
echo ========================================
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
