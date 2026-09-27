# -*- coding: utf-8 -*-
"""
Módulo para exportação analítica dos dados do SQLite para o Frontend Web.
Gera os arquivos dados_produtos.js e dados_shopee_real.js consumidos pela aplicação SPA.
"""

import os
import sys
import json

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
from .database import get_connection, ROOT

PROC_DIR = os.path.join(ROOT, 'data', 'processed')
WEB_DATA_DIR = os.path.join(ROOT, 'web', 'data')

SAIDA_PRODUTOS_JS = os.path.join(WEB_DATA_DIR, 'dados_produtos.js')
SAIDA_PRODUTOS_JSON = os.path.join(PROC_DIR, 'dados_produtos.json')
SAIDA_SHOPEE_JS = os.path.join(WEB_DATA_DIR, 'dados_shopee_real.js')
SAIDA_SHOPEE_JSON = os.path.join(PROC_DIR, 'analise_shopee_real.json')


def exportar_catalogo_web(conn):
    """Gera dados_produtos.js e dados_produtos.json a partir do SQLite."""
    cursor = conn.cursor()

    # 1. Obter todos os itens detalhados (variações)
    cursor.execute("""
    SELECT 
        v.id, v.produto_pai_id, v.sku, v.sku_pai, v.nome, v.variacao, v.categoria,
        v.tamanho, v.cor, v.custo, v.preco_cheio, v.preco_promo, v.preco_venda,
        v.estoque, v.ativo, v.imagem_url, v.peso_g, v.ncm,
        p.nome as pai_nome, p.imagem_url as pai_img, p.descricao as pai_descricao
    FROM produtos_variacao v
    LEFT JOIN produtos_pai p ON v.produto_pai_id = p.id
    ORDER BY v.nome, v.variacao
    """)
    
    rows_var = cursor.fetchall()

    itens_detalhados = []
    categorias_set = set()
    total_itens = len(rows_var)
    total_estoque = 0
    total_custo_estoque = 0.0
    total_venda_estoque = 0.0

    for r in rows_var:
        custo = float(r['custo'] or 0.0)
        preco_cheio = float(r['preco_cheio'] or 0.0)
        preco_promo = float(r['preco_promo'] or 0.0)
        preco_venda = float(r['preco_venda'] or 0.0)
        estoque = int(r['estoque'] or 0)
        categoria = r['categoria'] or 'Sem Categoria'
        categorias_set.add(categoria)

        custo_total = custo * estoque
        venda_total = preco_venda * estoque
        lucro_unit = preco_venda - custo
        lucro_total = lucro_unit * estoque
        margem_pct = (lucro_unit / preco_venda * 100.0) if preco_venda > 0 else 0.0
        markup_pct = (lucro_unit / custo * 100.0) if custo > 0 else 0.0

        total_estoque += estoque
        total_custo_estoque += custo_total
        total_venda_estoque += venda_total

        itens_detalhados.append({
            'sku': r['sku'],
            'sku_pai': r['sku_pai'],
            'nome': r['nome'],
            'variacao': r['variacao'],
            'categoria': categoria,
            'custo': round(custo, 2),
            'preco_cheio': round(preco_cheio, 2),
            'preco_promo': round(preco_promo, 2),
            'preco_venda': round(preco_venda, 2),
            'estoque': estoque,
            'custo_total': round(custo_total, 2),
            'venda_total': round(venda_total, 2),
            'lucro_unit': round(lucro_unit, 2),
            'lucro_total': round(lucro_total, 2),
            'margem_pct': round(margem_pct, 1),
            'markup_pct': round(markup_pct, 1),
            'ativo': r['ativo'],
            'img': r['imagem_url'] or r['pai_img'] or '',
            'peso': r['peso_g'] or 0.0,
            'ncm': r['ncm'] or ''
        })

    # 2. Obter produtos agrupados (pais)
    cursor.execute("""
    SELECT 
        p.id, p.sku_pai, p.nome, p.categoria, p.cat1, p.cat2, p.imagem_url, p.imagem_url2,
        p.ncm, p.descricao, p.custo_min, p.custo_max, p.preco_venda_min, p.preco_venda_max,
        p.estoque_total, p.ativo, p.destaque
    FROM produtos_pai p
    ORDER BY p.nome
    """)
    rows_pai = cursor.fetchall()

    # Indexar variações por sku_pai
    vars_by_parent = {}
    for it in itens_detalhados:
        p_sku = it['sku_pai']
        if p_sku not in vars_by_parent:
            vars_by_parent[p_sku] = []
        vars_by_parent[p_sku].append(it)

    produtos_agrupados = []
    for p in rows_pai:
        p_sku = p['sku_pai']
        vars_list = vars_by_parent.get(p_sku, [])
        if not vars_list:
            continue

        custos = [v['custo'] for v in vars_list if v['custo'] > 0] or [0.0]
        precos = [v['preco_venda'] for v in vars_list if v['preco_venda'] > 0] or [0.0]
        c_min = min(custos)
        c_max = max(custos)
        p_min = min(precos)
        p_max = max(precos)
        est_tot = sum(v['estoque'] for v in vars_list)
        custo_tot = sum(v['custo_total'] for v in vars_list)
        venda_tot = sum(v['venda_total'] for v in vars_list)
        lucro_tot = sum(v['lucro_total'] for v in vars_list)
        margem_med = (lucro_tot / venda_tot * 100.0) if venda_tot > 0 else 0.0

        produtos_agrupados.append({
            'sku': p_sku,
            'sku_pai': p_sku,
            'nome': p['nome'],
            'categoria': p['categoria'] or 'Sem Categoria',
            'img': p['imagem_url'] or (vars_list[0]['img'] if vars_list else ''),
            'img2': p['imagem_url2'] or '',
            'descricao': p['descricao'] or '',
            'ativo': p['ativo'],
            'destaque': p['destaque'],
            'ncm': p['ncm'] or '',
            'qtd_variacoes': len(vars_list),
            'estoque_total': est_tot,
            'custo_min': round(c_min, 2),
            'custo_max': round(c_max, 2),
            'preco_venda_min': round(p_min, 2),
            'preco_venda_max': round(p_max, 2),
            'custo_total_estoque': round(custo_tot, 2),
            'venda_total_estoque': round(venda_tot, 2),
            'lucro_total_estoque': round(lucro_tot, 2),
            'margem_media_pct': round(margem_med, 1),
            'variacoes': vars_list
        })

    # Obter nome da última planilha importada
    cursor.execute("""
    SELECT nome_arquivo, data_importacao 
    FROM historico_importacoes 
    WHERE tipo_origem = 'CATALOGO_LOJA' 
    ORDER BY id DESC LIMIT 1
    """)
    last_log = cursor.fetchone()
    arquivo_origem = last_log['nome_arquivo'] if last_log else 'produtos-catalogo.xlsx'
    data_atualizacao = last_log['data_importacao'] if last_log else ''

    total_lucro_estoque = total_venda_estoque - total_custo_estoque
    margem_global = (total_lucro_estoque / total_venda_estoque * 100.0) if total_venda_estoque > 0 else 0.0

    dados_finais = {
        'arquivo_origem': arquivo_origem,
        'data_atualizacao': data_atualizacao,
        'totais': {
            'total_itens': total_itens,
            'total_modelos': len(produtos_agrupados),
            'total_estoque': total_estoque,
            'total_custo_estoque': round(total_custo_estoque, 2),
            'total_venda_estoque': round(total_venda_estoque, 2),
            'total_lucro_estoque': round(total_lucro_estoque, 2),
            'margem_global_pct': round(margem_global, 1)
        },
        'categorias': sorted(list(categorias_set)),
        'produtos_agrupados': produtos_agrupados,
        'itens_detalhados': itens_detalhados
    }

    os.makedirs(PROC_DIR, exist_ok=True)
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    with open(SAIDA_PRODUTOS_JSON, 'w', encoding='utf-8') as f:
        json.dump(dados_finais, f, ensure_ascii=False, indent=2)

    with open(SAIDA_PRODUTOS_JS, 'w', encoding='utf-8') as f:
        f.write('// Gerado automaticamente a partir do SQLite stokpic.db\n')
        f.write('window.DADOS_PRODUTOS = ')
        json.dump(dados_finais, f, ensure_ascii=False)
        f.write(';\n')

    print(f"📊 Exportação do Catálogo concluída: {total_itens} itens e {len(produtos_agrupados)} modelos.")


