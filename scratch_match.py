import sys, openpyxl, json, re, difflib, unicodedata
sys.stdout.reconfigure(encoding='utf-8')

def normalize(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFKD', str(text)).encode('ASCII', 'ignore').decode('ASCII')
    return text.lower().strip()

with open('dados_produtos.js', 'r', encoding='utf-8') as f:
    js_content = f.read()
json_str = re.search(r'window\.DADOS_PRODUTOS\s*=\s*(\{.*\});', js_content, re.DOTALL).group(1)
dados_loja = json.loads(json_str)
itens_loja = dados_loja.get('itens_detalhados', [])

skus_loja = {it['sku'].upper().strip(): it for it in itens_loja}
loja_by_id = {str(it['id']): it for it in itens_loja}

# Also load old dados_shopee_real.js
with open('dados_shopee_real.js', 'r', encoding='utf-8') as f:
    old_shopee_content = f.read()
old_shopee_str = re.search(r'window\.DADOS_SHOPEE_REAL\s*=\s*(\{.*\});', old_shopee_content, re.DOTALL).group(1)
old_shopee = json.loads(old_shopee_str)

old_by_prod_var = {}
old_by_var_id = {}
old_by_prod_name = {}

for it in old_shopee['itens']:
    p_id = str(it.get('prod_id','')).strip()
    v_id = str(it.get('var_id','')).strip()
    if p_id and v_id:
        old_by_prod_var[f"{p_id}_{v_id}"] = it
    if v_id:
        old_by_var_id[v_id] = it
    if it.get('prod_name'):
        old_by_prod_name[normalize(it['prod_name'])] = it

wb = openpyxl.load_workbook('Shopee_Anúncios_Exportação_0927005106-20260927005106098001.xlsx', data_only=True)
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))
header = rows[0]
data_rows = [r for r in rows[1:] if any(r)]

print(f"Total rows in new file: {len(data_rows)}")

matched_count = 0
items_result = []

