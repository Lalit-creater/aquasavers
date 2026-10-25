@echo off
cd /d "%~dp0"
echo Starting AquaSavers Local Server...
start http://localhost:8080
node server.js
pause