def exportar_shopee_web(conn):
    """Gera dados_shopee_real.js e analise_shopee_real.json a partir do SQLite."""
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        s.shopee_item_id, s.shopee_var_id, s.nome_anuncio, s.nome_variacao,
        s.sku_anuncio, s.sku_variacao, s.sku_produto_loja, s.match_tipo,
        s.preco_cadastro_ancora, s.preco_real_promo, s.desconto_real_pct,
        s.estoque_shopee, s.imagem_url, s.taxa_estimada, s.repasse_estimado,
        s.lucro_estimado, s.margem_estimada, s.tier_shopee,
        s.desc_max_seguro_20, s.desc_max_seguro_10,
        v.nome as loja_nome, v.variacao as loja_variacao, v.custo as loja_custo,
        v.preco_venda as loja_preco, v.estoque as loja_estoque
    FROM anuncios_shopee s
    LEFT JOIN produtos_variacao v ON s.sku_produto_loja = v.sku
    ORDER BY s.preco_real_promo DESC
    """)

    rows_shopee = cursor.fetchall()
    if not rows_shopee:
        print("Aviso: Nenhum anúncio Shopee encontrado no banco.")
        return

    itens_shopee = []
    sum_cad = 0.0
    sum_promo = 0.0
    sum_disc = 0.0
    sum_cost = 0.0
    sum_profit = 0.0
    sum_margin = 0.0

    qtd_saudavel = 0
    qtd_margem_baixa = 0
    qtd_prejuizo = 0
    valid_count = 0

    for r in rows_shopee:
        cad_p = float(r['preco_cadastro_ancora'] or 0.0)
        promo_p = float(r['preco_real_promo'] or cad_p)
        disc_p = float(r['desconto_real_pct'] or 0.0)
        custo = float(r['loja_custo'] or 0.0)
        taxa = float(r['taxa_estimada'] or 0.0)
        repasse = float(r['repasse_estimado'] or (promo_p - taxa))
        lucro = float(r['lucro_estimado'] or 0.0)
        margem = float(r['margem_estimada'] or 0.0)

        sum_cad += cad_p
        sum_promo += promo_p
        sum_disc += disc_p
        sum_cost += custo
        sum_profit += lucro
        sum_margin += margem
        valid_count += 1

        if margem >= 20.0:
            qtd_saudavel += 1
        elif lucro < 0.0:
            qtd_prejuizo += 1
        else:
            qtd_margem_baixa += 1

        itens_shopee.append({
            'prod_id': r['shopee_item_id'] or '',
            'prod_name': r['nome_anuncio'],
            'var_id': r['shopee_var_id'] or '',
            'var_name': r['nome_variacao'] or '',
            'parent_sku': r['sku_anuncio'] or '',
            'var_sku': r['sku_variacao'] or '',
            'shopee_cad_price': cad_p,
            'shopee_promo_price': promo_p,
            'shopee_price': promo_p,
            'shopee_real_discount_pct': disc_p,
            'shopee_stock': int(r['estoque_shopee'] or 0),
            'img': r['imagem_url'] or '',
            'match_type': r['match_tipo'] or 'Não Vinculado',
            'loja_sku': r['sku_produto_loja'] or '',
            'loja_nome': r['loja_nome'] or r['nome_anuncio'],
            'loja_variacao': r['loja_variacao'] or r['nome_variacao'] or '',
            'custo': custo,
            'preco_loja': float(r['loja_preco'] or 0.0),
            'estoque_loja': float(r['loja_estoque'] or 0.0),
            'embalagem': 1.50,
            'tier': r['tier_shopee'] or '',
            'taxa_shopee': taxa,
            'repasse_shopee': repasse,
            'lucro_real': lucro,
            'margem_real': margem,
            'desc_max_seguro_20': int(r['desc_max_seguro_20'] or 0),
            'desc_max_seguro_10': int(r['desc_max_seguro_10'] or 0)
        })

    # Obter nome do arquivo da Shopee
    cursor.execute("""
    SELECT nome_arquivo 
    FROM historico_importacoes 
    WHERE tipo_origem = 'SHOPEE_ANUNCIOS' 
    ORDER BY id DESC LIMIT 1
    """)
    last_shopee_log = cursor.fetchone()
    arquivo_origem = last_shopee_log['nome_arquivo'] if last_shopee_log else 'Shopee_Anuncios.xlsx'

    dados_shopee = {
        'total_shopee': len(itens_shopee),
        'arquivo_origem': arquivo_origem,
        'preco_medio_cad': round(sum_cad / valid_count, 2) if valid_count else 0.0,
        'preco_medio_promo': round(sum_promo / valid_count, 2) if valid_count else 0.0,
        'desconto_medio_praticado': round(sum_disc / valid_count, 1) if valid_count else 0.0,
        'custo_medio': round(sum_cost / valid_count, 2) if valid_count else 0.0,
        'lucro_medio_real': round(sum_profit / valid_count, 2) if valid_count else 0.0,
        'margem_media_real': round(sum_margin / valid_count, 1) if valid_count else 0.0,
        'qtd_saudavel': qtd_saudavel,
        'qtd_margem_baixa': qtd_margem_baixa,
        'qtd_prejuizo': qtd_prejuizo,
        'itens': itens_shopee
    }

    with open(SAIDA_SHOPEE_JSON, 'w', encoding='utf-8') as f:
        json.dump(dados_shopee, f, ensure_ascii=False, indent=2)

    with open(SAIDA_SHOPEE_JS, 'w', encoding='utf-8') as f:
        f.write('// Gerado automaticamente a partir do SQLite stokpic.db\n')
        f.write('window.DADOS_SHOPEE_REAL = ')
        json.dump(dados_shopee, f, ensure_ascii=False)
        f.write(';\n')

    print(f"🛍️ Exportação da Shopee concluída: {len(itens_shopee)} anúncios auditados.")


def exportar_tudo(db_path=None):
    """Executa a exportação completa de catálogo e Shopee a partir do SQLite."""
    conn = get_connection(db_path)
    exportar_catalogo_web(conn)
    exportar_shopee_web(conn)
    conn.close()


if __name__ == '__main__':
    exportar_tudo()
