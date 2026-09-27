@echo off
title Luluks - Atualizar Dados da Planilha
echo ========================================================
echo Luluks Baby & Kids - Processando catalogo e estoque...
echo ========================================================
python "%~dp0gerar_dados.py"
echo.
echo ========================================================
echo Luluks Baby & Kids - Processando auditoria Shopee...
echo ========================================================
python "%~dp0analisar_shopee.py"
echo.
echo Processo finalizado com sucesso! Pressione qualquer tecla para sair.
pause >nul

