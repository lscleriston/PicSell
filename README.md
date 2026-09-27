# Luluks Baby & Kids — Gestão de Estoque, Custos & Precificador Shopee 2026

Aplicação web interativa, completa e leve para visualização de estoque e precificação estratégica para a **Shopee Brasil**, levando em consideração todas as regras e taxas oficiais de 2026.

---

## 🚀 Como Abrir e Usar

1. **Opção 1 (1 clique):** Dê um duplo clique no arquivo [**`Abrir_Aplicacao.bat`**](file:///C:/dev/finaceiro%20luluks/Abrir_Aplicacao.bat).
2. **Opção 2:** Dê um duplo clique diretamente em [**`index.html`**](file:///C:/dev/finaceiro%20luluks/index.html) no seu navegador (Chrome, Edge, Firefox, etc.).

A aplicação funciona **100% offline e sem necessidade de instalação**.

---

## 📂 Estrutura de Pastas

| Pasta | Conteúdo |
|---|---|
| `web/` | Frontend: `web/css`, `web/js` (app + bibliotecas) e `web/data` (bases carregadas pelo navegador) |
| `scripts/etl/` | ETL Python: `gerar_dados.py` (catálogo) e `processar_shopee.py` (auditoria Shopee) |
| `scripts/utils/` | Ferramentas de diagnóstico de matching e `shopee_exact_map.py` |
| `scripts/config/` | `map_helper.txt` (dicionário de equivalências manuais) |
| `data/raw/` | Planilhas brutas de importação: `catalogo/` e `shopee/` |
| `data/processed/` | JSONs processados (`dados_produtos.json`, `analise_shopee_real.json`) |
| `docs/` | Documentação técnica |

Para regenerar as bases após importar novas planilhas, dê um duplo clique em **`Atualizar_Dados.bat`**.

---

## 🏷️ O Novo Precificador Shopee 2026

Na nova aba superior **`Shopee Precificador 2026`**, você encontra um motor completo de precificação baseado no artigo oficial do Centro de Educação do Vendedor Shopee:
> 🔗 [Comissão para vendedores CNPJ e CPF em 2026 (Artigo 26839)](https://seller.br.shopee.cn/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026)

### 📐 Regras Oficiais Aplicadas:
| Faixa de Preço do Item | Taxa Percentual | Taxa Fixa por Item | Observações |
|---|---|---|---|
| **Até R$ 79,99** | **20%** | **R$ 4,50** | Regra 2026 (se item &lt; R$ 9, taxa fixa é 50% do valor do produto) |
| **R$ 80,00 a R$ 99,99** | **14%** | **R$ 16,00** | Taxa percentual cai para 14% |
| **R$ 100,00 a R$ 199,99** | **14%** | **R$ 20,00** | Taxa fixa ajustada para R$ 20,00 |
| **A partir de R$ 200,00** | **14%** | **R$ 26,00** | Taxa fixa travada em R$ 26,00 |
| **Vendedores CPF Alto Volume** | — | **+ R$ 3,00** | Vendedores CPF com &gt; 450 pedidos em 90 dias têm taxa adicional de R$ 3,00 |

### ⚙️ Campos Editáveis:
- **Margem de Lucro Desejada (%):** Padrão **20,0%** (editável em tempo real).
- **Custo de Embalagem (R$):** Padrão **R$ 1,50** (editável em tempo real).
- **Tipo de Conta Shopee:** Seleção entre `CNPJ`, `CPF Padrão` e `CPF Alto Volume (+R$ 3,00)`.
- **Imposto / DAS (%):** Campo editável (padrão 0% para MEI, configurável para Simples Nacional ex: 4%).
- **Arredondamento Comercial:** Opção de arredondar preços para final **,90** (ex: R$ 39,90) ou **,99** (ex: R$ 39,99).

---

## 🧮 Como Funciona o Cálculo Matemático

Para garantir exatamente **20% de margem líquida real no seu bolso**, a fórmula de precificação calcula o preço de venda bruto $P$:

$$P = \frac{\text{Custo da Peça} + \text{Embalagem (R\$ 1,50)} + \text{Taxa Fixa Shopee}}{1 - (\text{Comissão Shopee \%} + \text{Imposto \%} + \text{Margem \%})}$$

### Exemplo Prático (Bermuda Feminina):
- **Custo da Peça:** R$ 18,00
- **Embalagem:** R$ 1,50 (Custo Direto = R$ 19,50)
- **Margem Desejada:** 20%
- **Taxa Shopee:** 20% + R$ 4,50 fixa

$$P = \frac{19,50 + 4,50}{1 - (0,20 + 0 + 0,20)} = \frac{24,00}{0,60} = \mathbf{R\$\ 40,00}$$

#### Raio-X Financeiro (DRE):
- (+) **Preço de Venda Shopee:** R$ 40,00 (100%)
- (-) **Comissão Shopee (20%):** -R$ 8,00
- (-) **Taxa Fixa Shopee:** -R$ 4,50
- (-) **Custo de Embalagem:** -R$ 1,50
- (-) **Custo da Mercadoria:** -R$ 18,00
- (=) **Repasse Shopee na sua conta:** **R$ 27,50**
- (=) **Lucro Líquido Real no Bolso:** **R$ 8,00 (20,0% cravado!)**

---

## 🌟 Recursos do Precificador na Aplicação

1. **Simulador Individual Interativo:**
   - Selecione qualquer produto da sua planilha pelo menu para carregar foto, nome, custo e preço atual da sua loja própria.
   - Veja o preço sugerido na Shopee comparado ao preço da Loja Integrada.
   - Demonstrativo financeiro (DRE) detalhando cada centavo.
   - Gráfico de barras visual mostrando a fatia de cada custo.
   - **Simulador Reverso:** Digite qualquer preço no campo livre para ver qual seria seu lucro se você vender àquele valor!

2. **Tabela de Precificação em Massa (Todo o Catálogo):**
   - Calcula automaticamente o preço ideal de venda na Shopee para todos os **376 SKUs** da loja.
   - Colunas com Preço de Custo, Preço Loja, Embalagem, Taxas Shopee, Preço Sugerido Shopee, Lucro em R$, Margem Real e Estoque.
   - Botão **"⚡ Simular"** em cada linha para testar o produto na calculadora.
   - Botão **"📥 Exportar Preços Shopee (Excel)"** para baixar a planilha pronta.

3. **Integração no Catálogo Geral:**
   - Na aba de Catálogo, cada produto tem um botão **"🏷️ Precificar"** que leva direto para o simulador Shopee com o produto já carregado!

---

## 🔍 Nova Aba: Auditoria Shopee Real (184 Itens & Preço Âncora)

Com base no relatório oficial exportado da Shopee (`data/raw/shopee/Shopee_Anuncios_Exportacao_Atual.xlsx`), a aplicação conta com uma aba exclusiva de **Auditoria dos Preços Reais Cadastrados**:

### 🎯 Principais Funcionalidades da Auditoria:
1. **Auditoria de 100% dos Itens Cadastrados (184 variações):**
   - Comparativo lado a lado: **Preço Âncora Shopee** vs **Preço Loja Integrada** vs **Custo Unitário**.
   - Cálculo do Lucro Líquido Real e da Margem Líquida Real sob as regras oficiais da Shopee de 2026.
2. **Simulador Interativo de Promoções em Massa ("Meus Descontos"):**
   - Slider de **0% a 60% de desconto** com botões rápidos: `0% (Cheio)`, `15% (Leve)`, `20% (Recomendado)`, `25% (Equilibrado)`, `30% (Paridade Loja)` e `40% (Queima)`.
   - Atualização instantânea dos KPIs: Preço Médio, Margem Média Resultante, Lucro Médio por Peça e Qtd de Itens Seguros vs Risco.
3. **Cálculo do "Teto de Desconto Seguro":**
   - Exibe para cada produto exatamente até quantos `%` de desconto ele suporta antes de a margem cair abaixo de **20%** ou **10%**.
4. **Filtros Inteligentes de Risco & Pendências Cadastrais:**
   - Filtre produtos por: `Margem Segura (>= 20%)`, `Margem em Risco (0% a 20%)`, `Prejuízo (< 0%)` e `Sem SKU na Shopee (122 itens)`.
5. **Exportação Completa para Excel:**
   - Exporte o relatório auditado com simulação de desconto e diagnósticos com 1 clique!

