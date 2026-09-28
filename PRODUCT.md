# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Lojistas e Sellers de E-commerce Multi-Canal no Brasil:** Empreendedores e gestores de pequenas e médias marcas (inicialmente nicho infantil/vestuário e varejo geral) que operam em múltiplos canais simultaneamente: Loja Própria (Loja Integrada/Shopify/Nuvemshop), Shopee Brasil e TikTok Shop.
- **Analistas Financeiros e de Precificação:** Profissionais responsáveis por garantir que promoções em massa, cupons e comissões de afiliados não gerem vendas com margem negativa ou sangria de caixa.

## Product Purpose

O **PicSell** é uma plataforma analítica e operacional de gestão de estoque, decomposição de custos e precificação estratégica multi-canal. O produto existe para eliminar a incerteza financeira na venda em marketplaces, transformando regras fiscais e tabelas complexas de comissões (taxas percentuais, taxas fixas escalonadas, regras de novos vendedores e regimes tributários) em decisões claras de margem líquida e preço de venda rentável.

O sucesso do produto significa:
1. Zero vendas com margem líquida negativa não intencional em marketplaces.
2. Definição instantânea de preços de cadastro âncora e tetos de desconto seguros para campanhas promocionais.
3. Visão unificada e auditada de estoque físico e valor financeiro imobilizado.

## Positioning

Diferente de ERPs tradicionais que tratam marketplaces apenas como canais de escoamento e de planilhas manuais estáticas propensas a erros de fórmula:
- **DRE Unitário em Tempo Real:** Decompõe instantaneamente CMV, embalagem, comissão percentual, taxa fixa por item e impostos (DAS/Simples).
- **Mecânica Nativa de Preço Âncora:** Calcula simultaneamente o preço de tabela para cadastro e o preço com desconto efetivo para a Central de Marketing, garantindo o selo de promoção sem queimar a margem.
- **Teto de Desconto Seguro:** Informa a margem máxima de cupom suportada por cada SKU individual antes de violar o piso de segurança configurado pelo lojista.

## Operating Context

- **Modo Operacional Híbrido:** Execução imediata 100% client-side (offline-first, zero latência, navegadores desktop e tablets) alimentada por banco de dados local SQLite e exportação/importação de planilhas Excel (XLSX).
- **Evolução Multi-Tenant (SaaS):** Arquitetura desenhada para expansão escalável multi-usuário com controle de acesso e isolamento de dados por RLS (Row-Level Security).
- **Canais Nativos Suportados:**
  - *Shopee Brasil 2026:* Regras oficiais do Artigo 26839 (faixas < R$ 80, R$ 80–99, R$ 100–199, >= R$ 200 e taxa extra para CPF alto volume).
  - *TikTok Shop Brasil 2026:* Faixas de 10% + R$ 4,00 (< R$ 50) e 6% + R$ 6,00 (>= R$ 50) com regime especial de novos vendedores (isenção de comissão percentual).
  - *Simulador de Afiliados/Influenciadores:* Análise de absorção de comissão vs repasse no preço.

## Capabilities and Constraints

- **Capacidades Confirmadas:**
  - Catálogo agrupado por modelo pai com expansão sanfonada e edição granular por variação/tamanho.
  - Simulador individual com busca preditiva, preview de imagem e comparador entre canais.
  - Simulador e auditoria em massa de 100% dos anúncios reais exportados.
  - Persistência de alterações locais no navegador (`localStorage`) com recálculo instantâneo de KPIs.
  - Sincronização bidirecional com SQLite (`data/database/stokpic.db`) e exportação de planilhas auditadas.
- **Restrições Técnicas:**
  - O processamento de cálculo primário no navegador deve manter latência imperceptível (< 16ms por recalculo).
  - Preservação estrita das regras fiscais e tributárias brasileiras vigentes.

## Brand Commitments

- **Nome Oficial:** PicSell (evolução da base de catálogo Luluks Baby & Kids / Stokpic).
- **Tom de Voz:** Seguro, analítico, direto, transparente e voltado à rentabilidade do lojista.
- **Compromisso Visual:** Interface operacional densa porém legível, com suporte a tema Claro e Escuro, tipografia numérica tabular e conformidade com acessibilidade WCAG AA.

## Evidence on Hand

- **Catálogo Base de Produtos:** `data/raw/catalogo/produtos-2026-03-28.xlsx` (189 modelos pai, 376 variações).
- **Relatório Oficial de Auditoria Shopee:** `data/raw/shopee/Shopee_Anúncios_Exportação_0927005106-20260927005106098001.xlsx` (178 anúncios reais cadastrados).
- **Banco de Dados Estruturado:** `data/database/stokpic.db`.
- **Regras Oficiais:** Documentação do Centro de Educação do Vendedor Shopee Brasil (Artigo 26839).

## Product Principles

1. **A Verdade Financeira no Bolso é Soberana:** Cada centavo de taxa oculta ou custo indireto deve ser explicitado no DRE antes de o lojista cadastrar o anúncio.
2. **Velocidade de Decisão Sem Fricção:** Ajustar uma margem ou slider deve recalcular 376 produtos instantaneamente, sem esperas de servidor.
3. **Prevenção Ativa de Prejuízo:** O sistema nunca deve ser passivo diante de margem negativa; alertas e diagnósticos devem orientar a correção imediata.
4. **Respeito aos Fluxos Reais do Seller:** O lojista não precifica no vácuo; ele precisa de preço âncora, desconto promocional e comparativo entre múltiplos marketplaces simultâneos.

## Accessibility & Inclusion

- Conformidade com padrões de contraste WCAG AA (mínimo de 4.5:1 para texto padrão e 3:1 para elementos de destaque e componentes interativos).
- Suporte total a navegação por teclado nos modais e listas suspensas.
- Alinhamento numérico estrito com dígitos tabulares para facilitar leitura e auditoria por lojistas e contadores.
