@echo off
title BarberTrack - Preparar entrega
cd /d "%~dp0"
chcp 65001 >nul

echo ============================================
echo  BarberTrack - Preparar carpeta de entrega
echo ============================================
echo.

set /p NEGOCIO="Nombre del negocio (ej: Barberia X): "
if "%NEGOCIO%"=="" set NEGOCIO=Mi Barberia
set /p DIAS="Dias de licencia [365]: "
if "%DIAS%"=="" set DIAS=365
set /p MAXBAR="Maximo de peluqueros [5]: "
if "%MAXBAR%"=="" set MAXBAR=5

set DEST=%CD%\entregas\%NEGOCIO%

if exist "%DEST%" (
    echo [AVISO] Ya existe una carpeta para "%NEGOCIO%", se reemplazara.
    rmdir /s /q "%DEST%"
)
mkdir "%DEST%"

echo.
echo [1/3] Copiando el proyecto (sin base de datos ni datos de prueba)...
robocopy "%CD%" "%DEST%" /E /XD node_modules .next backups entregas licencias scripts .git /XF barbershop.db license.json .env.local preparar-entrega.bat renovar-licencia.bat /NFL /NDL /NJH /NJS /NP >nul

echo [2/3] Generando licencia para %NEGOCIO%...
set GENERADOR=%CD%\scripts\generate-license.js
pushd "%DEST%"
node "%GENERADOR%" "%NEGOCIO%" %DIAS% %MAXBAR%
popd

echo [3/3] Verificando...
echo.
echo ============================================
echo  LISTO! Carpeta de entrega:
echo   %DEST%
echo.
echo  Copia esa carpeta al USB y entregala.
echo  En el PC del cliente: "instalar.bat" y luego "Iniciar BarberTrack.bat"
echo ============================================
pause