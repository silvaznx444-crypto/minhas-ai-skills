@echo off
cd /d "%~dp0"
py -3 "INICIAR_ETAPA_16.py"
if errorlevel 1 python "INICIAR_ETAPA_16.py"
pause
