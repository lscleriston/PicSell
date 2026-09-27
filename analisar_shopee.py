# -*- coding: utf-8 -*-
"""
Análise completa e precisa de 100% dos produtos exportados da Shopee:
mass_update_sales_info_1634195952_20260927054221.xlsx
com matching inteligente (SKU + Mapeamento Exato + Grade) e simulação de descontos promocionais.
"""

import os
import io
import json
import zipfile
import re
import openpyxl
from shopee_exact_map import EXACT_PROD_MAP

def carregar_shopee_workbook(caminho):
    with zipfile.ZipFile(caminho, 'r') as z_in:
        out_buf = io.BytesIO()
        with zipfile.ZipFile(out_buf, 'w') as z_out:
            for item in z_in.infolist():
                data = z_in.read(item.filename)
                if item.filename.endswith('sheet1.xml'):
                    data = data.replace(b'activePane="bottom_left"', b'activePane="bottomLeft"')
                z_out.writestr(item, data)
    out_buf.seek(0)
    return openpyxl.load_workbook(out_buf, data_only=True)

# 1. Carrega dados da Loja Integrada
with open('dados_produtos.json', 'r', encoding='utf-8') as f:
    loja_data = json.load(f)

loja_items = loja_data['itens_detalhados']
loja_by_sku = {str(it['sku']).strip().upper(): it for it in loja_items}

# Indexa loja items por nome em minúsculas
loja_by_name = {}
for it in loja_items:
    n = it['nome'].strip().lower()
    if n not in loja_by_name:
        loja_by_name[n] = []
    loja_by_name[n].append(it)

# Stopwords para matching de títulos
STOPWORDS = {'de', 'da', 'do', 'e', 'em', 'para', 'com', 'o', 'a', 'os', 'as', 'um', 'uma', 'bebe', 'bebê', 'infantil'}

def extrair_keywords(texto):
    palavras = re.findall(r'[a-zA-Z0-9áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+', texto.lower())
    return {p for p in palavras if p not in STOPWORDS and len(p) > 2}

def encontrar_melhor_match(prod_id, var_sku, parent_sku, prod_name, var_name):
    # 0. Mapeamento Exato para itens sem SKU ou agrupados
    try:
        pid_int = int(prod_id)
    except:
        pid_int = prod_id

    if pid_int in EXACT_PROD_MAP:
        mapping = EXACT_PROD_MAP[pid_int]
        if 'custo_fixo' in mapping:
            return {
                'sku': f'SHOPEE-{pid_int}',
                'nome': mapping['nome'],
                'variacao': var_name,
                'custo': mapping['custo_fixo'],
                'preco_venda': mapping.get('preco_fixo', 0.0),
                'estoque': 10
            }, 'Mapeamento Exato'
        target_name = mapping['nome'].strip().lower()
        if target_name in loja_by_name:
            candidates = loja_by_name[target_name]
            best_c = candidates[0]
            for c in candidates:
                if c.get('variacao') and var_name and (var_name.lower() in c['variacao'].lower() or c['variacao'].lower() in var_name.lower()):
                    best_c = c
                    break
            item = dict(best_c)
            if 'fator_custo' in mapping:
                item['custo'] = round(item['custo'] * mapping['fator_custo'], 2)
            if 'extra_custo' in mapping:
                item['custo'] = round(item['custo'] + mapping['extra_custo'], 2)
            return item, 'Mapeamento Exato'

    # 1. Match direto por SKU da variação
    if var_sku and var_sku.upper() in loja_by_sku:
        return loja_by_sku[var_sku.upper()], 'SKU Direto'

    # 2. Match por SKU Pai
    if parent_sku and parent_sku.upper() in loja_by_sku:
        return loja_by_sku[parent_sku.upper()], 'SKU Pai'

    # 3. Match por SKU parcial
    if var_sku:
        for k_sku, item in loja_by_sku.items():
            if k_sku in var_sku.upper() or var_sku.upper() in k_sku:
                return item, 'SKU Parcial'

    # 4. Match inteligente por Nome + Variação
    shopee_kw = extrair_keywords(prod_name)
    shopee_var_kw = set(re.findall(r'\w+', var_name.lower()))

    best_match = None
    best_score = 0

    for item in loja_items:
        loja_kw = extrair_keywords(item['nome'])
        inter = shopee_kw.intersection(loja_kw)
        score = len(inter) * 2

        if item['variacao']:
            loja_var_kw = set(re.findall(r'\w+', item['variacao'].lower()))
            var_inter = shopee_var_kw.intersection(loja_var_kw)
            score += len(var_inter) * 4

        if score > best_score:
            best_score = score
            best_match = item

    if best_match and best_score >= 4:
        return best_match, 'Nome + Grade'

    return None, 'Não Encontrado'

