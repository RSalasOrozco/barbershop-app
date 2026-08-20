@echo off
title BarberTrack
cd /d "%~dp0"

if not exist ".next\BUILD_ID" (
    echo.
    echo   La aplicacion NO esta compilada aun.
    echo.
    echo   Falta ejecutar instalar.bat por primera vez.
    echo   Como hacerlo:
    echo     Paso 1 - Cierra esta ventana.
    echo     Paso 2 - Haz doble clic en instalar.bat.
    echo     Paso 3 - ESPERA hasta que diga INSTALACION COMPLETADA
    echo       tarda varios minutos la primera vez.
    echo     Paso 4 - Ahora si, vuelve a abrir este archivo.
    echo.
    pause
    exit /b 1
)

echo Abriendo el sistema en el navegador...
start "" http://localhost:3000
node node_modules\next\dist\bin\next start -p 3000
pause