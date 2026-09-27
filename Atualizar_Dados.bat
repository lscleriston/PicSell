@echo off
title Luluks - Sincronizar Banco SQLite e Dados
chcp 65001 >nul
echo ========================================================
echo Luluks Baby ^& Kids - Sincronizando com Banco SQLite...
echo ========================================================
python "%~dp0scripts\db\sync_all.py"
echo.
echo Processo finalizado com sucesso! Pressione qualquer tecla para sair.
pause >nul