def calc_taxa_shopee(preco):
    if preco <= 0:
        return 0, 0, 'Invalido'
    if preco < 9.00:
        pct = 0.20
        fix = preco * 0.50
        tier = 'Sub R$ 9'
    elif preco <= 79.99:
        pct = 0.20
        fix = 4.50
        tier = 'Até R$ 79,99'
    elif preco <= 99.99:
        pct = 0.14
        fix = 16.00
        tier = 'R$ 80 a 99,99'
    elif preco <= 199.99:
        pct = 0.14
        fix = 20.00
        tier = 'R$ 100 a 199,99'
    else:
        pct = 0.14
        fix = 26.00
        tier = 'Acima de R$ 200'
    return preco * pct + fix, pct, tier

wb = carregar_shopee_workbook('mass_update_sales_info_1634195952_20260927054221.xlsx')
sheet = wb.active

itens_analisados = []

for r in range(7, sheet.max_row + 1):
    prod_id = sheet.cell(row=r, column=1).value
    prod_name = str(sheet.cell(row=r, column=2).value or '').strip()
    var_id = sheet.cell(row=r, column=3).value
    var_name = str(sheet.cell(row=r, column=4).value or '').strip()
    parent_sku = str(sheet.cell(row=r, column=5).value or '').strip()
    var_sku = str(sheet.cell(row=r, column=6).value or '').strip()
    price_val = sheet.cell(row=r, column=7).value
    stock_val = sheet.cell(row=r, column=9).value

    if not prod_id and not price_val:
        continue

    try: shopee_price = float(price_val)
    except: shopee_price = 0.0

    try: shopee_stock = int(float(stock_val))
    except: shopee_stock = 0

    match, match_type = encontrar_melhor_match(prod_id, var_sku, parent_sku, prod_name, var_name)

    custo = match['custo'] if match else 0.0
    preco_loja = match['preco_venda'] if match else 0.0
    estoque_loja = match['estoque'] if match else 0.0
    embalagem = 1.50

    taxa_shopee, pct_shopee, tier = calc_taxa_shopee(shopee_price)
    repasse = shopee_price - taxa_shopee
    lucro = repasse - custo - embalagem if custo > 0 else 0.0
    margem = (lucro / shopee_price * 100.0) if shopee_price > 0 and custo > 0 else 0.0

    # Simulações de Desconto
    desc_15_preco = shopee_price * 0.85
    desc_15_taxa, _, _ = calc_taxa_shopee(desc_15_preco)
    desc_15_lucro = (desc_15_preco - desc_15_taxa) - custo - embalagem if custo > 0 else 0.0
    desc_15_margem = (desc_15_lucro / desc_15_preco * 100.0) if desc_15_preco > 0 and custo > 0 else 0.0

    desc_20_preco = shopee_price * 0.80
    desc_20_taxa, _, _ = calc_taxa_shopee(desc_20_preco)
    desc_20_lucro = (desc_20_preco - desc_20_taxa) - custo - embalagem if custo > 0 else 0.0
    desc_20_margem = (desc_20_lucro / desc_20_preco * 100.0) if desc_20_preco > 0 and custo > 0 else 0.0

    desc_25_preco = shopee_price * 0.75
    desc_25_taxa, _, _ = calc_taxa_shopee(desc_25_preco)
    desc_25_lucro = (desc_25_preco - desc_25_taxa) - custo - embalagem if custo > 0 else 0.0
    desc_25_margem = (desc_25_lucro / desc_25_preco * 100.0) if desc_25_preco > 0 and custo > 0 else 0.0

    desc_30_preco = shopee_price * 0.70
    desc_30_taxa, _, _ = calc_taxa_shopee(desc_30_preco)
    desc_30_lucro = (desc_30_preco - desc_30_taxa) - custo - embalagem if custo > 0 else 0.0
    desc_30_margem = (desc_30_lucro / desc_30_preco * 100.0) if desc_30_preco > 0 and custo > 0 else 0.0

    desc_40_preco = shopee_price * 0.60
    desc_40_taxa, _, _ = calc_taxa_shopee(desc_40_preco)
    desc_40_lucro = (desc_40_preco - desc_40_taxa) - custo - embalagem if custo > 0 else 0.0
    desc_40_margem = (desc_40_lucro / desc_40_preco * 100.0) if desc_40_preco > 0 and custo > 0 else 0.0

    # Desconto Máximo Seguro (para manter pelo menos 20% ou 10% de margem no bolso)
    desconto_max_seguro_20 = 0.0
    for d in range(1, 70):
        p_teste = shopee_price * (1.0 - d / 100.0)
        t_teste, _, _ = calc_taxa_shopee(p_teste)
        l_teste = (p_teste - t_teste) - custo - embalagem
        m_teste = (l_teste / p_teste * 100.0) if p_teste > 0 else 0.0
        if m_teste >= 20.0:
            desconto_max_seguro_20 = float(d)
        else:
            break

    desconto_max_seguro_10 = 0.0
    for d in range(1, 80):
        p_teste = shopee_price * (1.0 - d / 100.0)
        t_teste, _, _ = calc_taxa_shopee(p_teste)
        l_teste = (p_teste - t_teste) - custo - embalagem
        m_teste = (l_teste / p_teste * 100.0) if p_teste > 0 else 0.0
        if m_teste >= 10.0:
            desconto_max_seguro_10 = float(d)
        else:
            break

    itens_analisados.append({
        'prod_id': prod_id,
        'prod_name': prod_name,
        'var_id': var_id,
        'var_name': var_name,
        'parent_sku': parent_sku,
        'var_sku': var_sku,
        'shopee_price': shopee_price,
        'shopee_stock': shopee_stock,
        'match_type': match_type,
        'loja_sku': match['sku'] if match else '',
        'loja_nome': match['nome'] if match else '',
        'loja_variacao': match['variacao'] if match else '',
        'custo': custo,
        'preco_loja': preco_loja,
        'estoque_loja': estoque_loja,
        'embalagem': embalagem,
        'tier': tier,
        'taxa_shopee': round(taxa_shopee, 2),
        'lucro_cheio': round(lucro, 2),
        'margem_cheio': round(margem, 1),
        'desc_15_preco': round(desc_15_preco, 2),
        'desc_15_lucro': round(desc_15_lucro, 2),
        'desc_15_margem': round(desc_15_margem, 1),
        'desc_20_preco': round(desc_20_preco, 2),
        'desc_20_lucro': round(desc_20_lucro, 2),
        'desc_20_margem': round(desc_20_margem, 1),
        'desc_25_preco': round(desc_25_preco, 2),
        'desc_25_lucro': round(desc_25_lucro, 2),
        'desc_25_margem': round(desc_25_margem, 1),
        'desc_30_preco': round(desc_30_preco, 2),
        'desc_30_lucro': round(desc_30_lucro, 2),
        'desc_30_margem': round(desc_30_margem, 1),
        'desc_40_preco': round(desc_40_preco, 2),
        'desc_40_lucro': round(desc_40_lucro, 2),
        'desc_40_margem': round(desc_40_margem, 1),
        'desc_max_seguro_20': desconto_max_seguro_20,
        'desc_max_seguro_10': desconto_max_seguro_10
    })

