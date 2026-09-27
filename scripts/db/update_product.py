# -*- coding: utf-8 -*-
"""
Ferramenta CLI para atualização direta de preços de venda, estoque e custos no SQLite.
Recalcula automaticamente totais do produto pai e regenera os arquivos do frontend web.
"""

import os
import sys
import argparse
from datetime import datetime

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Garantir importação correta
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from scripts.db.database import get_connection
from scripts.db.export_web import exportar_catalogo_web, exportar_shopee_web


def atualizar_produto(sku, preco_venda=None, estoque=None, custo=None, preco_promo=None, preco_cheio=None, conn=None):
    """
    Atualiza uma variação de produto pelo SKU no SQLite,
    recalcula as métricas do produto pai correspondente
    e exporta os datasets web atualizados.
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True

    cursor = conn.cursor()

    # 1. Localizar produto por SKU
    cursor.execute("""
    SELECT v.id, v.produto_pai_id, v.sku, v.sku_pai, v.nome, v.variacao,
           v.preco_venda, v.estoque, v.custo, v.preco_promo, v.preco_cheio
    FROM produtos_variacao v
    WHERE UPPER(v.sku) = UPPER(?)
    """, (sku.strip(),))

    row = cursor.fetchone()
    if not row:
        print(f"❌ SKU '{sku}' não encontrado na tabela de variações!")
        if should_close:
            conn.close()
        return False

    prod_id = row['id']
    pai_id = row['produto_pai_id']
    sku_real = row['sku']
    nome = row['nome']
    variacao = row['variacao']

    # Valores anteriores
    old_preco = float(row['preco_venda'] or 0)
    old_estoque = int(row['estoque'] or 0)
    old_custo = float(row['custo'] or 0)
    old_promo = float(row['preco_promo'] or 0)
    old_cheio = float(row['preco_cheio'] or 0)

    # Novos valores
    new_preco = float(preco_venda) if preco_venda is not None else old_preco
    new_estoque = int(estoque) if estoque is not None else old_estoque
    new_custo = float(custo) if custo is not None else old_custo
    new_promo = float(preco_promo) if preco_promo is not None else old_promo
    new_cheio = float(preco_cheio) if preco_cheio is not None else (new_preco if old_cheio == 0 else old_cheio)

    # 2. Executar UPDATE na variação
    cursor.execute("""
    UPDATE produtos_variacao
    SET preco_venda = ?,
        estoque = ?,
        custo = ?,
        preco_promo = ?,
        preco_cheio = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    """, (new_preco, new_estoque, new_custo, new_promo, new_cheio, prod_id))

    # 3. Recalcular e atualizar o produto pai
    if pai_id:
        cursor.execute("""
        SELECT 
            SUM(estoque) as total_est,
            MIN(custo) as min_c,
            MAX(custo) as max_c,
            MIN(preco_venda) as min_p,
            MAX(preco_venda) as max_p
        FROM produtos_variacao
        WHERE produto_pai_id = ?
        """, (pai_id,))
        
        agg = cursor.fetchone()
        if agg:
            total_est = int(agg['total_est'] or 0)
            min_c = float(agg['min_c'] or 0)
            max_c = float(agg['max_c'] or 0)
            min_p = float(agg['min_p'] or 0)
            max_p = float(agg['max_p'] or 0)

            cursor.execute("""
            UPDATE produtos_pai
            SET estoque_total = ?,
                custo_min = ?,
                custo_max = ?,
                preco_venda_min = ?,
                preco_venda_max = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """, (total_est, min_c, max_c, min_p, max_p, pai_id))

    # 4. Registrar no histórico de importações / alterações
    cursor.execute("""
    INSERT INTO historico_importacoes (tipo_origem, nome_arquivo, total_registros, registros_sucesso, registros_erros, detalhes_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        'edicao_manual',
        'cli_update_product',
        1,
        1,
        0,
        f"SKU {sku_real}: Preço R${old_preco:.2f}->R${new_preco:.2f}, Estoque {old_estoque}->{new_estoque}, Custo R${old_custo:.2f}->R${new_custo:.2f}"
    ))

    conn.commit()

    print(f"✅ SKU [{sku_real}] atualizado com sucesso!")
    print(f"   Produto: {nome} [{variacao}]")
    print(f"   Preço de Venda: R$ {old_preco:.2f} ➔ R$ {new_preco:.2f}")
    print(f"   Estoque Atual: {old_estoque} un ➔ {new_estoque} un")
    print(f"   Preço de Custo: R$ {old_custo:.2f} ➔ R$ {new_custo:.2f}")
    if new_promo > 0:
        print(f"   Preço Promo: R$ {old_promo:.2f} ➔ R$ {new_promo:.2f}")

    # 5. Regenerar arquivos para o frontend web
    print("\n🔄 Sincronizando datasets do Frontend Web...")
    exportar_catalogo_web(conn)
    exportar_shopee_web(conn)
    print("✨ Frontend atualizado com sucesso!")

    if should_close:
        conn.close()

    return True


