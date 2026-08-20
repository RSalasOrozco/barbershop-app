@echo off
title BarberTrack - Instalacion
cd /d "%~dp0"

echo ============================================
echo  BarberTrack - Instalacion
echo ============================================
echo.

echo [0/3] Revisando que este instalado Node.js...

set "NODE_FOUND="
where node >nul 2>nul && set "NODE_FOUND=1"

if not defined NODE_FOUND (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_FOUND=1"
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)
if not defined NODE_FOUND (
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "NODE_FOUND=1"
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
    )
)

if not defined NODE_FOUND (
    echo.
    echo   ERROR: Esta computadora NO tiene Node.js disponible.
    echo.
    echo   Como comprobarlo:
    echo     Paso 1 - Pulsa Windows + R, escribe cmd y presiona Enter.
    echo     Paso 2 - Escribe node -v y presiona Enter.
    echo       Si sale un numero = Node esta, pero hay que
    echo       REINICIAR la PC y volver a abrir este archivo.
    echo       Si dice no se reconoce = hay que instalar Node.js desde
    echo       nodejs.org version LTS, y luego REINICIAR.
    echo.
    echo   IMPORTANTE: despues de instalar o actualizar Node.js,
    echo   REINICIA la computadora antes de volver a ejecutar este archivo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   Node.js detectado: %%v
echo.

echo [1/3] Instalando dependencias (necesita internet)...
call npm install
if errorlevel 1 (
    echo.
    echo   ERROR: No se pudieron instalar las dependencias.
    echo   Revisa que esta computadora tenga internet y vuelve a intentar.
    pause
    exit /b 1
)

echo.
echo [2/3] Compilando la aplicacion...
call npm run build
if errorlevel 1 (
    echo.
    echo   ERROR: La compilacion fallo.
    echo   Copia el mensaje rojo de arriba y envialo a tu proveedor.
    pause
    exit /b 1
)

if not exist ".next\BUILD_ID" (
    echo.
    echo   ERROR: La compilacion no se completo correctamente.
    echo   Vuelve a ejecutar este archivo.
    pause
    exit /b 1
)

echo.
echo [3/3] Verificacion final...
echo.
echo ============================================
echo  INSTALACION COMPLETADA
echo.
echo  Ahora ejecuta "Iniciar BarberTrack.bat"
echo  para abrir el sistema.
echo ============================================
pause