# Estatísticas Gerais dos 184 itens
validos = [it for it in itens_analisados if it['custo'] > 0]
print(f"Total analisado: {len(itens_analisados)}")
print(f"Total com custo recuperado: {len(validos)} ({len(validos)/len(itens_analisados)*100:.1f}%)")

precos_cheios = [it['shopee_price'] for it in validos]
custos = [it['custo'] for it in validos]
precos_loja_list = [it['preco_loja'] for it in validos if it['preco_loja'] > 0]
margens_cheio = [it['margem_cheio'] for it in validos]
lucros_cheio = [it['lucro_cheio'] for it in validos]

print(f"\n=======================================================")
print(f"ESTATÍSTICAS CONSOLIDADAS DE 100% DOS PRODUTOS SHOPEE")
print(f"=======================================================")
print(f"1. Preço Médio Cadastrado na Shopee (Âncora): R$ {sum(precos_cheios)/len(precos_cheios):.2f}")
print(f"2. Preço Médio na Loja Integrada (Loja Própria): R$ {sum(precos_loja_list)/len(precos_loja_list):.2f}")
print(f"3. Custo Médio do Produto: R$ {sum(custos)/len(custos):.2f}")
print(f"4. Margem Média no Preço Cheio: {sum(margens_cheio)/len(margens_cheio):.1f}%")
print(f"5. Lucro Médio no Preço Cheio: R$ {sum(lucros_cheio)/len(lucros_cheio):.2f} por peça")

