@echo off
setlocal EnableDelayedExpansion

TITLE ZIM Downloader Setup Wizard
echo ================================================================
echo        ZIM UNIVERSAL MEDIA DOWNLOADER - SETUP WIZARD
echo ================================================================

cd /d "%~dp0"

:: 1. CHECK PYTHON
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from python.org and try again.
    pause
    pause
    exit /b 1
)
echo [OK] Python found.

:: 2. SETUP VIRTUAL ENVIRONMENT
if not exist ".venv" (
    echo [INFO] Creating virtual environment...
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        pause
        exit /b 1
    )
) else (
    echo [OK] Virtual environment exists.
)

:: 3. ACTIVATE ENVIRONMENT & INSTALL MODULES
echo [INFO] Activating environment and updating modules...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
python -m pip install -r requirements.txt
python -m pip install pyperclip aria2p >nul
echo [OK] Python modules ready.

:: 4. CHECK TOOLS DIRECTORY
if not exist "tools" mkdir tools

:: 5. CHECK FFMPEG
if not exist "tools\ffmpeg.exe" (
    echo [INFO] FFmpeg not found. Downloading...
    powershell -Command "Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'ffmpeg.zip'"
    if exist "ffmpeg.zip" (
        echo [INFO] Extracting FFmpeg...
        powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'temp_ffmpeg' -Force"
        
        :: Move exe files
        for /r "temp_ffmpeg" %%f in (ffmpeg.exe) do move "%%f" "tools\" >nul
        for /r "temp_ffmpeg" %%f in (ffprobe.exe) do move "%%f" "tools\" >nul
        
        :: Cleanup
        del ffmpeg.zip
        rmdir /s /q "temp_ffmpeg"
        echo [OK] FFmpeg installed.
    ) else (
        echo [ERROR] Download failed. Please download FFmpeg manually.
    )
) else (
    echo [OK] FFmpeg found.
)

:: 6. CHECK ARIA2C
if not exist "tools\aria2c.exe" (
    echo [INFO] Aria2c not found. Downloading...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/aria2/aria2/releases/download/release-1.36.0/aria2-1.36.0-win-64bit-build1.zip' -OutFile 'aria2.zip'"
    if exist "aria2.zip" (
        echo [INFO] Extracting Aria2c...
        powershell -Command "Expand-Archive -Path 'aria2.zip' -DestinationPath 'temp_aria2' -Force"
        
        :: Move exe
        for /r "temp_aria2" %%f in (aria2c.exe) do move "%%f" "tools\" >nul
        
        :: Cleanup
        del aria2.zip
        rmdir /s /q "temp_aria2"
        echo [OK] Aria2c installed.
    ) else (
        echo [ERROR] Download failed. Please download Aria2c manually.
    )
) else (
)

:: 7. CHECK DENO (Required for yt-dlp JS execution)
if not exist "tools\deno.exe" (
    echo [INFO] Deno not found. Downloading...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/denoland/deno/releases/download/v1.39.1/deno-x86_64-pc-windows-msvc.zip' -OutFile 'deno.zip'"
    if exist "deno.zip" (
        echo [INFO] Extracting Deno...
        powershell -Command "Expand-Archive -Path 'deno.zip' -DestinationPath 'temp_deno' -Force"
        
        :: Move exe
        for /r "temp_deno" %%f in (deno.exe) do move "%%f" "tools\" >nul
        
        :: Cleanup
        del deno.zip
        rmdir /s /q "temp_deno"
        echo [OK] Deno installed.
    ) else (
        echo [ERROR] Download failed. Please download Deno manually.
    )
) else (
    echo [OK] Deno found.
)

echo ================================================================
echo [SUCCESS] Setup complete! You can now run 'run.bat'.
echo ================================================================
pause
