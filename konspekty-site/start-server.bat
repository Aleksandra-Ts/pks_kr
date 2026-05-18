@echo off
cd /d "%~dp0"
echo.
echo  http://localhost:8080/
echo  Ctrl+C - stop
echo.
python -m http.server 8080