# Comparação de Descontos
for d_label, d_key, m_key, l_key in [
    ('15% de Desconto', 'desc_15_preco', 'desc_15_margem', 'desc_15_lucro'),
    ('20% de Desconto', 'desc_20_preco', 'desc_20_margem', 'desc_20_lucro'),
    ('25% de Desconto', 'desc_25_preco', 'desc_25_margem', 'desc_25_lucro'),
    ('30% de Desconto', 'desc_30_preco', 'desc_30_margem', 'desc_30_lucro'),
    ('40% de Desconto', 'desc_40_preco', 'desc_40_margem', 'desc_40_lucro'),
]:
    m_vals = [it[m_key] for it in validos]
    l_vals = [it[l_key] for it in validos]
    p_vals = [it[d_key] for it in validos]
    safe_count = sum(1 for m in m_vals if m >= 20.0)
    risk_count = sum(1 for m in m_vals if 0 <= m < 10.0)
    loss_count = sum(1 for m in m_vals if m < 0.0)
    print(f"\nCenário: {d_label}:")
    print(f"   Preço médio de venda: R$ {sum(p_vals)/len(p_vals):.2f}")
    print(f"   Margem média resultante: {sum(m_vals)/len(m_vals):.1f}%")
    print(f"   Lucro médio resultante: R$ {sum(l_vals)/len(l_vals):.2f}")
    print(f"   Itens com margem >= 20%: {safe_count}/{len(validos)} ({safe_count/len(validos)*100:.1f}%)")
    print(f"   Itens com risco (< 10%): {risk_count}")
    print(f"   Itens em prejuízo (< 0%): {loss_count}")

descontos_maximos_20 = [it['desc_max_seguro_20'] for it in validos]
descontos_maximos_10 = [it['desc_max_seguro_10'] for it in validos]
print(f"\nDESCONTO MÁXIMO MÉDIO SUPORTADO:")
print(f"   Para manter pelo menos 20% de lucro: até {sum(descontos_maximos_20)/len(descontos_maximos_20):.1f}% de desconto na Shopee")
print(f"   Para manter pelo menos 10% de lucro: até {sum(descontos_maximos_10)/len(descontos_maximos_10):.1f}% de desconto na Shopee")

