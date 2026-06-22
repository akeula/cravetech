@echo off
title InverterHub Local Server Launcher
echo =======================================================
echo           INVERTERHUB SERVICE ENGINE LAUNCHER
echo =======================================================
echo.
echo Starting local web server on http://localhost:8000...
echo (Keep this window open while using the application)
echo.

:: Start python web server in the background
start /b python -m http.server 8000

:: Give the server a second to initialize
timeout /t 2 /nobreak >nul

:: Launch standard browser
echo Launching your web browser...
start http://localhost:8000

echo.
echo -------------------------------------------------------
echo Application is running at http://localhost:8000
echo Press any key in this window to stop the server and exit.
echo -------------------------------------------------------
pause >nul
taskkill /f /im python.exe >nul 2>&1
echo Server stopped.
exit
