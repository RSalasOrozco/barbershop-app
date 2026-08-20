@echo off
title BarberTrack - Backup
cd /d "%~dp0"

echo Creando copia de seguridad de la base de datos...
node scripts\backup.js

echo.
echo Puedes programar esta tarea en el Programador de Windows
echo para que se ejecute automaticamente todos los dias.
pause