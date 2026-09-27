# -*- coding: utf-8 -*-
"""
Módulo de Gerenciamento do Banco de Dados SQLite (StokPic).
Define conexões, criação de tabelas, índices e carga inicial de canais/taxas 2026.
"""

import os
import sys
import sqlite3

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_DIR = os.path.join(ROOT, 'data', 'database')
DB_PATH = os.path.join(DB_DIR, 'stokpic.db')


def get_connection(db_path=None):
    """Retorna uma conexão SQLite configurada com foreign keys ativas e Row factory."""
    if not db_path:
        db_path = DB_PATH
    
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    return conn


def init_db(db_path=None):
    """Cria todas as tabelas, índices e dados padrão no SQLite."""
    conn = get_connection(db_path)
    cursor = conn.cursor()

    # 1. Tabela de Produtos Pai (Modelos / Produtos Agrupados)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS produtos_pai (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku_pai TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        categoria TEXT,
        cat1 TEXT,
        cat2 TEXT,
        imagem_url TEXT,
        imagem_url2 TEXT,
        ncm TEXT,
        descricao TEXT,
        custo_min REAL NOT NULL DEFAULT 0.0,
        custo_max REAL NOT NULL DEFAULT 0.0,
        preco_venda_min REAL NOT NULL DEFAULT 0.0,
        preco_venda_max REAL NOT NULL DEFAULT 0.0,
        estoque_total INTEGER NOT NULL DEFAULT 0,
        ativo TEXT NOT NULL DEFAULT 'S',
        destaque TEXT DEFAULT 'N',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Tabela de Variações / SKUs Individuais do Catálogo
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS produtos_variacao (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_pai_id INTEGER REFERENCES produtos_pai(id) ON DELETE CASCADE,
        sku TEXT UNIQUE NOT NULL,
        sku_pai TEXT,
        nome TEXT NOT NULL,
        variacao TEXT,
        categoria TEXT,
        tamanho TEXT,
        cor TEXT,
        custo REAL NOT NULL DEFAULT 0.0,
        preco_cheio REAL NOT NULL DEFAULT 0.0,
        preco_promo REAL NOT NULL DEFAULT 0.0,
        preco_venda REAL NOT NULL DEFAULT 0.0,
        estoque INTEGER NOT NULL DEFAULT 0,
        ativo TEXT NOT NULL DEFAULT 'S',
        imagem_url TEXT,
        peso_g REAL DEFAULT 0.0,
        ncm TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_variacao_sku ON produtos_variacao(sku);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_variacao_sku_pai ON produtos_variacao(sku_pai);")

    # 3. Tabela de Canais de Venda
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS canais_venda (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        comissao_padrao_pct REAL NOT NULL DEFAULT 0.0,
        taxa_fixa_padrao REAL NOT NULL DEFAULT 0.0,
        embalagem_padrao REAL NOT NULL DEFAULT 1.50,
        margem_alvo_pct REAL NOT NULL DEFAULT 20.0,
        ativo INTEGER NOT NULL DEFAULT 1
    );
    """)

    # 4. Tabela de Regras e Faixas de Taxas dos Canais (Shopee 2026 & TikTok Shop)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regras_taxas_canal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        canal_id INTEGER REFERENCES canais_venda(id) ON DELETE CASCADE,
        faixa_min REAL NOT NULL,
        faixa_max REAL NOT NULL,
        comissao_pct REAL NOT NULL,
        taxa_fixa REAL NOT NULL,
        descricao_tier TEXT NOT NULL
    );
    """)

    # 5. Tabela de Anúncios Reais Shopee
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anuncios_shopee (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shopee_item_id TEXT,
        shopee_var_id TEXT,
        nome_anuncio TEXT NOT NULL,
        nome_variacao TEXT,
        sku_anuncio TEXT,
        sku_variacao TEXT,
        sku_produto_loja TEXT REFERENCES produtos_variacao(sku) ON DELETE SET NULL,
        match_tipo TEXT,
        preco_cadastro_ancora REAL NOT NULL DEFAULT 0.0,
        preco_real_promo REAL NOT NULL DEFAULT 0.0,
        desconto_real_pct REAL NOT NULL DEFAULT 0.0,
        estoque_shopee INTEGER NOT NULL DEFAULT 0,
        imagem_url TEXT,
        taxa_estimada REAL DEFAULT 0.0,
        repasse_estimado REAL DEFAULT 0.0,
        lucro_estimado REAL DEFAULT 0.0,
        margem_estimada REAL DEFAULT 0.0,
        tier_shopee TEXT,
        desc_max_seguro_20 INTEGER DEFAULT 0,
        desc_max_seguro_10 INTEGER DEFAULT 0,
        ultima_sincronizacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shopee_sku_loja ON anuncios_shopee(sku_produto_loja);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_shopee_var_id ON anuncios_shopee(shopee_var_id);")

    # 6. Tabela de Histórico de Importações
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historico_importacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo_origem TEXT NOT NULL,
        nome_arquivo TEXT NOT NULL,
        total_registros INTEGER NOT NULL DEFAULT 0,
        registros_sucesso INTEGER NOT NULL DEFAULT 0,
        registros_erros INTEGER NOT NULL DEFAULT 0,
        detalhes_json TEXT,
        data_importacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Carga Inicial de Canais e Regras se vazios
    _seed_canais_e_regras(cursor)

    conn.commit()
    conn.close()
    print(f"Banco de dados SQLite inicializado com sucesso em: {DB_PATH}")


def _seed_canais_e_regras(cursor):
    """Insere os canais padrão e regras oficiais 2026 de taxas."""
    canais = [
        ('loja', 'Loja Integrada (E-commerce Próprio)', 0.0, 0.0, 1.50, 30.0),
        ('shopee', 'Shopee Brasil (Artigo 26839 - 2026)', 14.0, 4.50, 1.50, 20.0),
        ('tiktok', 'TikTok Shop Brasil 2026', 10.0, 4.00, 1.50, 20.0)
    ]

    for codigo, nome, comissao, fixa, emb, margem in canais:
        cursor.execute("""
        INSERT OR IGNORE INTO canais_venda (codigo, nome, comissao_padrao_pct, taxa_fixa_padrao, embalagem_padrao, margem_alvo_pct)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (codigo, nome, comissao, fixa, emb, margem))

    # Obter IDs dos canais
    cursor.execute("SELECT id, codigo FROM canais_venda")
    canal_map = {row['codigo']: row['id'] for row in cursor.fetchall()}

    # Regras Shopee 2026
    shopee_id = canal_map.get('shopee')
    if shopee_id:
        cursor.execute("SELECT COUNT(*) as qtd FROM regras_taxas_canal WHERE canal_id = ?", (shopee_id,))
        if cursor.fetchone()['qtd'] == 0:
            regras_shopee = [
                (shopee_id, 0.00, 8.99, 20.0, 0.0, 'Sub R$ 9: 20% + 50% taxa fixa'),
                (shopee_id, 9.00, 79.99, 20.0, 4.50, 'Até R$ 79,99: 20% + R$ 4,50'),
                (shopee_id, 80.00, 99.99, 14.0, 16.00, 'R$ 80 a 99,99: 14% + R$ 16,00'),
                (shopee_id, 100.00, 199.99, 14.0, 20.00, 'R$ 100 a 199,99: 14% + R$ 20,00'),
                (shopee_id, 200.00, 99999.00, 14.0, 26.00, 'Acima de R$ 200: 14% + R$ 26,00')
            ]
            cursor.executemany("""
            INSERT INTO regras_taxas_canal (canal_id, faixa_min, faixa_max, comissao_pct, taxa_fixa, descricao_tier)
            VALUES (?, ?, ?, ?, ?, ?)
            """, regras_shopee)

    # Regras TikTok Shop 2026
    tiktok_id = canal_map.get('tiktok')
    if tiktok_id:
        cursor.execute("SELECT COUNT(*) as qtd FROM regras_taxas_canal WHERE canal_id = ?", (tiktok_id,))
        if cursor.fetchone()['qtd'] == 0:
            regras_tiktok = [
                (tiktok_id, 0.00, 49.99, 10.0, 4.00, 'Abaixo de R$ 50: 10% + R$ 4,00'),
                (tiktok_id, 50.00, 99999.00, 6.0, 6.00, 'A partir de R$ 50: 6% + R$ 6,00')
            ]
            cursor.executemany("""
            INSERT INTO regras_taxas_canal (canal_id, faixa_min, faixa_max, comissao_pct, taxa_fixa, descricao_tier)
            VALUES (?, ?, ?, ?, ?, ?)
            """, regras_tiktok)


if __name__ == '__main__':
    init_db()
