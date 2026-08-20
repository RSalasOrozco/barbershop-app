@echo off
title BarberTrack - Instalacion
cd /d "%~dp0"

echo ============================================
echo  BarberTrack - Instalacion
echo ============================================
echo.

echo [1/2] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERROR al instalar dependencias.
    pause
    exit /b 1
)

echo.
echo [2/2] Compilando la aplicacion...
call npm run build
if errorlevel 1 (
    echo ERROR al compilar la aplicacion.
    pause
    exit /b 1
)

echo.
echo Instalacion completada.
echo Ejecuta "Iniciar BarberTrack.bat" para abrir el sistema.
pause