for i, r in enumerate(data_rows):
    prod_id = str(int(r[1])) if (r[1] is not None and str(r[1]).replace('.','').isdigit()) else ''
    prod_name = str(r[2] or '').strip()
    parent_sku = str(r[3] or '').strip()
    var_name1 = str(r[7] or '').strip() if r[7] is not None else ''
    var_name2 = str(r[10] or '').strip() if r[10] is not None else ''
    var_name = f"{var_name1} {var_name2}".strip() if (var_name1 and var_name2) else (var_name1 or var_name2)
    var_sku = str(r[11] or '').strip()
    var_id = str(int(r[12])) if (r[12] is not None and str(r[12]).replace('.','').isdigit()) else ''
    
    preco_cad = float(r[13]) if r[13] is not None else 0.0
    preco_promo = float(r[14]) if r[14] is not None else preco_cad
    qtd = float(r[15]) if r[15] is not None else 0.0
    img_var = str(r[8] or '').strip()
    img_capa = str(r[19] or '').strip()
    img = img_var or img_capa

    matched_loja = None
    match_type = ''

    # 1. Direct SKU
    if var_sku and var_sku.upper() in skus_loja:
        matched_loja = skus_loja[var_sku.upper()]
        match_type = 'SKU Direto'
    elif parent_sku and parent_sku.upper() in skus_loja:
        matched_loja = skus_loja[parent_sku.upper()]
        match_type = 'SKU Pai'
    elif var_sku:
        base = var_sku.split('-')[0].upper()
        if base in skus_loja:
            matched_loja = skus_loja[base]
            match_type = 'Prefixo SKU'

    # 2. Match via old shopee by var_id or prod_var
    if not matched_loja and var_id and var_id in old_by_var_id:
        old_it = old_by_var_id[var_id]
        l_sku = old_it.get('loja_sku', '').upper()
        if l_sku in skus_loja:
            matched_loja = skus_loja[l_sku]
            match_type = 'ID Variante (Mapeado)'

    if not matched_loja and prod_id and var_id:
        key = f"{prod_id}_{var_id}"
        if key in old_by_prod_var:
            old_it = old_by_prod_var[key]
            l_sku = old_it.get('loja_sku', '').upper()
            if l_sku in skus_loja:
                matched_loja = skus_loja[l_sku]
                match_type = 'Anúncio/Variante (Mapeado)'

    # 3. Match via normalized title in old_shopee
    if not matched_loja:
        norm_title = normalize(prod_name)
        if norm_title in old_by_prod_name:
            old_it = old_by_prod_name[norm_title]
            l_sku = old_it.get('loja_sku', '').upper()
            if l_sku in skus_loja:
                matched_loja = skus_loja[l_sku]
                match_type = 'Título Shopee (Mapeado)'

    # 4. Smart keywords match with loja items
    if not matched_loja:
        norm_p = normalize(prod_name)
        norm_v = normalize(var_name)
        
        # Token overlap
        words_p = set(re.findall(r'\b\w{3,}\b', norm_p))
        best_score = 0
        best_it = None
        for it in itens_loja:
            words_loja = set(re.findall(r'\b\w{3,}\b', normalize(it['nome'])))
            overlap = len(words_p.intersection(words_loja))
            ratio = difflib.SequenceMatcher(None, norm_p, normalize(it['nome'])).ratio()
            total_score = (overlap * 2) + ratio
            if total_score > best_score:
                best_score = total_score
                best_it = it
        if best_score >= 4.0:
            matched_loja = best_it
            match_type = f'Similaridade Avançada ({int(best_score*10)}%)'

    if matched_loja:
        matched_count += 1
        custo = matched_loja.get('custo', 0.0)
        preco_loja = matched_loja.get('preco_venda', 0.0)
        estoque_loja = matched_loja.get('estoque', 0)
        loja_sku = matched_loja.get('sku', '')
        loja_nome = matched_loja.get('nome', '')
        loja_var = matched_loja.get('variacao', '')
        if not img and matched_loja.get('img'):
            img = matched_loja['img']
    else:
        # Fallback to store averages
        custo = 30.0
        preco_loja = preco_promo
        estoque_loja = int(qtd)
        loja_sku = var_sku or parent_sku or f"SHOPEE-{prod_id}"
        loja_nome = prod_name
        loja_var = var_name
        match_type = 'Estimativa'

    # Fee on Real Promo Price
    p_eff = preco_promo
    if p_eff < 9.00:
        fee = (p_eff * 0.20) + (p_eff * 0.50)
        tier = 'Sub R$ 9: 20% + 50%'
    elif p_eff <= 79.99:
        fee = (p_eff * 0.20) + 4.50
        tier = 'Até R$ 79,99: 20% + R$ 4,50'
    elif p_eff <= 99.99:
        fee = (p_eff * 0.14) + 16.00
        tier = 'R$ 80 a 99,99: 14% + R$ 16,00'
    elif p_eff <= 199.99:
        fee = (p_eff * 0.14) + 20.00
        tier = 'R$ 100 a 199,99: 14% + R$ 20,00'
    else:
        fee = (p_eff * 0.14) + 26.00
        tier = 'Acima de R$ 200: 14% + R$ 26,00'

    embalagem = 1.50
    repasse = p_eff - fee
    lucro = repasse - custo - embalagem
    margem = (lucro / p_eff * 100.0) if p_eff > 0 else 0.0
    desconto_real_pct = ((preco_cad - preco_promo) / preco_cad * 100.0) if preco_cad > 0 else 0.0

    # Fee on Anchor Cad Price
    if preco_cad < 9.00:
        fee_cad = (preco_cad * 0.20) + (preco_cad * 0.50)
    elif preco_cad <= 79.99:
        fee_cad = (preco_cad * 0.20) + 4.50
    elif preco_cad <= 99.99:
        fee_cad = (preco_cad * 0.14) + 16.00
    elif preco_cad <= 199.99:
        fee_cad = (preco_cad * 0.14) + 20.00
    else:
        fee_cad = (preco_cad * 0.14) + 26.00

    lucro_cad = preco_cad - fee_cad - custo - embalagem
    margem_cad = (lucro_cad / preco_cad * 100.0) if preco_cad > 0 else 0.0

    # Max safe discounts from Anchor
    desc_max_20 = 0
    desc_max_10 = 0
    for d in range(0, 91):
        p_test = preco_cad * (1.0 - d / 100.0)
        if p_test < 9.00:
            f_test = (p_test * 0.20) + (p_test * 0.50)
        elif p_test <= 79.99:
            f_test = (p_test * 0.20) + 4.50
        elif p_test <= 99.99:
            f_test = (p_test * 0.14) + 16.00
        elif p_test <= 199.99:
            f_test = (p_test * 0.14) + 20.00
        else:
            f_test = (p_test * 0.14) + 26.00
        prof_test = p_test - f_test - custo - embalagem
        m_test = (prof_test / p_test * 100.0) if p_test > 0 else 0
        if m_test >= 20.0 and prof_test > 0:
            desc_max_20 = d
        if m_test >= 10.0 and prof_test > 0:
            desc_max_10 = d

    items_result.append({
        'prod_id': prod_id,
        'prod_name': prod_name,
        'var_id': var_id,
        'var_name': var_name,
        'parent_sku': parent_sku,
        'var_sku': var_sku,
        'shopee_cad_price': round(preco_cad, 2),
        'shopee_promo_price': round(preco_promo, 2),
        'shopee_price': round(preco_cad, 2), # for compatibility with old filters
        'shopee_real_discount_pct': round(desconto_real_pct, 1),
        'shopee_stock': int(qtd),
        'img': img,
        'match_type': match_type,
        'loja_sku': loja_sku,
        'loja_nome': loja_nome,
        'loja_variacao': loja_var,
        'custo': round(custo, 2),
        'preco_loja': round(preco_loja, 2),
        'estoque_loja': estoque_loja,
        'embalagem': embalagem,
        'tier': tier,
        'taxa_shopee': round(fee, 2),
        'repasse_shopee': round(repasse, 2),
        'lucro_real': round(lucro, 2),
        'margem_real': round(margem, 1),
        'lucro_cad': round(lucro_cad, 2),
        'margem_cad': round(margem_cad, 1),
        'desc_max_seguro_20': desc_max_20,
        'desc_max_seguro_10': desc_max_10
    })

