@echo off
title Iniciar MiNegocio
echo ========================================================
echo               INICIANDO APLICACION MINEGOCIO
echo ========================================================
echo.
echo 1. Abriendo la aplicacion en el navegador...
echo 2. Iniciando servidor local...
echo.
echo [IMPORTANTE] Mantenga esta ventana abierta mientras use la app.
echo Para cerrar la aplicacion, simplemente cierre esta ventana.
echo ========================================================
echo.

:: Abre el navegador predeterminado
start http://localhost:5173

:: Inicia el servidor de desarrollo local
npm run dev
