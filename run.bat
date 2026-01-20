@echo off
TITLE ZIM Downloader
cd /d "%~dp0"

if not exist ".venv" (
    echo [ERROR] Virtual environment not found. Please run 'setup.bat' first.
    pause
    exit /b
)

call .venv\Scripts\activate.bat
python "tools\Downloader(V5).py"
pause
