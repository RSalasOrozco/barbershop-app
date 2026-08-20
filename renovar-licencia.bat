@echo off
title BarberTrack - Renovar licencia
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo  BarberTrack - Renovar licencia de un cliente
echo ============================================
echo.

set /p NEGOCIO="Nombre del negocio (ej: Barberia El Rami): "
if "%NEGOCIO%"=="" set NEGOCIO=Mi Barberia
set /p DIAS="Dias de licencia [365]: "
if "%DIAS%"=="" set DIAS=365
set /p MAXBAR="Maximo de peluqueros [5]: "
if "%MAXBAR%"=="" set MAXBAR=5

set DEST=%CD%\licencias\%NEGOCIO%
if not exist "%DEST%" mkdir "%DEST%"

set GENERADOR=%CD%\scripts\generate-license.js
pushd "%DEST%"
node "%GENERADOR%" "%NEGOCIO%" %DIAS% %MAXBAR%
popd

echo.
echo ============================================
echo  LISTO! Nueva licencia creada:
echo   %DEST%\license.json
echo.
echo  ENVIA ese archivo al cliente por WhatsApp o email.
echo  El cliente debe REEMPLAZAR el archivo license.json
echo  que esta en su carpeta del proyecto (ej. C:\BarberTrack).
echo ============================================
pause