total_items = len(items_result)
avg_cad_price = sum(it['shopee_cad_price'] for it in items_result) / total_items
avg_promo_price = sum(it['shopee_promo_price'] for it in items_result) / total_items
avg_disc_pct = sum(it['shopee_real_discount_pct'] for it in items_result) / total_items
avg_custo = sum(it['custo'] for it in items_result) / total_items
avg_lucro_real = sum(it['lucro_real'] for it in items_result) / total_items
avg_margem_real = sum(it['margem_real'] for it in items_result) / total_items

qtd_lucro_saudavel = sum(1 for it in items_result if it['margem_real'] >= 20.0)
qtd_margem_baixa = sum(1 for it in items_result if 0.0 <= it['margem_real'] < 20.0)
qtd_prejuizo = sum(1 for it in items_result if it['lucro_real'] < 0.0)

output_data = {
    'total_shopee': total_items,
    'arquivo_origem': 'Shopee_Anúncios_Exportação_0927005106-20260927005106098001.xlsx',
    'preco_medio_cad': round(avg_cad_price, 2),
    'preco_medio_promo': round(avg_promo_price, 2),
    'desconto_medio_praticado': round(avg_disc_pct, 1),
    'custo_medio': round(avg_custo, 2),
    'lucro_medio_real': round(avg_lucro_real, 2),
    'margem_media_real': round(avg_margem_real, 1),
    'qtd_saudavel': qtd_lucro_saudavel,
    'qtd_margem_baixa': qtd_margem_baixa,
    'qtd_prejuizo': qtd_prejuizo,
    'itens': items_result
}

with open('dados_shopee_real.js', 'w', encoding='utf-8') as f:
    f.write('window.DADOS_SHOPEE_REAL = ' + json.dumps(output_data, ensure_ascii=False) + ';\n')

print(f"Matched {matched_count}/{total_items} items.")
print(f"Preço Âncora Médio: R$ {avg_cad_price:.2f}")
print(f"Preço com Desconto Real: R$ {avg_promo_price:.2f}")
print(f"Desconto Real Médio: {avg_disc_pct:.1f}% OFF")
print(f"Lucro Real Médio: R$ {avg_lucro_real:.2f}")
print(f"Margem Real Média: {avg_margem_real:.1f}%")
