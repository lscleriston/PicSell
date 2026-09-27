# -*- coding: utf-8 -*-
"""
Script Principal de Sincronização e Ingestão do StokPic.
Executa a esteira completa: SQLite DB -> Import Catálogo -> Import Shopee -> Export Web.
"""

import os
import sys
import time

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Adicionar raiz ao PYTHONPATH
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from scripts.db.database import init_db, get_connection, DB_PATH
from scripts.db.import_catalogo import importar_catalogo
from scripts.db.import_shopee import importar_shopee
from scripts.db.export_web import exportar_tudo


def executar_sincronizacao():
    start_time = time.time()
    print("=" * 65)
    print("🚀 STOKPIC / LULUKS — SINCRONIZAÇÃO COMPLETA COM BANCO SQLITE")
    print("=" * 65)
    print(f"📁 Banco de Dados: {os.path.relpath(DB_PATH, ROOT)}")
    print("-" * 65)

    # 1. Inicializar Banco
    print("\n[1/4] Inicializando Schema do Banco SQLite...")
    init_db()

    # 2. Ingerir Catálogo
    print("\n[2/4] Processando e Ingerindo Catálogo de Produtos...")
    ok_cat = importar_catalogo()
    if not ok_cat:
        print("❌ Falha na importação do catálogo. Abortando.")
        return False

    # 3. Ingerir Shopee
    print("\n[3/4] Processando e Auditando Anúncios da Shopee...")
    ok_shopee = importar_shopee()
    if not ok_shopee:
        print("⚠️ Aviso: Sincronização Shopee não concluída.")

    # 4. Exportar para Web
    print("\n[4/4] Gerando Datasets Analíticos para a Aplicação Web...")
    exportar_tudo()

    elapsed = time.time() - start_time

    # Resumo Geral
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as qtd FROM produtos_pai")
    total_pais = cursor.fetchone()['qtd']
    cursor.execute("SELECT COUNT(*) as qtd FROM produtos_variacao")
    total_vars = cursor.fetchone()['qtd']
    cursor.execute("SELECT COUNT(*) as qtd FROM anuncios_shopee")
    total_shopee = cursor.fetchone()['qtd']
    conn.close()

    print("\n" + "=" * 65)
    print("✨ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 65)
    print(f"📦 Modelos Pai Cadastrados : {total_pais}")
    print(f"🏷️ Variações / SKUs Totais  : {total_vars}")
    print(f"🛍️ Anúncios Shopee Auditados: {total_shopee}")
    print(f"⏱️ Tempo de Processamento   : {elapsed:.2f} segundos")
    print("=" * 65 + "\n")
    return True


if __name__ == '__main__':
    executar_sincronizacao()
