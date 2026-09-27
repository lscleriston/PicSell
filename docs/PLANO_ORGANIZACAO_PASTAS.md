# 📁 Plano de Organização e Arquitetura de Pastas — StokPic (Financeiro Luluks)

## 1. Diagnóstico do Estado Atual

Atualmente, o repositório contém **27 arquivos na raiz** misturando responsabilidades distintas:
- 🌐 **Interface Web:** `index.html`, `app.js`, `styles.css`, `xlsx.full.min.js`.
- 📊 **Bases de Dados Geradas:** `dados_produtos.js`, `dados_produtos.json`, `dados_shopee_real.js`, `analise_shopee_real.json`.
- 📑 **Planilhas Brutas de Entrada (ERP / Shopee):** 4 planilhas `.xlsx` com nomes longos e datas diferentes.
- 🐍 **Scripts Python de ETL e Cruzamento:** `gerar_dados.py`, `analisar_shopee.py`, `scratch_match.py`, `debug_matching.py`, `find_candidates.py`, `export_map_helper.py`, `shopee_exact_map.py`, `test_matching.py`.
- ⚡ **Scripts de Automação Windows:** `Abrir_Aplicacao.bat`, `Atualizar_Dados.bat`.
- 📝 **Arquivos de Apoio e Docs:** `map_helper.txt`, `README.md`, `.gitignore`.

### ⚠️ Principais Problemas Identificados:
1. **Poluição Visual na Raiz:** Dificuldade em identificar o que é código-fonte, o que é dado gerado e o que é planilha temporária.
2. **Duplicação e Scripts Temporários:** Vários scripts de matching criados durante testes (`scratch_match.py`, `test_matching.py`, `debug_matching.py`) sem centralização.
3. **Planilhas no Controle de Versão:** Planilhas brutas de importação na raiz pesam no Git e dificultam saber qual é a versão mais recente.

---

## 2. Nova Arquitetura de Pastas Proposta

A estrutura foi desenhada para manter **100% de compatibilidade** com o funcionamento offline (abertura direta no navegador via duplo-clique ou `.bat`), isolando responsabilidades de forma profissional:

```
finaceiro-luluks/
│
├── 📂 web/                         # 🌐 Frontend & Assets da Aplicação Web
│   ├── 📂 css/
│   │   └── styles.css              # Estilização completa do dashboard
│   ├── 📂 js/
│   │   ├── app.js                  # Lógica da aplicação SPA, simuladores e renderizadores
│   │   └── lib/
│   │       └── xlsx.full.min.js    # Biblioteca externa SheetJS
│   └── 📂 data/
│       ├── dados_produtos.js       # Base formatada do catálogo da loja
│       └── dados_shopee_real.js    # Base formatada da auditoria Shopee real
│
├── 📂 scripts/                     # 🐍 Motor de Processamento de Dados (ETL Python)
│   ├── 📂 etl/
│   │   ├── gerar_dados.py          # Processa catálogo da loja -> dados_produtos.js/json
│   │   └── processar_shopee.py     # Cruza anúncios Shopee com catálogo -> dados_shopee_real.js
│   ├── 📂 utils/
│   │   ├── helpers_matching.py     # Funções auxiliares de matching fuzzy e SKU
│   │   ├── debug_matching.py       # Diagnóstico de vínculos não encontrados
│   │   └── export_map_helper.py    # Utilitário para exportação de dicionários
│   └── 📂 config/
│       └── map_helper.txt          # Mapeamento manual persistente de variações
│
├── 📂 data/                        # 📑 Armazenamento de Planilhas e Dados
│   ├── 📂 raw/                     # Planilhas originais de importação (ERP / Shopee)
│   │   ├── 📂 catalogo/            # Planilhas de catálogo e custos (ex: produtos-2026-03-28.xlsx)
│   │   └── 📂 shopee/              # Exportações da Shopee (anúncios, preços, impostos)
│   └── 📂 processed/               # JSONs processados consolidados
│       ├── dados_produtos.json
│       └── analise_shopee_real.json
│
├── 📂 docs/                        # 📚 Documentação Técnica e Manuais
│   ├── PLANO_ORGANIZACAO_PASTAS.md # Este documento de arquitetura
│   └── REGRAS_PRECIFICACAO_2026.md # Regras detalhadas das taxas Shopee e TikTok Shop
│
├── .gitignore                      # Regras de exclusão do Git
├── Abrir_Aplicacao.bat             # Atalho rápido: Abre index.html no navegador padrão
├── Atualizar_Dados.bat             # Executa scripts Python em /scripts e atualiza as bases
├── index.html                      # Ponto de entrada da aplicação (na raiz p/ fácil execução)
├── PLANO_ORGANIZACAO_PASTAS.md     # Cópia de referência na raiz
└── README.md                       # Manual principal do repositório
```

---

