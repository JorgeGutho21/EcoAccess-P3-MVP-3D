@echo off
REM Abre la presentacion EcoAccess P3 (simulacion local, sin conexion a hardware)
where msedge >nul 2>nul
if %errorlevel%==0 (
  start "" msedge "%~dp0dist\index.html"
) else (
  start "" "%~dp0dist\index.html"
)
