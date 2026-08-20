@echo off
title BarberTrack
cd /d "%~dp0"

if not exist ".next\BUILD_ID" (
    echo La aplicacion no esta compilada.
    echo Ejecuta primero "instalar.bat" o "npm run build".
    pause
    exit /b 1
)

start "" http://localhost:3000
node node_modules\next\dist\bin\next start -p 3000
pause