## 3. Mapeamento de Movimentação dos Arquivos

| Arquivo Atual na Raiz | Novo Destino Proposto | Finalidade |
| :--- | :--- | :--- |
| `styles.css` | `web/css/styles.css` | Folha de estilos central |
| `app.js` | `web/js/app.js` | Lógica central JavaScript |
| `xlsx.full.min.js` | `web/js/lib/xlsx.full.min.js` | Biblioteca de terceiros |
| `dados_produtos.js` | `web/data/dados_produtos.js` | Dataset do catálogo para o navegador |
| `dados_shopee_real.js` | `web/data/dados_shopee_real.js` | Dataset da auditoria Shopee para o navegador |
| `dados_produtos.json` | `data/processed/dados_produtos.json` | Backup estruturado em JSON |
| `analise_shopee_real.json` | `data/processed/analise_shopee_real.json` | Backup estruturado da auditoria |
| `produtos-2026-03-28.xlsx` | `data/raw/catalogo/produtos-2026-03-28.xlsx` | Planilha original de estoque/custos |
| `Shopee_Anúncios_*.xlsx` | `data/raw/shopee/Shopee_Anuncios_Exportacao_Atual.xlsx` | Planilha oficial de anúncios Shopee |
| `mass_update_sales_*.xlsx` | `data/raw/shopee/mass_update_sales_info_anterior.xlsx` | Histórico de exportação anterior |
| `mass_update_tax_*.xlsx` | `data/raw/shopee/mass_update_tax_info.xlsx` | Histórico fiscal Shopee |
| `gerar_dados.py` | `scripts/etl/gerar_dados.py` | Script ETL do catálogo |
| `scratch_match.py` / `analisar_shopee.py` | `scripts/etl/processar_shopee.py` | Script ETL consolidado da Shopee |
| `debug_matching.py` | `scripts/utils/debug_matching.py` | Ferramenta de auditoria de vínculo |
| `export_map_helper.py` | `scripts/utils/export_map_helper.py` | Ferramenta de mapeamento |
| `find_candidates.py` / `test_matching.py` | `scripts/utils/` | Scripts de testes e buscas |
| `map_helper.txt` | `scripts/config/map_helper.txt` | Dicionário de equivalência de variações |

---

## 4. Ajustes de Caminhos Necessários

Para garantir que tudo continue funcionando sem interrupções após a reorganização:

### A. `index.html` (Carregamento de Scripts e CSS)
```html
<!-- Antes -->
<link rel="stylesheet" href="styles.css">
<script src="xlsx.full.min.js"></script>
<script src="dados_produtos.js"></script>
<script src="dados_shopee_real.js"></script>
<script src="app.js"></script>

<!-- Depois -->
<link rel="stylesheet" href="web/css/styles.css">
<script src="web/js/lib/xlsx.full.min.js"></script>
<script src="web/data/dados_produtos.js"></script>
<script src="web/data/dados_shopee_real.js"></script>
<script src="web/js/app.js"></script>
```

### B. `scripts/etl/gerar_dados.py` (Caminhos de Entrada e Saída)
- **Entrada:** `data/raw/catalogo/*.xlsx`
- **Saída:** `web/data/dados_produtos.js` e `data/processed/dados_produtos.json`

### C. `scripts/etl/processar_shopee.py` (Caminhos de Entrada e Saída)
- **Entrada:** `data/raw/shopee/*.xlsx` e `data/processed/dados_produtos.json`
- **Saída:** `web/data/dados_shopee_real.js` e `data/processed/analise_shopee_real.json`

### D. `Atualizar_Dados.bat` (Execução de ETL)
```bat
@echo off
title Luluks - Atualizar Dados da Planilha
echo ========================================================
echo Luluks Baby & Kids - Processando catalogo e estoque...
echo ========================================================
python "%~dp0scripts\etl\gerar_dados.py"
echo.
echo ========================================================
echo Luluks Baby & Kids - Processando auditoria Shopee...
echo ========================================================
python "%~dp0scripts\etl\processar_shopee.py"
echo.
echo Processo finalizado com sucesso! Pressione qualquer tecla para sair.
pause >nul
```

---

## 5. Plano de Execução Seguro em Etapas

1. **Aprovação do Planejamento:** Revisão e validação da estrutura proposta.
2. **Criação da Estrutura de Pastas:** Criação dos diretórios `web/`, `scripts/`, `data/`, `docs/`.
3. **Migração dos Arquivos:** Movimentação organizada e consolidação de scripts redundantes.
4. **Atualização dos Caminhos:** Ajuste das referências no `index.html`, nos scripts Python e no arquivo `.bat`.
5. **Verificação & Testes:** Execução de `Atualizar_Dados.bat` e teste completo do `index.html` no navegador.
6. **Commit & Push no Git:** Versionamento com histórico limpo no repositório.