def modo_interativo():
    """Assistente interativo via terminal para buscar produto e atualizar."""
    conn = get_connection()
    cursor = conn.cursor()

    print("=" * 60)
    print("🛠️  Luluks - Atualizador de Preços e Estoque (SQLite)")
    print("=" * 60)

    termo = input("\nDigite o SKU ou parte do nome do produto: ").strip()
    if not termo:
        print("Operação cancelada.")
        conn.close()
        return

    cursor.execute("""
    SELECT v.sku, v.nome, v.variacao, v.preco_venda, v.estoque, v.custo
    FROM produtos_variacao v
    WHERE UPPER(v.sku) LIKE UPPER(?) OR UPPER(v.nome) LIKE UPPER(?)
    LIMIT 10
    """, (f"%{termo}%", f"%{termo}%"))

    matches = cursor.fetchall()
    if not matches:
        print(f"❌ Nenhum produto encontrado com '{termo}'.")
        conn.close()
        return

    print("\nProdutos encontrados:")
    for idx, m in enumerate(matches, 1):
        print(f"  [{idx}] SKU: {m['sku']} | {m['nome']} ({m['variacao']}) | Preço: R${m['preco_venda']:.2f} | Est: {m['estoque']} un | Custo: R${m['custo']:.2f}")

    if len(matches) == 1:
        sel = matches[0]
    else:
        escolha = input(f"\nEscolha o número do produto (1 a {len(matches)}): ").strip()
        try:
            sel_idx = int(escolha) - 1
            if sel_idx < 0 or sel_idx >= len(matches):
                print("Opção inválida.")
                conn.close()
                return
            sel = matches[sel_idx]
        except ValueError:
            print("Entrada inválida.")
            conn.close()
            return

    sku_sel = sel['sku']
    print(f"\n✏️ Editando SKU: {sku_sel} - {sel['nome']} ({sel['variacao']})")

    inp_preco = input(f"Novo Preço de Venda (Atual: R$ {sel['preco_venda']:.2f}) [Enter p/ manter]: ").strip()
    inp_estoque = input(f"Novo Estoque (Atual: {sel['estoque']} un) [Enter p/ manter]: ").strip()
    inp_custo = input(f"Novo Custo (Atual: R$ {sel['custo']:.2f}) [Enter p/ manter]: ").strip()

    preco_venda = float(inp_preco.replace(',', '.')) if inp_preco else None
    estoque = int(inp_estoque) if inp_estoque else None
    custo = float(inp_custo.replace(',', '.')) if inp_custo else None

    atualizar_produto(sku_sel, preco_venda=preco_venda, estoque=estoque, custo=custo, conn=conn)
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Atualizador de Preços e Estoque no SQLite (Luluks StokPic)")
    parser.add_argument("--sku", type=str, help="SKU do produto a atualizar")
    parser.add_argument("--preco", "--preco-venda", dest="preco", type=float, help="Novo preço de venda")
    parser.add_argument("--estoque", type=int, help="Novo estoque")
    parser.add_argument("--custo", type=float, help="Novo preço de custo")
    parser.add_argument("--promo", "--preco-promo", dest="promo", type=float, help="Novo preço promocional")
    parser.add_argument("--interactive", "-i", action="store_true", help="Modo interativo no terminal")

    args = parser.parse_args()

    if args.interactive or (not args.sku and len(sys.argv) == 1):
        modo_interativo()
    elif args.sku:
        atualizar_produto(
            sku=args.sku,
            preco_venda=args.preco,
            estoque=args.estoque,
            custo=args.custo,
            preco_promo=args.promo
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
