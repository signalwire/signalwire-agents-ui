@echo off
echo 🔨 Rebuilding SignalWire Agent Builder containers...

REM Set build version to current timestamp
for /f "delims=" %%i in ('powershell -command "(Get-Date -UFormat %%s).Replace('.', '')"') do set BUILD_VERSION=%%i
echo 🏷️  Build version: %BUILD_VERSION%

REM Set environment variable for Docker build
set BUILD_VERSION=%BUILD_VERSION%

REM Check if containers are running and stop them
docker-compose down

REM Build and start containers
docker-compose up --build -d

if %errorlevel% equ 0 (
    echo ✅ Done! Containers rebuilt and running.
    echo.
    echo 🌐 Access the application at:
    echo    • HTTP:  http://localhost:8429  ^(no SSL warnings^)
    echo    • HTTPS: https://localhost:8430 ^(self-signed cert^)
) else (
    echo ❌ Build failed! Check the output above for errors.
    exit /b 1
) 