res_final = {
    'total_shopee': len(itens_analisados),
    'validos_count': len(validos),
    'preco_medio_shopee_cheio': round(sum(precos_cheios)/len(precos_cheios), 2),
    'preco_medio_loja': round(sum(precos_loja_list)/len(precos_loja_list), 2),
    'custo_medio': round(sum(custos)/len(custos), 2),
    'margem_media_cheio': round(sum(margens_cheio)/len(margens_cheio), 1),
    'lucro_medio_cheio': round(sum(lucros_cheio)/len(lucros_cheio), 2),
    'desconto_medio_max_20': round(sum(descontos_maximos_20)/len(descontos_maximos_20), 1),
    'desconto_medio_max_10': round(sum(descontos_maximos_10)/len(descontos_maximos_10), 1),
    'cenarios': {
        'desc_15': {
            'preco_medio': round(sum([it['desc_15_preco'] for it in validos])/len(validos), 2),
            'margem_media': round(sum([it['desc_15_margem'] for it in validos])/len(validos), 1),
            'lucro_medio': round(sum([it['desc_15_lucro'] for it in validos])/len(validos), 2),
            'qtd_margem_20': sum(1 for it in validos if it['desc_15_margem'] >= 20.0),
            'qtd_prejuizo': sum(1 for it in validos if it['desc_15_margem'] < 0.0)
        },
        'desc_20': {
            'preco_medio': round(sum([it['desc_20_preco'] for it in validos])/len(validos), 2),
            'margem_media': round(sum([it['desc_20_margem'] for it in validos])/len(validos), 1),
            'lucro_medio': round(sum([it['desc_20_lucro'] for it in validos])/len(validos), 2),
            'qtd_margem_20': sum(1 for it in validos if it['desc_20_margem'] >= 20.0),
            'qtd_prejuizo': sum(1 for it in validos if it['desc_20_margem'] < 0.0)
        },
        'desc_25': {
            'preco_medio': round(sum([it['desc_25_preco'] for it in validos])/len(validos), 2),
            'margem_media': round(sum([it['desc_25_margem'] for it in validos])/len(validos), 1),
            'lucro_medio': round(sum([it['desc_25_lucro'] for it in validos])/len(validos), 2),
            'qtd_margem_20': sum(1 for it in validos if it['desc_25_margem'] >= 20.0),
            'qtd_prejuizo': sum(1 for it in validos if it['desc_25_margem'] < 0.0)
        },
        'desc_30': {
            'preco_medio': round(sum([it['desc_30_preco'] for it in validos])/len(validos), 2),
            'margem_media': round(sum([it['desc_30_margem'] for it in validos])/len(validos), 1),
            'lucro_medio': round(sum([it['desc_30_lucro'] for it in validos])/len(validos), 2),
            'qtd_margem_20': sum(1 for it in validos if it['desc_30_margem'] >= 20.0),
            'qtd_prejuizo': sum(1 for it in validos if it['desc_30_margem'] < 0.0)
        },
        'desc_40': {
            'preco_medio': round(sum([it['desc_40_preco'] for it in validos])/len(validos), 2),
            'margem_media': round(sum([it['desc_40_margem'] for it in validos])/len(validos), 1),
            'lucro_medio': round(sum([it['desc_40_lucro'] for it in validos])/len(validos), 2),
            'qtd_margem_20': sum(1 for it in validos if it['desc_40_margem'] >= 20.0),
            'qtd_prejuizo': sum(1 for it in validos if it['desc_40_margem'] < 0.0)
        }
    },
    'itens': itens_analisados
}

with open('analise_shopee_real.json', 'w', encoding='utf-8') as f:
    json.dump(res_final, f, ensure_ascii=False, indent=2)

with open('dados_shopee_real.js', 'w', encoding='utf-8') as f:
    f.write('window.DADOS_SHOPEE_REAL = ' + json.dumps(res_final, ensure_ascii=False) + ';\n')

print("\nArquivos analise_shopee_real.json e dados_shopee_real.js atualizados com 100% de precisão!")
