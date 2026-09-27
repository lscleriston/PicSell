/**
 * Luluks Baby & Kids - Gestão de Estoque & Custos + Precificador Shopee & Afiliados
 * Lógica Completa da Aplicação (app.js)
 */

(function () {
  'use strict';

  // Placeholder SVG para produtos sem imagem
  const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='%2394a3b8' viewBox='0 0 24 24'%3E%3Cpath d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";

  // Formatador de Moeda Brasileiro
  const fmtCurrency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const fmtNumber = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2
  });

  // Estado da Aplicação
  const state = {
    activeTab: 'catalog',     // 'catalog' ou 'shopee'
    data: null,
    overrides: {},            // Modificações locais de preço e estoque { [sku]: { preco_venda, estoque, custo, preco_promo, ... } }
    filteredItems: [],
    viewStructure: 'grouped', // 'grouped' (por modelo) ou 'skus' (por variação individual)
    viewMode: 'table',        // 'table' ou 'cards'
    filters: {
      search: '',
      stockStatus: 'all',     // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
      category: 'all',
      status: 'all'           // 'all' | 'S' | 'N'
    },
    sort: {
      field: 'estoque_total',
      direction: 'desc'
    },
    pagination: {
      currentPage: 1,
      pageSize: 25
    },
    expandedGroups: new Set(),

    // Parâmetros da Shopee 2026
    shopee: {
      marginPct: 20.0,        // Margem de lucro desejada (Padrão 20%)
      packagingCost: 1.50,    // Custo de embalagem (Padrão R$ 1,50)
      sellerType: 'cnpj',     // 'cnpj' | 'cpf_normal' | 'cpf_high_volume'
      taxPct: 0.0,            // Alíquota de imposto (Padrão 0.0%)
      rounding: 'none',       // 'none' | '90' | '99'
      discountPromoPct: 30.0, // Desconto planejado na promoção da Shopee (Padrão 30%)
      selectedProductSku: null,
      manualPrice: null,
      tableSearch: '',
      tableStockFilter: 'in_stock',
      currentPage: 1,
      pageSize: 25,

      // Parâmetros de Afiliados
      affiliate: {
        testedPct: 5.0,       // Comissão de afiliado testada (Padrão 5%)
        minMarginPct: 10.0,   // Piso mínimo de margem que o vendedor aceita (Padrão 10%)
        mode: 'absorb'        // 'absorb' (da margem) ou 'repass' (no preço)
      }
    },

    // Parâmetros do TikTok Shop Brasil 2026
    tiktok: {
      marginPct: 20.0,        // Margem de lucro desejada (Padrão 20%)
      packagingCost: 1.50,    // Custo de embalagem (Padrão R$ 1,50)
      sellerRegime: 'standard', // 'standard' | 'new_seller'
      taxPct: 0.0,            // Alíquota de imposto (Padrão 0.0%)
      rounding: 'none',       // 'none' | '90' | '99'
      discountPromoPct: 30.0, // Desconto planejado na promoção do TikTok Shop (Padrão 30%)
      selectedProductSku: null,
      manualPrice: null,
      tableSearch: '',
      tableStockFilter: 'in_stock',
      currentPage: 1,
      pageSize: 25,

      // Parâmetros de Criadores / Afiliados
      affiliate: {
        testedPct: 5.0,       // Comissão de criador testada (Padrão 5%)
        minMarginPct: 10.0,   // Piso mínimo de margem que o vendedor aceita (Padrão 10%)
        mode: 'absorb'        // 'absorb' (da margem) ou 'repass' (no preço)
      }
    },

    // Auditoria Shopee Real (178 itens reais cadastrados com desconto)
    audit: {
      mode: 'real',           // 'real' (preço praticado) | 'custom' (desconto simulado)
      discountPct: 26.6,
      search: '',
      filter: 'all',          // 'all' | 'safe' | 'warning' | 'danger' | 'no_sku'
      currentPage: 1,
      pageSize: 25,
      sortField: 'shopee_promo_price',
      sortDir: 'desc'
    }
  };

  // Elementos do DOM
  const elements = {
    // Abas de navegação
    navBtnCatalog: document.getElementById('nav-btn-catalog'),
    navBtnShopee: document.getElementById('nav-btn-shopee'),
    navBtnTiktok: document.getElementById('nav-btn-tiktok'),
    navBtnAudit: document.getElementById('nav-btn-audit'),
    navCatalogBadge: document.getElementById('nav-catalog-badge'),
    navAuditBadge: document.getElementById('nav-audit-badge'),
    viewCatalog: document.getElementById('view-catalog'),
    viewShopee: document.getElementById('view-shopee'),
    viewTiktok: document.getElementById('view-tiktok'),
    viewAudit: document.getElementById('view-audit'),

    // Auditoria Shopee Real
    auditKpiTotal: document.getElementById('audit-kpi-total'),
    auditKpiTotalSub: document.getElementById('audit-kpi-total-sub'),
    auditKpiPriceCad: document.getElementById('audit-kpi-price-cad'),
    auditKpiPriceCadSub: document.getElementById('audit-kpi-price-cad-sub'),
    auditKpiPricePromo: document.getElementById('audit-kpi-price-promo'),
    auditKpiPricePromoSub: document.getElementById('audit-kpi-price-promo-sub'),
    auditKpiMarginReal: document.getElementById('audit-kpi-margin-real'),
    auditKpiMarginRealSub: document.getElementById('audit-kpi-margin-real-sub'),

    auditDiscountSlider: document.getElementById('audit-discount-slider'),
    auditDiscountDisplay: document.getElementById('audit-discount-display'),
    auditPresetBtns: document.querySelectorAll('.audit-preset-btn'),

    auditSimResPrice: document.getElementById('audit-sim-res-price'),
    auditSimResMargin: document.getElementById('audit-sim-res-margin'),
    auditSimResProfit: document.getElementById('audit-sim-res-profit'),
    auditSimResSafe: document.getElementById('audit-sim-res-safe'),
    auditSimResLoss: document.getElementById('audit-sim-res-loss'),

    auditSearchInput: document.getElementById('audit-search-input'),
    auditSearchClear: document.getElementById('audit-search-clear'),
    auditFilterPills: document.querySelectorAll('[data-audit-filter]'),
    auditFilterAll: document.getElementById('audit-filter-all'),
    auditFilterSafe: document.getElementById('audit-filter-safe'),
    auditFilterWarning: document.getElementById('audit-filter-warning'),
    auditFilterDanger: document.getElementById('audit-filter-danger'),
    auditFilterNoSku: document.getElementById('audit-filter-nosku'),
    btnExportAudit: document.getElementById('btn-export-audit'),

    auditTableBody: document.getElementById('audit-table-body'),
    auditPaginationInfo: document.getElementById('audit-pagination-info'),
    auditPaginationPages: document.getElementById('audit-pagination-pages'),

    // Catálogo & Estoque
    kpisContainer: document.getElementById('kpis-container'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    categoryFilter: document.getElementById('category-filter'),
    statusFilter: document.getElementById('status-filter'),
    stockPills: document.querySelectorAll('.filter-pill'),
    structureBtns: document.querySelectorAll('[data-structure]'),
    viewModeBtns: document.querySelectorAll('[data-view-mode]'),
    tableContainer: document.getElementById('table-view-container'),
    cardsContainer: document.getElementById('cards-view-container'),
    tableHead: document.getElementById('table-head'),
    tableBody: document.getElementById('table-body'),
    paginationInfo: document.getElementById('pagination-info'),
    paginationPages: document.getElementById('pagination-pages'),
    pageSizeSelect: document.getElementById('page-size-select'),

    // Ações do cabeçalho
    btnUpload: document.getElementById('btn-upload'),
    fileInput: document.getElementById('file-input'),
    btnExport: document.getElementById('btn-export'),
    btnPrint: document.getElementById('btn-print'),
    themeToggle: document.getElementById('theme-toggle'),
    activeFilename: document.getElementById('active-filename'),

    // Precificador Shopee
    shopeeCfgMargin: document.getElementById('shopee-cfg-margin'),
    shopeeCfgPack: document.getElementById('shopee-cfg-pack'),
    shopeeCfgPromoDiscount: document.getElementById('shopee-cfg-promo-discount'),
    shopeeCfgSellerType: document.getElementById('shopee-cfg-seller-type'),
    shopeeCfgTax: document.getElementById('shopee-cfg-tax'),
    shopeeCfgRounding: document.getElementById('shopee-cfg-rounding'),
    rulesAccordionToggle: document.getElementById('rules-accordion-toggle'),
    rulesAccordionContent: document.getElementById('rules-accordion-content'),
    rulesChevron: document.getElementById('rules-chevron'),
    btnExportShopee: document.getElementById('btn-export-shopee'),

    // Simulador Individual Shopee
    simProductSelect: document.getElementById('sim-product-select'),
    simProductSearch: document.getElementById('sim-product-search'),
    simSearchClear: document.getElementById('sim-search-clear'),
    simAutocompleteList: document.getElementById('sim-autocomplete-list'),
    simProductPreview: document.getElementById('sim-product-preview'),
    simProductImg: document.getElementById('sim-product-img'),
    simProductName: document.getElementById('sim-product-name'),
    simProductCat: document.getElementById('sim-product-cat'),
    simProductStorePrice: document.getElementById('sim-product-store-price'),
    simCostInput: document.getElementById('sim-cost-input'),
    simPackInput: document.getElementById('sim-pack-input'),
    simPromoDiscountInput: document.getElementById('sim-promo-discount-input'),
    simDiscountPills: document.querySelectorAll('.sim-discount-pill'),
    simManualPrice: document.getElementById('sim-manual-price'),
    simResultTitle: document.getElementById('sim-result-title'),
    simDisplayPrice: document.getElementById('sim-display-price'),
    simDisplayCadPrice: document.getElementById('sim-display-cad-price'),
    simDisplayCadSub: document.getElementById('sim-display-cad-sub'),
    simDisplayPromoPrice: document.getElementById('sim-display-promo-price'),
    simDisplayPromoBadge: document.getElementById('sim-display-promo-badge'),
    simDisplayTier: document.getElementById('sim-display-tier'),
    simComparisonBadge: document.getElementById('sim-comparison-badge'),

    // DRE Shopee
    dreCadVal: document.getElementById('dre-cad-val'),
    drePromoDiscountRow: document.getElementById('dre-promo-discount-row'),
    drePromoDiscountPct: document.getElementById('dre-promo-discount-pct'),
    drePromoDiscountVal: document.getElementById('dre-promo-discount-val'),
    dreVenda: document.getElementById('dre-venda'),
    dreShopeePct: document.getElementById('dre-shopee-pct'),
    dreShopeePctVal: document.getElementById('dre-shopee-pct-val'),
    dreShopeeFixVal: document.getElementById('dre-shopee-fix-val'),
    drePackVal: document.getElementById('dre-pack-val'),
    dreCostVal: document.getElementById('dre-cost-val'),
    dreTaxRow: document.getElementById('dre-tax-row'),
    dreTaxPct: document.getElementById('dre-tax-pct'),
    dreTaxVal: document.getElementById('dre-tax-val'),
    dreRepasse: document.getElementById('dre-repasse'),
    dreLucro: document.getElementById('dre-lucro'),

    // Barra de composição
    barCost: document.getElementById('bar-cost'),
    barPack: document.getElementById('bar-pack'),
    barShopee: document.getElementById('bar-shopee'),
    barTax: document.getElementById('bar-tax'),
    barProfit: document.getElementById('bar-profit'),
    breakdownSummary: document.getElementById('breakdown-summary'),

    // Simulador de Afiliados
    affModeAbsorb: document.getElementById('aff-mode-absorb'),
    affModeRepass: document.getElementById('aff-mode-repass'),
    affTestedPct: document.getElementById('aff-tested-pct'),
    affTestedValLabel: document.getElementById('aff-tested-val-label'),
    affMinMargin: document.getElementById('aff-min-margin'),
    affStrategyDesc: document.getElementById('aff-strategy-desc'),
    affKpiMaxPct: document.getElementById('aff-kpi-max-pct'),
    affKpiMaxVal: document.getElementById('aff-kpi-max-val'),
    affKpiAffVal: document.getElementById('aff-kpi-aff-val'),
    affKpiAffPct: document.getElementById('aff-kpi-aff-pct'),
    affKpiProfitVal: document.getElementById('aff-kpi-profit-val'),
    affKpiProfitPct: document.getElementById('aff-kpi-profit-pct'),
    affKpiStatusPill: document.getElementById('aff-kpi-status-pill'),
    affKpiStatusSub: document.getElementById('aff-kpi-status-sub'),
    affScenarioTbody: document.getElementById('aff-scenario-tbody'),
    quickPctBtns: document.querySelectorAll('.quick-pct-btn'),

    // Tabela em Massa Shopee
    shopeeMassCount: document.getElementById('shopee-mass-count'),
    massMarginLabel: document.getElementById('mass-margin-label'),
    massPackLabel: document.getElementById('mass-pack-label'),
    shopeeTableSearch: document.getElementById('shopee-table-search'),
    shopeeTableStockFilter: document.getElementById('shopee-table-stock-filter'),
    shopeeTableBody: document.getElementById('shopee-table-body'),
    shopeePaginationInfo: document.getElementById('shopee-pagination-info'),
    shopeePaginationPages: document.getElementById('shopee-pagination-pages'),

    // Precificador TikTok Shop
    tiktokCfgMargin: document.getElementById('tiktok-cfg-margin'),
    tiktokCfgPack: document.getElementById('tiktok-cfg-pack'),
    tiktokCfgPromoDiscount: document.getElementById('tiktok-cfg-promo-discount'),
    tiktokCfgNewSeller: document.getElementById('tiktok-cfg-new-seller'),
    tiktokCfgTax: document.getElementById('tiktok-cfg-tax'),
    tiktokCfgRounding: document.getElementById('tiktok-cfg-rounding'),
    tiktokRulesToggle: document.getElementById('tiktok-rules-toggle'),
    tiktokRulesContent: document.getElementById('tiktok-rules-content'),
    tiktokRulesChevron: document.getElementById('tiktok-rules-chevron'),
    btnExportTiktok: document.getElementById('btn-export-tiktok'),

    // Simulador Individual TikTok Shop
    tiktokSimProductSearch: document.getElementById('tiktok-sim-product-search'),
    tiktokSimSearchClear: document.getElementById('tiktok-sim-search-clear'),
    tiktokSimAutocompleteList: document.getElementById('tiktok-sim-autocomplete-list'),
    tiktokSimProductPreview: document.getElementById('tiktok-sim-product-preview'),
    tiktokSimProductImg: document.getElementById('tiktok-sim-product-img'),
    tiktokSimProductName: document.getElementById('tiktok-sim-product-name'),
    tiktokSimProductCat: document.getElementById('tiktok-sim-product-cat'),
    tiktokSimProductStorePrice: document.getElementById('tiktok-sim-product-store-price'),
    tiktokSimProductShopeePrice: document.getElementById('tiktok-sim-product-shopee-price'),
    tiktokSimCostInput: document.getElementById('tiktok-sim-cost-input'),
    tiktokSimPackInput: document.getElementById('tiktok-sim-pack-input'),
    tiktokSimPromoDiscountInput: document.getElementById('tiktok-sim-promo-discount-input'),
    tiktokSimDiscountPills: document.querySelectorAll('.tiktok-sim-discount-pill'),
    tiktokSimManualPrice: document.getElementById('tiktok-sim-manual-price'),
    tiktokSimDisplayCadPrice: document.getElementById('tiktok-sim-display-cad-price'),
    tiktokSimDisplayCadSub: document.getElementById('tiktok-sim-display-cad-sub'),
    tiktokSimDisplayPromoPrice: document.getElementById('tiktok-sim-display-promo-price'),
    tiktokSimDisplayPromoBadge: document.getElementById('tiktok-sim-display-promo-badge'),
    tiktokSimDisplayTier: document.getElementById('tiktok-sim-display-tier'),
    tiktokSimComparisonBadge: document.getElementById('tiktok-sim-comparison-badge'),
    tiktokSimVsShopeeBadge: document.getElementById('tiktok-sim-vs-shopee-badge'),

    // DRE TikTok Shop
    tiktokDreCadVal: document.getElementById('tiktok-dre-cad-val'),
    tiktokDrePromoDiscountRow: document.getElementById('tiktok-dre-promo-discount-row'),
    tiktokDrePromoDiscountPct: document.getElementById('tiktok-dre-promo-discount-pct'),
    tiktokDrePromoDiscountVal: document.getElementById('tiktok-dre-promo-discount-val'),
    tiktokDreVenda: document.getElementById('tiktok-dre-venda'),
    tiktokDrePct: document.getElementById('tiktok-dre-pct'),
    tiktokDrePctVal: document.getElementById('tiktok-dre-pct-val'),
    tiktokDreFixVal: document.getElementById('tiktok-dre-fix-val'),
    tiktokDrePackVal: document.getElementById('tiktok-dre-pack-val'),
    tiktokDreCostVal: document.getElementById('tiktok-dre-cost-val'),
    tiktokDreTaxRow: document.getElementById('tiktok-dre-tax-row'),
    tiktokDreTaxPct: document.getElementById('tiktok-dre-tax-pct'),
    tiktokDreTaxVal: document.getElementById('tiktok-dre-tax-val'),
    tiktokDreRepasse: document.getElementById('tiktok-dre-repasse'),
    tiktokDreLucro: document.getElementById('tiktok-dre-lucro'),

    // Barra de Composição TikTok
    tiktokBarCost: document.getElementById('tiktok-bar-cost'),
    tiktokBarPack: document.getElementById('tiktok-bar-pack'),
    tiktokBarFee: document.getElementById('tiktok-bar-fee'),
    tiktokBarTax: document.getElementById('tiktok-bar-tax'),
    tiktokBarProfit: document.getElementById('tiktok-bar-profit'),
    tiktokBreakdownSummary: document.getElementById('tiktok-breakdown-summary'),

    // Simulador Criadores TikTok
    tiktokAffModeAbsorb: document.getElementById('tiktok-aff-mode-absorb'),
    tiktokAffModeRepass: document.getElementById('tiktok-aff-mode-repass'),
    tiktokAffTestedPct: document.getElementById('tiktok-aff-tested-pct'),
    tiktokAffTestedValLabel: document.getElementById('tiktok-aff-tested-val-label'),
    tiktokAffMinMargin: document.getElementById('tiktok-aff-min-margin'),
    tiktokAffQuickPctBtns: document.querySelectorAll('.tiktok-quick-pct-btn'),
    tiktokAffKpiMaxPct: document.getElementById('tiktok-aff-kpi-max-pct'),
    tiktokAffKpiMaxVal: document.getElementById('tiktok-aff-kpi-max-val'),
    tiktokAffKpiAffVal: document.getElementById('tiktok-aff-kpi-aff-val'),
    tiktokAffKpiAffSub: document.getElementById('tiktok-aff-kpi-aff-sub'),
    tiktokAffKpiStatusPill: document.getElementById('tiktok-aff-kpi-status-pill'),
    tiktokAffKpiStatusSub: document.getElementById('tiktok-aff-kpi-status-sub'),

    // Tabela em Massa TikTok
    tiktokMassCount: document.getElementById('tiktok-mass-count'),
    tiktokMassMarginLabel: document.getElementById('tiktok-mass-margin-label'),
    tiktokMassPackLabel: document.getElementById('tiktok-mass-pack-label'),
    tiktokTableSearch: document.getElementById('tiktok-table-search'),
    tiktokTableStockFilter: document.getElementById('tiktok-table-stock-filter'),
    tiktokTableBody: document.getElementById('tiktok-table-body'),
    tiktokPaginationInfo: document.getElementById('tiktok-pagination-info'),
    tiktokPaginationPages: document.getElementById('tiktok-pagination-pages'),

    // Ações de Edição e Exportação de Atualizados
    btnExportUpdated: document.getElementById('btn-export-updated'),
    btnExportUpdatedLabel: document.getElementById('btn-export-updated-label'),
    btnResetEdits: document.getElementById('btn-reset-edits'),

    // Modal de Edição de Preços e Estoque
    modalEditProduct: document.getElementById('modal-edit-product'),
    editProdImg: document.getElementById('edit-prod-img'),
    editProdTitle: document.getElementById('edit-prod-title'),
    editProdSku: document.getElementById('edit-prod-sku'),
    editProdVar: document.getElementById('edit-prod-var'),
    editProdClose: document.getElementById('edit-prod-close'),
    editProdForm: document.getElementById('edit-prod-form'),
    editProdSkuInput: document.getElementById('edit-prod-sku-input'),
    editInputPrecoVenda: document.getElementById('edit-input-preco-venda'),
    editInputEstoque: document.getElementById('edit-input-estoque'),
    editInputCusto: document.getElementById('edit-input-custo'),
    editInputPrecoPromo: document.getElementById('edit-input-preco-promo'),
    editPreviewLucro: document.getElementById('edit-preview-lucro'),
    editPreviewMargem: document.getElementById('edit-preview-margem'),
    editPreviewShopee: document.getElementById('edit-preview-shopee'),
    editPreviewTiktok: document.getElementById('edit-preview-tiktok'),
    editBtnResetSingle: document.getElementById('edit-btn-reset-single'),
    editBtnCancel: document.getElementById('edit-btn-cancel'),
    editBtnSave: document.getElementById('edit-btn-save'),

    // Modais e Utilitários
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxTitle: document.getElementById('lightbox-title'),
    lightboxSku: document.getElementById('lightbox-sku'),
    lightboxStock: document.getElementById('lightbox-stock'),
    lightboxCost: document.getElementById('lightbox-cost'),
    lightboxClose: document.getElementById('lightbox-close'),
    dragOverlay: document.getElementById('drag-overlay'),
    toastContainer: document.getElementById('toast-container')
  };

  // =========================================================================
  // Inicialização
  // =========================================================================
  function init() {
    initTheme();
    loadData();
    setupEventListeners();
    setupShopeeEventListeners();
    setupAffiliateEventListeners();
    setupTikTokEventListeners();
    setupShopeeAuditEventListeners();
    initShopeeSimulator();
    initTikTokSimulator();
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('luluks_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('luluks_theme', theme);
    if (elements.themeToggle) {
      elements.themeToggle.innerHTML = theme === 'dark' 
        ? '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>'
        : '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';
    }
  }

  function loadOverrides() {
    try {
      const saved = localStorage.getItem('luluks_product_overrides');
      state.overrides = saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Erro ao ler overrides do localStorage:', e);
      state.overrides = {};
    }
  }

  function saveOverridesToStorage() {
    try {
      localStorage.setItem('luluks_product_overrides', JSON.stringify(state.overrides));
    } catch (e) {
      console.warn('Erro ao salvar overrides no localStorage:', e);
    }
  }

  function updateHeaderEditsButtons() {
    const count = Object.keys(state.overrides || {}).length;
    if (elements.btnExportUpdated && elements.btnResetEdits) {
      if (count > 0) {
        elements.btnExportUpdated.style.display = 'inline-flex';
        elements.btnResetEdits.style.display = 'inline-flex';
        if (elements.btnExportUpdatedLabel) {
          elements.btnExportUpdatedLabel.textContent = `Exportar Atualizados (${count})`;
        }
      } else {
        elements.btnExportUpdated.style.display = 'none';
        elements.btnResetEdits.style.display = 'none';
      }
    }
  }

  function applyProductOverrides() {
    if (!state.data || !state.data.itens_detalhados) return;

    const overrides = state.overrides || {};

    state.data.itens_detalhados.forEach(item => {
      const ov = overrides[item.sku];
      if (ov) {
        if (ov.preco_venda !== undefined) item.preco_venda = Number(ov.preco_venda);
        if (ov.estoque !== undefined) item.estoque = Number(ov.estoque);
        if (ov.custo !== undefined) item.custo = Number(ov.custo);
        if (ov.preco_promo !== undefined) item.preco_promo = Number(ov.preco_promo);
        if (ov.preco_cheio !== undefined) item.preco_cheio = Number(ov.preco_cheio);
        item.custo_total = item.custo * item.estoque;
        item.venda_total = item.preco_venda * item.estoque;
        item.lucro_total = item.venda_total - item.custo_total;
        item.margem_pct = item.venda_total > 0 ? (item.lucro_total / item.venda_total * 100) : 0;
        item._isEdited = true;
      } else {
        item._isEdited = false;
      }
    });

    if (state.data.produtos_agrupados) {
      state.data.produtos_agrupados.forEach(grp => {
        if (grp.variacoes && grp.variacoes.length > 0) {
          let estTotal = 0;
          let cTotal = 0;
          let vTotal = 0;
          let minCusto = Infinity;
          let maxCusto = -Infinity;
          let minPreco = Infinity;
          let maxPreco = -Infinity;
          let anyEdited = false;

          grp.variacoes.forEach(v => {
            const ov = overrides[v.sku];
            if (ov) {
              if (ov.preco_venda !== undefined) v.preco_venda = Number(ov.preco_venda);
              if (ov.estoque !== undefined) v.estoque = Number(ov.estoque);
              if (ov.custo !== undefined) v.custo = Number(ov.custo);
              if (ov.preco_promo !== undefined) v.preco_promo = Number(ov.preco_promo);
              if (ov.preco_cheio !== undefined) v.preco_cheio = Number(ov.preco_cheio);
              v.custo_total = v.custo * v.estoque;
              v.venda_total = v.preco_venda * v.estoque;
              v.lucro_total = v.venda_total - v.custo_total;
              v.margem_pct = v.venda_total > 0 ? (v.lucro_total / v.venda_total * 100) : 0;
              v._isEdited = true;
              anyEdited = true;
            } else {
              v._isEdited = false;
            }

            estTotal += v.estoque;
            cTotal += v.custo_total;
            vTotal += v.venda_total;
            if (v.custo < minCusto) minCusto = v.custo;
            if (v.custo > maxCusto) maxCusto = v.custo;
            if (v.preco_venda < minPreco) minPreco = v.preco_venda;
            if (v.preco_venda > maxPreco) maxPreco = v.preco_venda;
          });

          grp.estoque_total = estTotal;
          grp.custo_total = cTotal;
          grp.venda_total = vTotal;
          grp.lucro_total = vTotal - cTotal;
          grp.margem_pct = vTotal > 0 ? ((vTotal - cTotal) / vTotal * 100) : 0;
          grp.custo_min = minCusto === Infinity ? 0 : minCusto;
          grp.custo_max = maxCusto === -Infinity ? 0 : maxCusto;
          grp.preco_min = minPreco === Infinity ? 0 : minPreco;
          grp.preco_max = maxPreco === -Infinity ? 0 : maxPreco;
          grp._isEdited = anyEdited;
        }
      });
    }

    updateHeaderEditsButtons();
  }

  function loadData() {
    loadOverrides();

    const localData = localStorage.getItem('luluks_custom_data');
    if (localData) {
      try {
        state.data = JSON.parse(localData);
      } catch (e) {
        console.error('Erro ao ler dados do localStorage:', e);
      }
    }

    if (!state.data && window.DADOS_PRODUTOS) {
      state.data = JSON.parse(JSON.stringify(window.DADOS_PRODUTOS));
    }

    if (!state.data) {
      showToast('Nenhum dado encontrado. Por favor, carregue a planilha.', 'warning');
      return;
    }

    applyProductOverrides();
    populateCategories();
    populateShopeeProductsSelect();
    computeCatalogShopeePrices();
    computeCatalogTikTokPrices();

    if (elements.activeFilename) {
      elements.activeFilename.textContent = state.data.kpis?.arquivo_origem || 'Planilha Carregada';
    }

    if (elements.navCatalogBadge) {
      elements.navCatalogBadge.textContent = state.data.itens_detalhados ? state.data.itens_detalhados.length : '0';
    }

    if (window.DADOS_SHOPEE_REAL && elements.navAuditBadge) {
      elements.navAuditBadge.textContent = `${window.DADOS_SHOPEE_REAL.total_shopee} itens`;
    }

    applyFilters();
    renderShopeeTable();
    renderTikTokTable();
  }

  function applyPriceRounding(price, rounding) {
    if (rounding === '90') {
      const inteiro = Math.floor(price);
      let res = inteiro + 0.90;
      if (res < price) res += 1.0;
      return res;
    } else if (rounding === '99') {
      const inteiro = Math.floor(price);
      let res = inteiro + 0.99;
      if (res < price) res += 1.0;
      return res;
    }
    return Math.round(price * 100) / 100;
  }

  function calcShopeePricingPair(cost, packaging, marginPct, taxPct, sellerType, rounding, discountPromoPct = 30.0, extraAffiliatePct = 0) {
    const promoBreakdown = calcShopeePrice(cost, packaging, marginPct, taxPct, sellerType, rounding, extraAffiliatePct);
    const precoComDesconto = promoBreakdown.precoVenda;

    let precoCadastro = precoComDesconto;
    let descontoReais = 0;
    let descontoEfetivoPct = 0;

    const disc = parseFloat(discountPromoPct);
    if (!isNaN(disc) && disc > 0 && disc < 100) {
      const rawCad = precoComDesconto / (1.0 - (disc / 100.0));
      precoCadastro = applyPriceRounding(rawCad, rounding);
      descontoReais = Math.max(0, precoCadastro - precoComDesconto);
      descontoEfetivoPct = precoCadastro > 0 ? (descontoReais / precoCadastro * 100.0) : 0;
    }

    return {
      precoCadastro,
      precoComDesconto,
      descontoReais,
      descontoEfetivoPct,
      discountPromoPct: disc || 0,
      breakdown: promoBreakdown
    };
  }

  function computeCatalogShopeePrices() {
    if (!state.data) return;
    const packaging = parseFloat(elements.shopeeCfgPack?.value) || state.shopee?.packagingCost || 1.50;
    const margin = parseFloat(elements.shopeeCfgMargin?.value) || state.shopee?.marginPct || 20.0;
    const tax = parseFloat(elements.shopeeCfgTax?.value) || state.shopee?.taxPct || 0.0;
    const sellerType = elements.shopeeCfgSellerType?.value || state.shopee?.sellerType || 'cnpj';
    const rounding = elements.shopeeCfgRounding?.value || state.shopee?.rounding || 'none';
    const discountPromo = parseFloat(elements.shopeeCfgPromoDiscount?.value) || state.shopee?.discountPromoPct || 30.0;

    if (state.data.itens_detalhados) {
      state.data.itens_detalhados.forEach(it => {
        const pair = calcShopeePricingPair(it.custo, packaging, margin, tax, sellerType, rounding, discountPromo);
        it.preco_shopee_cad = pair.precoCadastro;
        it.preco_shopee_promo = pair.precoComDesconto;
        it.preco_shopee = pair.precoComDesconto;
        it.shopee_desc_pct = pair.descontoEfetivoPct;
      });
    }

    if (state.data.produtos_agrupados) {
      state.data.produtos_agrupados.forEach(grp => {
        const pairMin = calcShopeePricingPair(grp.custo_min, packaging, margin, tax, sellerType, rounding, discountPromo);
        const pairMax = calcShopeePricingPair(grp.custo_max, packaging, margin, tax, sellerType, rounding, discountPromo);
        grp.preco_shopee_cad_min = pairMin.precoCadastro;
        grp.preco_shopee_cad_max = pairMax.precoCadastro;
        grp.preco_shopee_promo_min = pairMin.precoComDesconto;
        grp.preco_shopee_promo_max = pairMax.precoComDesconto;
        grp.preco_shopee_min = pairMin.precoComDesconto;
        grp.preco_shopee_max = pairMax.precoComDesconto;
        grp.preco_shopee = pairMin.precoComDesconto;
        grp.preco_shopee_cad = pairMin.precoCadastro;
        grp.shopee_desc_pct = pairMin.descontoEfetivoPct;

        if (grp.variacoes) {
          grp.variacoes.forEach(v => {
            const vPair = calcShopeePricingPair(v.custo, packaging, margin, tax, sellerType, rounding, discountPromo);
            v.preco_shopee_cad = vPair.precoCadastro;
            v.preco_shopee_promo = vPair.precoComDesconto;
            v.preco_shopee = vPair.precoComDesconto;
            v.shopee_desc_pct = vPair.descontoEfetivoPct;
          });
        }
      });
    }
  }

  // =========================================================================
  // Alternância de Abas Principais (Catálogo vs Shopee vs Auditoria Real)
  // =========================================================================
  function switchTab(tabName) {
    state.activeTab = tabName;

    elements.navBtnCatalog.classList.remove('active');
    elements.navBtnShopee.classList.remove('active', 'active-shopee');
    if (elements.navBtnTiktok) elements.navBtnTiktok.classList.remove('active', 'active-tiktok');
    if (elements.navBtnAudit) elements.navBtnAudit.classList.remove('active', 'active-audit');

    elements.viewCatalog.style.display = 'none';
    elements.viewShopee.style.display = 'none';
    if (elements.viewTiktok) elements.viewTiktok.style.display = 'none';
    if (elements.viewAudit) elements.viewAudit.style.display = 'none';

    if (tabName === 'catalog') {
      elements.navBtnCatalog.classList.add('active');
      elements.viewCatalog.style.display = 'block';
    } else if (tabName === 'shopee') {
      elements.navBtnShopee.classList.add('active', 'active-shopee');
      elements.viewShopee.style.display = 'block';
      updateShopeeSimulator();
      renderShopeeTable();
    } else if (tabName === 'tiktok') {
      if (elements.navBtnTiktok) elements.navBtnTiktok.classList.add('active', 'active-tiktok');
      if (elements.viewTiktok) elements.viewTiktok.style.display = 'block';
      updateTikTokSimulator();
      renderTikTokTable();
    } else if (tabName === 'audit') {
      if (elements.navBtnAudit) elements.navBtnAudit.classList.add('active', 'active-audit');
      if (elements.viewAudit) elements.viewAudit.style.display = 'block';
      renderShopeeAudit();
    }
  }

  // =========================================================================
  // MOTOR DE CÁLCULO SHOPEE 2026 (Artigo 26839)
  // =========================================================================
  function calcShopeePrice(cost, packaging, marginPct, taxPct, sellerType, rounding, extraAffiliatePct = 0) {
    const extraCpf = sellerType === 'cpf_high_volume' ? 3.0 : 0.0;
    const directCost = cost + packaging;
    const m = marginPct / 100.0;
    const t = taxPct / 100.0;
    const aff = extraAffiliatePct / 100.0;

    let finalPrice = 0;
    let tierName = '';
    let feePct = 0.20;
    let feeFixed = 4.50 + extraCpf;

    // Tentativa 1: Faixa 1 (Até R$ 79,99) -> 20% + R$ 4,50
    const denom1 = 1.0 - (0.20 + t + m + aff);
    if (denom1 > 0) {
      const p1 = (directCost + 4.50 + extraCpf) / denom1;
      if (p1 <= 79.99) {
        if (p1 < 9.00) {
          const denomLow = 1.0 - (0.20 + 0.50 + t + m + aff);
          if (denomLow > 0) {
            finalPrice = (directCost + extraCpf) / denomLow;
            tierName = 'Sub R$ 9: 20% + 50% taxa fixa';
            feePct = 0.20;
            feeFixed = (finalPrice * 0.50) + extraCpf;
          } else {
            finalPrice = p1;
            tierName = 'Até R$ 79,99: 20% + R$ 4,50';
            feePct = 0.20;
            feeFixed = 4.50 + extraCpf;
          }
        } else {
          finalPrice = p1;
          tierName = 'Até R$ 79,99: 20% + R$ 4,50';
          feePct = 0.20;
          feeFixed = 4.50 + extraCpf;
        }
      }
    }

    // Tentativa 2: Faixa 2 (R$ 80,00 a R$ 99,99) -> 14% + R$ 16,00
    if (!finalPrice) {
      const denom2 = 1.0 - (0.14 + t + m + aff);
      if (denom2 > 0) {
        const p2 = (directCost + 16.00 + extraCpf) / denom2;
        if (p2 >= 80.00 && p2 <= 99.99) {
          finalPrice = p2;
          tierName = 'R$ 80 a 99,99: 14% + R$ 16,00';
          feePct = 0.14;
          feeFixed = 16.00 + extraCpf;
        }
      }
    }

    // Tentativa 3: Faixa 3 (R$ 100,00 a R$ 199,99) -> 14% + R$ 20,00
    if (!finalPrice) {
      const denom3 = 1.0 - (0.14 + t + m + aff);
      if (denom3 > 0) {
        const p3 = (directCost + 20.00 + extraCpf) / denom3;
        if (p3 >= 100.00 && p3 <= 199.99) {
          finalPrice = p3;
          tierName = 'R$ 100 a 199,99: 14% + R$ 20,00';
          feePct = 0.14;
          feeFixed = 20.00 + extraCpf;
        }
      }
    }

    // Tentativa 4: Faixa 4 (A partir de R$ 200,00) -> 14% + R$ 26,00
    if (!finalPrice) {
      const denom4 = 1.0 - (0.14 + t + m + aff);
      if (denom4 > 0) {
        finalPrice = (directCost + 26.00 + extraCpf) / denom4;
        tierName = 'Acima de R$ 200: 14% + R$ 26,00';
        feePct = 0.14;
        feeFixed = 26.00 + extraCpf;
      }
    }

    if (!finalPrice || finalPrice < 0) {
      finalPrice = directCost * 2.0;
      tierName = 'Estimativa de Segurança';
      feePct = 0.20;
      feeFixed = 4.50;
    }

    let displayPrice = finalPrice;
    if (rounding === '90') {
      const inteiro = Math.floor(finalPrice);
      displayPrice = inteiro + 0.90;
      if (displayPrice < finalPrice) displayPrice += 1.0;
    } else if (rounding === '99') {
      const inteiro = Math.floor(finalPrice);
      displayPrice = inteiro + 0.99;
      if (displayPrice < finalPrice) displayPrice += 1.0;
    }

    return getFinancialBreakdown(displayPrice, cost, packaging, taxPct, sellerType, tierName, extraAffiliatePct);
  }

  function getFinancialBreakdown(salePrice, cost, packaging, taxPct, sellerType, optionalTierName, affiliatePct = 0) {
    const extraCpf = sellerType === 'cpf_high_volume' ? 3.0 : 0.0;
    let feePct = 0.20;
    let feeFixed = 4.50 + extraCpf;
    let tierName = optionalTierName;

    if (!tierName) {
      if (salePrice < 9.00) {
        feePct = 0.20;
        feeFixed = (salePrice * 0.50) + extraCpf;
        tierName = 'Sub R$ 9: 20% + 50% taxa fixa';
      } else if (salePrice <= 79.99) {
        feePct = 0.20;
        feeFixed = 4.50 + extraCpf;
        tierName = 'Até R$ 79,99: 20% + R$ 4,50';
      } else if (salePrice <= 99.99) {
        feePct = 0.14;
        feeFixed = 16.00 + extraCpf;
        tierName = 'R$ 80 a 99,99: 14% + R$ 16,00';
      } else if (salePrice <= 199.99) {
        feePct = 0.14;
        feeFixed = 20.00 + extraCpf;
        tierName = 'R$ 100 a 199,99: 14% + R$ 20,00';
      } else {
        feePct = 0.14;
        feeFixed = 26.00 + extraCpf;
        tierName = 'Acima de R$ 200: 14% + R$ 26,00';
      }
    }

    const shopeePctVal = salePrice * feePct;
    const shopeeTotalFee = shopeePctVal + feeFixed;
    const taxVal = salePrice * (taxPct / 100.0);
    const affiliateVal = salePrice * (affiliatePct / 100.0);
    const repasseShopee = salePrice - shopeeTotalFee;
    const lucroLiquido = repasseShopee - packaging - cost - taxVal - affiliateVal;
    const margemRealPct = salePrice > 0 ? (lucroLiquido / salePrice * 100.0) : 0.0;
    const totalCustos = cost + packaging;
    const markupRealPct = totalCustos > 0 ? (lucroLiquido / totalCustos * 100.0) : 0.0;

    return {
      precoVenda: salePrice,
      custoProduto: cost,
      custoEmbalagem: packaging,
      taxaPercentualPct: feePct * 100.0,
      taxaPercentualVal: shopeePctVal,
      taxaFixaVal: feeFixed,
      taxaShopeeTotal: shopeeTotalFee,
      impostoPct: taxPct,
      impostoVal: taxVal,
      affiliatePct: affiliatePct,
      affiliateVal: affiliateVal,
      repasseShopee: repasseShopee,
      lucroLiquido: lucroLiquido,
      margemRealPct: margemRealPct,
      markupRealPct: markupRealPct,
      tierName: tierName
    };
  }

  // =========================================================================
  // SIMULADOR INDIVIDUAL SHOPEE (Interface)
  // =========================================================================
  function initShopeeSimulator() {
    if (state.data?.itens_detalhados && state.data.itens_detalhados.length > 0) {
      const firstWithStock = state.data.itens_detalhados.find(it => it.estoque > 0 && it.custo > 0) || state.data.itens_detalhados[0];
      selectShopeeProduct(firstWithStock.sku);
    } else {
      updateShopeeSimulator();
    }
  }

  function populateShopeeProductsSelect() {
    if (!elements.simProductSelect || !state.data?.itens_detalhados) return;

    let html = '<option value="">-- Escolha um produto da loja para preencher --</option>';
    state.data.itens_detalhados.forEach(it => {
      const stockBadge = it.estoque > 0 ? `(${it.estoque} un)` : '(Zerado)';
      const nomeCurto = it.nome.length > 40 ? it.nome.slice(0, 40) + '...' : it.nome;
      html += `
        <option value="${escapeHtml(it.sku)}">
          ${escapeHtml(it.sku)} - ${escapeHtml(nomeCurto)} [${escapeHtml(it.variacao)}] - Custo R$ ${it.custo.toFixed(2)} ${stockBadge}
        </option>
      `;
    });

    elements.simProductSelect.innerHTML = html;
  }

  function selectShopeeProduct(sku) {
    if (!state.data?.itens_detalhados) return;
    const product = state.data.itens_detalhados.find(p => p.sku === sku);
    if (!product) return;

    state.shopee.selectedProductSku = sku;
    if (elements.simProductSelect) elements.simProductSelect.value = sku;

    if (elements.simProductSearch) {
      elements.simProductSearch.value = `${product.nome} [${product.variacao || 'Padrão'}] (SKU: ${product.sku})`;
    }
    if (elements.simSearchClear) {
      elements.simSearchClear.style.display = 'block';
    }
    if (elements.simAutocompleteList) {
      elements.simAutocompleteList.style.display = 'none';
    }

    if (elements.simProductPreview) {
      elements.simProductPreview.style.display = 'flex';
      elements.simProductImg.src = product.img || PLACEHOLDER_IMG;
      elements.simProductName.textContent = `${product.nome} (${product.variacao})`;
      elements.simProductCat.textContent = `SKU: ${product.sku} | Categoria: ${product.categoria}`;
      elements.simProductStorePrice.textContent = `Preço atual na Loja Integrada: ${fmtCurrency.format(product.preco_venda)}`;
    }

    if (elements.simCostInput) {
      elements.simCostInput.value = product.custo.toFixed(2);
    }

    if (elements.simManualPrice) {
      elements.simManualPrice.value = '';
    }

    updateShopeeSimulator();
  }

  function updateShopeeSimulator() {
    const cost = parseFloat(elements.simCostInput?.value) || 0;
    const packaging = parseFloat(elements.shopeeCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.shopeeCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.shopeeCfgTax?.value) || 0.0;
    const sellerType = elements.shopeeCfgSellerType?.value || 'cnpj';
    const rounding = elements.shopeeCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.simPromoDiscountInput?.value) ?? (parseFloat(elements.shopeeCfgPromoDiscount?.value) || 30.0);

    if (elements.simPackInput) elements.simPackInput.value = packaging.toFixed(2);
    if (elements.massMarginLabel) elements.massMarginLabel.textContent = `${marginPct}%`;
    if (elements.massPackLabel) elements.massPackLabel.textContent = fmtCurrency.format(packaging);

    const manualPriceVal = parseFloat(elements.simManualPrice?.value);
    let baseResult;
    let pricingPair;

    if (manualPriceVal && manualPriceVal > 0) {
      baseResult = getFinancialBreakdown(manualPriceVal, cost, packaging, taxPct, sellerType);
      const rawCad = discountPromo > 0 ? manualPriceVal / (1.0 - (discountPromo / 100.0)) : manualPriceVal;
      const precoCadastro = applyPriceRounding(rawCad, rounding);
      const descReais = Math.max(0, precoCadastro - manualPriceVal);
      const descEff = precoCadastro > 0 ? (descReais / precoCadastro * 100.0) : 0;
      pricingPair = {
        precoCadastro,
        precoComDesconto: manualPriceVal,
        descontoReais: descReais,
        descontoEfetivoPct: descEff,
        discountPromoPct: discountPromo,
        breakdown: baseResult
      };
      if (elements.simResultTitle) elements.simResultTitle.textContent = 'Simulação de Preço Digitado';
    } else {
      pricingPair = calcShopeePricingPair(cost, packaging, marginPct, taxPct, sellerType, rounding, discountPromo);
      baseResult = pricingPair.breakdown;
      if (elements.simResultTitle) elements.simResultTitle.textContent = 'Preço de Venda Sugerido na Shopee';
    }

    renderSimulatorResults(baseResult, pricingPair);
    updateAffiliateSimulation(baseResult, cost, packaging, marginPct, taxPct, sellerType, rounding);
  }

  function renderSimulatorResults(res, pair) {
    if (elements.simDisplayPrice) elements.simDisplayPrice.textContent = fmtCurrency.format(pair ? pair.precoComDesconto : res.precoVenda);
    if (elements.simDisplayCadPrice) elements.simDisplayCadPrice.textContent = fmtCurrency.format(pair ? pair.precoCadastro : res.precoVenda);
    if (elements.simDisplayPromoPrice) elements.simDisplayPromoPrice.textContent = fmtCurrency.format(pair ? pair.precoComDesconto : res.precoVenda);
    if (elements.simDisplayPromoBadge) {
      const disc = pair ? pair.descontoEfetivoPct : 30;
      elements.simDisplayPromoBadge.textContent = `2. Preço c/ Desconto (-${disc.toFixed(0)}%)`;
    }
    if (elements.simDisplayTier) elements.simDisplayTier.textContent = `Regra Shopee: ${res.tierName}`;

    // Comparativo com a Loja Integrada
    if (state.shopee.selectedProductSku && state.data?.itens_detalhados) {
      const prod = state.data.itens_detalhados.find(p => p.sku === state.shopee.selectedProductSku);
      if (prod && prod.preco_venda > 0) {
        const salePrice = pair ? pair.precoComDesconto : res.precoVenda;
        const diff = salePrice - prod.preco_venda;
        const diffPct = (diff / prod.preco_venda) * 100;
        const diffSign = diff >= 0 ? '+' : '';
        const colorClass = diff >= 0 ? '#10b981' : '#f59e0b';
        elements.simComparisonBadge.innerHTML = `
          <span style="font-size: 0.75rem; font-weight: 600; color: ${colorClass}; background: var(--bg-surface); padding: 3px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
            Loja Própria: ${fmtCurrency.format(prod.preco_venda)} (${diffSign}${fmtCurrency.format(diff)} / ${diffSign}${diffPct.toFixed(1)}%)
          </span>
        `;
      } else {
        elements.simComparisonBadge.innerHTML = '';
      }
    } else {
      elements.simComparisonBadge.innerHTML = '';
    }

    // DRE
    if (elements.dreCadVal) elements.dreCadVal.textContent = fmtCurrency.format(pair ? pair.precoCadastro : res.precoVenda);
    if (elements.drePromoDiscountRow) {
      if (pair && pair.descontoReais > 0) {
        elements.drePromoDiscountRow.style.display = 'flex';
        if (elements.drePromoDiscountPct) elements.drePromoDiscountPct.textContent = `${pair.descontoEfetivoPct.toFixed(1)}%`;
        if (elements.drePromoDiscountVal) elements.drePromoDiscountVal.textContent = `-${fmtCurrency.format(pair.descontoReais)}`;
      } else {
        elements.drePromoDiscountRow.style.display = 'none';
      }
    }

    if (elements.dreVenda) elements.dreVenda.textContent = fmtCurrency.format(res.precoVenda);
    if (elements.dreShopeePct) elements.dreShopeePct.textContent = `${res.taxaPercentualPct.toFixed(0)}%`;
    if (elements.dreShopeePctVal) elements.dreShopeePctVal.textContent = `-${fmtCurrency.format(res.taxaPercentualVal)}`;
    if (elements.dreShopeeFixVal) elements.dreShopeeFixVal.textContent = `-${fmtCurrency.format(res.taxaFixaVal)}`;
    if (elements.drePackVal) elements.drePackVal.textContent = `-${fmtCurrency.format(res.custoEmbalagem)}`;
    if (elements.dreCostVal) elements.dreCostVal.textContent = `-${fmtCurrency.format(res.custoProduto)}`;

    if (elements.dreTaxRow) {
      if (res.impostoPct > 0) {
        elements.dreTaxRow.style.display = 'flex';
        elements.dreTaxPct.textContent = `${res.impostoPct}%`;
        elements.dreTaxVal.textContent = `-${fmtCurrency.format(res.impostoVal)}`;
      } else {
        elements.dreTaxRow.style.display = 'none';
      }
    }

    if (elements.dreRepasse) elements.dreRepasse.textContent = fmtCurrency.format(res.repasseShopee);
    if (elements.dreLucro) {
      elements.dreLucro.textContent = `${fmtCurrency.format(res.lucroLiquido)} (${res.margemRealPct.toFixed(1)}%)`;
      elements.dreLucro.style.color = res.lucroLiquido >= 0 ? 'var(--success-text)' : 'var(--danger-text)';
    }

    // Gráfico de Barras de Composição
    if (res.precoVenda > 0) {
      const pctCost = Math.max(0, (res.custoProduto / res.precoVenda) * 100);
      const pctPack = Math.max(0, (res.custoEmbalagem / res.precoVenda) * 100);
      const pctShopee = Math.max(0, (res.taxaShopeeTotal / res.precoVenda) * 100);
      const pctTax = Math.max(0, (res.impostoVal / res.precoVenda) * 100);
      const pctProfit = Math.max(0, (res.lucroLiquido / res.precoVenda) * 100);

      if (elements.barCost) elements.barCost.style.width = `${pctCost.toFixed(1)}%`;
      if (elements.barPack) elements.barPack.style.width = `${pctPack.toFixed(1)}%`;
      if (elements.barShopee) elements.barShopee.style.width = `${pctShopee.toFixed(1)}%`;
      if (elements.barTax) elements.barTax.style.width = `${pctTax.toFixed(1)}%`;
      if (elements.barProfit) elements.barProfit.style.width = `${pctProfit.toFixed(1)}%`;

      if (elements.breakdownSummary) {
        elements.breakdownSummary.textContent = `Taxas Shopee: ${pctShopee.toFixed(1)}% | Custos: ${(pctCost + pctPack).toFixed(1)}% | Lucro: ${pctProfit.toFixed(1)}%`;
      }
    }
  }

  // =========================================================================
  // MOTOR DE AFILIADOS (Análise de Margem & Cenários)
  // =========================================================================
  function setupAffiliateEventListeners() {
    // Alternância de modo (Absorver vs Repassar)
    if (elements.affModeAbsorb && elements.affModeRepass) {
      elements.affModeAbsorb.addEventListener('click', () => {
        elements.affModeAbsorb.classList.add('active');
        elements.affModeRepass.classList.remove('active');
        state.shopee.affiliate.mode = 'absorb';
        updateAffiliateStrategyDescription();
        updateShopeeSimulator();
      });

      elements.affModeRepass.addEventListener('click', () => {
        elements.affModeRepass.classList.add('active');
        elements.affModeAbsorb.classList.remove('active');
        state.shopee.affiliate.mode = 'repass';
        updateAffiliateStrategyDescription();
        updateShopeeSimulator();
      });
    }

    // Input de % testado
    if (elements.affTestedPct) {
      elements.affTestedPct.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.shopee.affiliate.testedPct = val;
        syncQuickPctButtons(val);
        updateShopeeSimulator();
      });
    }

    // Input de Margem Mínima
    if (elements.affMinMargin) {
      elements.affMinMargin.addEventListener('input', (e) => {
        state.shopee.affiliate.minMarginPct = parseFloat(e.target.value) || 10.0;
        updateShopeeSimulator();
        renderShopeeTable();
      });
    }

    // Botões de porcentagem rápida
    elements.quickPctBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-pct'));
        state.shopee.affiliate.testedPct = val;
        if (elements.affTestedPct) elements.affTestedPct.value = val;
        syncQuickPctButtons(val);
        updateShopeeSimulator();
      });
    });
  }

  function syncQuickPctButtons(val) {
    elements.quickPctBtns.forEach(b => {
      const bVal = parseFloat(b.getAttribute('data-pct'));
      b.classList.toggle('active', bVal === val);
    });
  }

  function updateAffiliateStrategyDescription() {
    if (!elements.affStrategyDesc) return;
    if (state.shopee.affiliate.mode === 'absorb') {
      elements.affStrategyDesc.innerHTML = `
        <strong>Estratégia: Absorver na Margem</strong><br>
        O preço de venda na Shopee permanece fixo. A comissão do afiliado é deduzida da sua margem atual em cada venda por link.
      `;
    } else {
      elements.affStrategyDesc.innerHTML = `
        <strong>Estratégia: Repassar no Preço de Venda</strong><br>
        O preço na Shopee é recalculado para cima, garantindo que mesmo após pagar o afiliado você mantenha exatamente 100% da sua margem líquida configurada.
      `;
    }
  }

  function updateAffiliateSimulation(baseResult, cost, packaging, marginPct, taxPct, sellerType, rounding) {
    const testedPct = state.shopee.affiliate.testedPct;
    const minMarginPct = state.shopee.affiliate.minMarginPct;
    const mode = state.shopee.affiliate.mode;

    if (elements.affTestedValLabel) {
      elements.affTestedValLabel.textContent = `${testedPct.toFixed(1)}%`;
    }

    // 1. Teto Máximo Viável de Comissão (para manter pelo menos minMarginPct de margem)
    // Teto % = Margem Atual - Margem Mínima
    const maxViablePct = Math.max(0, baseResult.margemRealPct - minMarginPct);
    const maxViableVal = baseResult.precoVenda * (maxViablePct / 100.0);

    if (elements.affKpiMaxPct) elements.affKpiMaxPct.textContent = `${maxViablePct.toFixed(1)}%`;
    if (elements.affKpiMaxVal) {
      elements.affKpiMaxVal.textContent = `Até ${fmtCurrency.format(maxViableVal)}/un para manter ${minMarginPct.toFixed(1)}% de margem`;
    }

    // 2. Simulação do Cenário Ativo
    let activePrice = baseResult.precoVenda;
    let affVal = 0;
    let profitRemaining = 0;
    let marginRemaining = 0;

    if (mode === 'absorb') {
      activePrice = baseResult.precoVenda;
      affVal = activePrice * (testedPct / 100.0);
      profitRemaining = baseResult.lucroLiquido - affVal;
      marginRemaining = activePrice > 0 ? (profitRemaining / activePrice * 100.0) : 0;
    } else {
      // Repassa no preço: calcula preço novo embutindo testedPct
      const repassCalc = calcShopeePrice(cost, packaging, marginPct, taxPct, sellerType, rounding, testedPct);
      activePrice = repassCalc.precoVenda;
      affVal = activePrice * (testedPct / 100.0);
      profitRemaining = repassCalc.lucroLiquido;
      marginRemaining = repassCalc.margemRealPct;
    }

    if (elements.affKpiAffVal) elements.affKpiAffVal.textContent = fmtCurrency.format(affVal);
    if (elements.affKpiAffPct) {
      elements.affKpiAffPct.textContent = `${testedPct.toFixed(1)}% de comissão (${mode === 'absorb' ? 'absorvido' : 'repassado no preço'})`;
    }

    if (elements.affKpiProfitVal) {
      elements.affKpiProfitVal.textContent = fmtCurrency.format(profitRemaining);
      elements.affKpiProfitVal.style.color = profitRemaining >= 0 ? '#2563eb' : '#ef4444';
    }
    if (elements.affKpiProfitPct) {
      elements.affKpiProfitPct.textContent = `Margem final no bolso: ${marginRemaining.toFixed(1)}%`;
    }

    // 3. Veredito de Viabilidade
    renderAffiliateVerdict(marginRemaining, minMarginPct);

    // 4. Renderiza Tabela de Cenários (0%, 3%, 5%, 8%, 10%, 12%, 15%, 20%)
    renderAffiliateScenariosTable(baseResult, cost, packaging, marginPct, taxPct, sellerType, rounding, minMarginPct, testedPct);
  }

  function renderAffiliateVerdict(marginRemaining, minMarginPct) {
    if (!elements.affKpiStatusPill || !elements.affKpiStatusSub) return;

    if (marginRemaining >= 15.0) {
      elements.affKpiStatusPill.className = 'risk-pill risk-safe';
      elements.affKpiStatusPill.innerHTML = '● Excelente &amp; Muito Seguro';
      elements.affKpiStatusSub.textContent = `Sua margem (${marginRemaining.toFixed(1)}%) é folgada e atrai muitos afiliados.`;
    } else if (marginRemaining >= minMarginPct) {
      elements.affKpiStatusPill.className = 'risk-pill risk-moderate';
      elements.affKpiStatusPill.innerHTML = '● Viável &amp; Dentro do Piso';
      elements.affKpiStatusSub.textContent = `Sua margem (${marginRemaining.toFixed(1)}%) atende ao piso seguro configurado (${minMarginPct.toFixed(1)}%).`;
    } else if (marginRemaining > 0) {
      elements.affKpiStatusPill.className = 'risk-pill risk-warning';
      elements.affKpiStatusPill.innerHTML = '● Alerta: Abaixo do Piso';
      elements.affKpiStatusSub.textContent = `Margem de ${marginRemaining.toFixed(1)}% compromete seu retorno financeiro mínimo.`;
    } else {
      elements.affKpiStatusPill.className = 'risk-pill risk-danger';
      elements.affKpiStatusPill.innerHTML = '● Prejuízo / Inviável';
      elements.affKpiStatusSub.textContent = 'Essa comissão faz a operação ter prejuízo por venda!';
    }
  }

  function renderAffiliateScenariosTable(baseResult, cost, packaging, marginPct, taxPct, sellerType, rounding, minMarginPct, testedPct) {
    if (!elements.affScenarioTbody) return;

    const testTiers = [0, 3, 5, 8, 10, 12, 15, 20];
    let rowsHtml = '';

    testTiers.forEach(pct => {
      const isSelected = Math.abs(pct - testedPct) < 0.01;
      const affVal = baseResult.precoVenda * (pct / 100.0);
      const profitAbsorb = baseResult.lucroLiquido - affVal;
      const marginAbsorb = baseResult.precoVenda > 0 ? (profitAbsorb / baseResult.precoVenda * 100.0) : 0;

      // Preço se repassar no preço
      const repassCalc = calcShopeePrice(cost, packaging, marginPct, taxPct, sellerType, rounding, pct);

      let riskBadge = '';
      if (marginAbsorb >= 15.0) {
        riskBadge = '<span class="risk-pill risk-safe">● Seguro</span>';
      } else if (marginAbsorb >= minMarginPct) {
        riskBadge = '<span class="risk-pill risk-moderate">● Aceitável</span>';
      } else if (marginAbsorb > 0) {
        riskBadge = '<span class="risk-pill risk-warning">● Risco</span>';
      } else {
        riskBadge = '<span class="risk-pill risk-danger">● Prejuízo</span>';
      }

      rowsHtml += `
        <tr class="${isSelected ? 'scenario-highlight' : ''}">
          <td>
            <strong>${pct}%</strong>
            ${pct === 0 ? '<span style="font-size: 0.7rem; color: var(--text-muted);">(Base)</span>' : ''}
            ${isSelected ? '<span style="font-size: 0.7rem; color: #8b5cf6; font-weight: 700;">★ Ativo</span>' : ''}
          </td>
          <td>${pct > 0 ? fmtCurrency.format(affVal) : 'R$ 0,00'}</td>
          <td>${fmtCurrency.format(baseResult.precoVenda)}</td>
          <td style="color: #ef4444;">${fmtCurrency.format(baseResult.taxaShopeeTotal)}</td>
          <td><strong style="color: ${profitAbsorb >= 0 ? 'var(--text-primary)' : '#ef4444'};">${fmtCurrency.format(profitAbsorb)}</strong></td>
          <td><span class="margin-pill" style="color: ${marginAbsorb >= minMarginPct ? 'var(--success-dot)' : '#ef4444'};">${marginAbsorb.toFixed(1)}%</span></td>
          <td>
            <span style="font-size: 0.8rem; color: #8b5cf6; font-weight: 600;">
              ${fmtCurrency.format(repassCalc.precoVenda)}
            </span>
          </td>
          <td style="text-align: center;">${riskBadge}</td>
        </tr>
      `;
    });

    elements.affScenarioTbody.innerHTML = rowsHtml;
  }

  // =========================================================================
  // TABELA DE PRECIFICAÇÃO EM MASSA (Todo o Catálogo)
  // =========================================================================
  function renderShopeeTable() {
    if (!elements.shopeeTableBody || !state.data?.itens_detalhados) return;

    const list = state.data.itens_detalhados;
    const search = state.shopee.tableSearch.toLowerCase().trim();
    const stockFilter = state.shopee.tableStockFilter;

    const packaging = parseFloat(elements.shopeeCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.shopeeCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.shopeeCfgTax?.value) || 0.0;
    const sellerType = elements.shopeeCfgSellerType?.value || 'cnpj';
    const rounding = elements.shopeeCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.shopeeCfgPromoDiscount?.value) || state.shopee.discountPromoPct || 30.0;
    const minMarginPct = state.shopee.affiliate.minMarginPct;

    const filtered = list.filter(item => {
      if (search) {
        const mNome = (item.nome || '').toLowerCase().includes(search);
        const mSku = (item.sku || '').toLowerCase().includes(search);
        const mVar = (item.variacao || '').toLowerCase().includes(search);
        if (!mNome && !mSku && !mVar) return false;
      }

      if (stockFilter === 'in_stock' && item.estoque <= 0) return false;
      if (stockFilter === 'zero' && item.estoque > 0) return false;

      return true;
    });

    if (elements.shopeeMassCount) {
      elements.shopeeMassCount.textContent = `${filtered.length} itens`;
    }

    const size = state.shopee.pageSize;
    const total = filtered.length;
    const totalPages = Math.ceil(total / size) || 1;
    const current = Math.min(state.shopee.currentPage, totalPages);
    const start = (current - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    if (pageItems.length === 0) {
      elements.shopeeTableBody.innerHTML = `
        <tr>
          <td colspan="14">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>Nenhum produto encontrado na Shopee</h3>
              <p>Tente ajustar a busca ou o filtro de estoque.</p>
            </div>
          </td>
        </tr>
      `;
      if (elements.shopeePaginationInfo) elements.shopeePaginationInfo.textContent = 'Nenhum item';
      if (elements.shopeePaginationPages) elements.shopeePaginationPages.innerHTML = '';
      return;
    }

    let rowsHtml = '';

    pageItems.forEach(item => {
      const pair = calcShopeePricingPair(item.custo, packaging, marginPct, taxPct, sellerType, rounding, discountPromo);
      const calc = pair.breakdown;
      const stockBadge = getStockBadgeClass(item.estoque);
      const imgSrc = item.img || PLACEHOLDER_IMG;

      // Teto de afiliado viável em R$ (para manter minMarginPct de margem)
      const maxAffPct = Math.max(0, calc.margemRealPct - minMarginPct);
      const maxAffVal = calc.precoVenda * (maxAffPct / 100.0);

      rowsHtml += `
        <tr>
          <td>
            <img src="${imgSrc}" class="product-thumb" alt="${escapeHtml(item.nome)}"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
                 onclick="openLightbox('${escapeHtml(imgSrc)}', '${escapeHtml(item.nome)}', '${escapeHtml(item.sku)}', ${item.estoque}, ${item.custo});">
          </td>
          <td>
            <div class="product-meta">
              <span class="product-title">${escapeHtml(item.nome)}</span>
              <span class="product-cat">${escapeHtml(item.categoria)}</span>
            </div>
          </td>
          <td>
            <span class="sku-tag">
              ${escapeHtml(item.sku)}
              <button class="sku-copy-btn" data-copy-sku="${escapeHtml(item.sku)}">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
              </button>
            </span>
          </td>
          <td>
            <span class="variation-badge">${escapeHtml(item.variacao)}</span>
          </td>
          <td>
            <span class="currency-cost">${fmtCurrency.format(item.custo)}</span>
          </td>
          <td>
            <span class="currency-sale">${fmtCurrency.format(item.preco_venda)}</span>
          </td>
          <td>
            <span style="color: #ef4444; font-weight: 600; font-size: 0.85rem;" title="${calc.tierName}">
              ${fmtCurrency.format(calc.taxaShopeeTotal)}
            </span>
          </td>
          <td style="background-color: rgba(238, 77, 45, 0.04);">
            <span style="font-weight: 600; color: var(--text-secondary); text-decoration: line-through;">
              ${fmtCurrency.format(pair.precoCadastro)}
            </span>
          </td>
          <td>
            <span class="price-shopee-cell">${fmtCurrency.format(pair.precoComDesconto)}</span>
            <span style="background: #ee4d2d; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-left: 3px;">
              -${pair.descontoEfetivoPct.toFixed(0)}%
            </span>
          </td>
          <td>
            <strong style="color: var(--success-text);">${fmtCurrency.format(calc.lucroLiquido)}</strong>
          </td>
          <td>
            <span class="margin-pill">${calc.margemRealPct.toFixed(1)}%</span>
          </td>
          <td>
            <span style="font-weight: 700; color: #8b5cf6; font-size: 0.85rem;" title="Comissão máxima para manter ${minMarginPct}% de margem">
              ${fmtCurrency.format(maxAffVal)} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${maxAffPct.toFixed(0)}%)</span>
            </span>
          </td>
          <td>
            <div class="stock-badge ${stockBadge}">
              <span class="stock-dot"></span>
              <span>${fmtNumber.format(item.estoque)} un</span>
            </div>
          </td>
          <td style="text-align: center;">
            <button class="btn btn-outline-shopee btn-sim-product" data-sim-sku="${escapeHtml(item.sku)}" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" title="Carregar no simulador">
              ⚡ Simular
            </button>
          </td>
        </tr>
      `;
    });

    elements.shopeeTableBody.innerHTML = rowsHtml;

    elements.shopeeTableBody.querySelectorAll('.btn-sim-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sim-sku');
        selectShopeeProduct(sku);
        window.scrollTo({ top: elements.shopeeCfgMargin ? elements.shopeeCfgMargin.offsetTop - 120 : 0, behavior: 'smooth' });
        showToast(`Produto ${sku} carregado no simulador!`, 'success');
      });
    });

    elements.shopeeTableBody.querySelectorAll('[data-copy-sku]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copySku(btn.getAttribute('data-copy-sku'));
      });
    });

    const startNum = start + 1;
    const endNum = Math.min(start + size, total);
    if (elements.shopeePaginationInfo) {
      elements.shopeePaginationInfo.textContent = `Mostrando ${startNum}–${endNum} de ${total} produtos na Shopee`;
    }

    renderShopeePagination(totalPages, current);
  }

  function renderShopeePagination(totalPages, current) {
    if (!elements.shopeePaginationPages) return;

    if (totalPages <= 1) {
      elements.shopeePaginationPages.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${current === 1 ? 'disabled' : ''} data-shopee-page="${current - 1}">&laquo;</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 8 && Math.abs(p - current) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) {
          html += '<span style="padding: 0 4px; color: var(--text-muted);">...</span>';
        }
        continue;
      }
      html += `
        <button class="page-btn ${p === current ? 'active' : ''}" data-shopee-page="${p}">${p}</button>
      `;
    }

    html += `
      <button class="page-btn" ${current === totalPages ? 'disabled' : ''} data-shopee-page="${current + 1}">&raquo;</button>
    `;

    elements.shopeePaginationPages.innerHTML = html;

    elements.shopeePaginationPages.querySelectorAll('[data-shopee-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-shopee-page'));
        if (page && page !== state.shopee.currentPage) {
          state.shopee.currentPage = page;
          renderShopeeTable();
        }
      });
    });
  }

  // =========================================================================
  // Exportar Tabela Shopee para CSV / Excel
  // =========================================================================
  function exportShopeeToCsv() {
    if (!state.data?.itens_detalhados) {
      showToast('Nenhum dado disponível para exportação.', 'warning');
      return;
    }

    const packaging = parseFloat(elements.shopeeCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.shopeeCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.shopeeCfgTax?.value) || 0.0;
    const sellerType = elements.shopeeCfgSellerType?.value || 'cnpj';
    const rounding = elements.shopeeCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.shopeeCfgPromoDiscount?.value) || state.shopee.discountPromoPct || 30.0;
    const minMarginPct = state.shopee.affiliate.minMarginPct;

    const headers = [
      'SKU', 'SKU Pai', 'Produto', 'Variação / Tamanho', 'Categoria',
      'Preço Custo', 'Embalagem', 'Preço Loja Integrada',
      'Taxa Percentual Shopee (%)', 'Taxa Fixa Shopee (R$)', 'Total Taxas Shopee (R$)',
      'Preço Cadastro Shopee Âncora (R$)', 'Desconto Promo (%)', 'Preço com Desconto Shopee (R$)',
      'Repasse Shopee (R$)', 'Lucro Líquido (R$)', 'Margem Real (%)',
      'Teto Afiliado %', 'Teto Afiliado R$', 'Regra Aplicada', 'Estoque Atual'
    ];

    const rowsData = state.data.itens_detalhados.map(item => {
      const pair = calcShopeePricingPair(item.custo, packaging, marginPct, taxPct, sellerType, rounding, discountPromo);
      const calc = pair.breakdown;
      const maxAffPct = Math.max(0, calc.margemRealPct - minMarginPct);
      const maxAffVal = calc.precoVenda * (maxAffPct / 100.0);

      return [
        item.sku,
        item.sku_pai || '',
        `"${(item.nome || '').replace(/"/g, '""')}"`,
        `"${(item.variacao || '').replace(/"/g, '""')}"`,
        `"${(item.categoria || '').replace(/"/g, '""')}"`,
        item.custo.toFixed(2),
        packaging.toFixed(2),
        item.preco_venda.toFixed(2),
        calc.taxaPercentualPct.toFixed(1),
        calc.taxaFixaVal.toFixed(2),
        calc.taxaShopeeTotal.toFixed(2),
        pair.precoCadastro.toFixed(2),
        pair.descontoEfetivoPct.toFixed(1),
        pair.precoComDesconto.toFixed(2),
        calc.repasseShopee.toFixed(2),
        calc.lucroLiquido.toFixed(2),
        calc.margemRealPct.toFixed(1),
        maxAffPct.toFixed(1),
        maxAffVal.toFixed(2),
        `"${calc.tierName}"`,
        item.estoque
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rowsData.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shopee_afiliados_precificacao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Tabela Shopee & Afiliados exportada com sucesso!', 'success');
  }

  // =========================================================================
  // MOTOR DE CÁLCULO TIKTOK SHOP BRASIL 2026
  // =========================================================================
  function calcTikTokPrice(cost, packaging, marginPct, taxPct, sellerRegime, rounding, extraAffiliatePct = 0) {
    const directCost = cost + packaging;
    const m = marginPct / 100.0;
    const t = taxPct / 100.0;
    const aff = extraAffiliatePct / 100.0;
    const isNewSeller = sellerRegime === 'new_seller';

    let finalPrice = 0;
    let tierName = '';

    // Faixa 1: Sub R$ 50,00 -> 10% (0% novo vendedor) + R$ 4,00
    const feePct1 = isNewSeller ? 0.0 : 0.10;
    const denom1 = 1.0 - (feePct1 + t + m + aff);
    if (denom1 > 0) {
      const p1 = (directCost + 4.00) / denom1;
      if (p1 < 50.00) {
        finalPrice = p1;
        tierName = isNewSeller ? 'Sub R$ 50 (Novo Vendedor): 0% + R$ 4,00' : 'Sub R$ 50: 10% + R$ 4,00';
      }
    }

    // Faixa 2: A partir de R$ 50,00 -> 6% (0% novo vendedor) + R$ 6,00
    if (!finalPrice) {
      const feePct2 = isNewSeller ? 0.0 : 0.06;
      const denom2 = 1.0 - (feePct2 + t + m + aff);
      if (denom2 > 0) {
        const p2 = (directCost + 6.00) / denom2;
        finalPrice = p2;
        tierName = isNewSeller ? 'A partir de R$ 50 (Novo Vendedor): 0% + R$ 6,00' : 'A partir de R$ 50: 6% + R$ 6,00';
      }
    }

    if (!finalPrice || finalPrice < 0) {
      finalPrice = directCost * 1.8;
      tierName = 'Estimativa de Segurança';
    }

    let displayPrice = applyPriceRounding(finalPrice, rounding);
    return getTikTokFinancialBreakdown(displayPrice, cost, packaging, taxPct, sellerRegime, tierName, extraAffiliatePct);
  }

  function getTikTokFinancialBreakdown(salePrice, cost, packaging, taxPct, sellerRegime, optionalTierName, affiliatePct = 0) {
    const isNewSeller = sellerRegime === 'new_seller';
    let feePct = 0.10;
    let feeFixed = 4.00;
    let tierName = optionalTierName;

    if (salePrice < 50.00) {
      feePct = isNewSeller ? 0.0 : 0.10;
      feeFixed = 4.00;
      if (!tierName) tierName = isNewSeller ? 'Sub R$ 50 (Novo Vendedor): 0% + R$ 4,00' : 'Sub R$ 50: 10% + R$ 4,00';
    } else {
      feePct = isNewSeller ? 0.0 : 0.06;
      feeFixed = 6.00;
      if (!tierName) tierName = isNewSeller ? 'A partir de R$ 50 (Novo Vendedor): 0% + R$ 6,00' : 'A partir de R$ 50: 6% + R$ 6,00';
    }

    const tiktokPctVal = salePrice * feePct;
    const tiktokTotalFee = tiktokPctVal + feeFixed;
    const taxVal = salePrice * (taxPct / 100.0);
    const affiliateVal = salePrice * (affiliatePct / 100.0);
    const repasseTikTok = salePrice - tiktokTotalFee;
    const lucroLiquido = repasseTikTok - packaging - cost - taxVal - affiliateVal;
    const margemRealPct = salePrice > 0 ? (lucroLiquido / salePrice * 100.0) : 0.0;
    const totalCustos = cost + packaging;
    const markupRealPct = totalCustos > 0 ? (lucroLiquido / totalCustos * 100.0) : 0.0;

    return {
      precoVenda: salePrice,
      custoProduto: cost,
      custoEmbalagem: packaging,
      taxaPercentualPct: feePct * 100.0,
      taxaPercentualVal: tiktokPctVal,
      taxaFixaVal: feeFixed,
      taxaTikTokTotal: tiktokTotalFee,
      impostoPct: taxPct,
      impostoVal: taxVal,
      affiliatePct: affiliatePct,
      affiliateVal: affiliateVal,
      repasseTikTok: repasseTikTok,
      lucroLiquido: lucroLiquido,
      margemRealPct: margemRealPct,
      markupRealPct: markupRealPct,
      tierName: tierName
    };
  }

  function calcTikTokPricingPair(cost, packaging, marginPct, taxPct, sellerRegime, rounding, discountPromoPct = 30.0, extraAffiliatePct = 0) {
    const promoBreakdown = calcTikTokPrice(cost, packaging, marginPct, taxPct, sellerRegime, rounding, extraAffiliatePct);
    const precoComDesconto = promoBreakdown.precoVenda;

    let precoCadastro = precoComDesconto;
    let descontoReais = 0;
    let descontoEfetivoPct = 0;

    const disc = parseFloat(discountPromoPct);
    if (!isNaN(disc) && disc > 0 && disc < 100) {
      const rawCad = precoComDesconto / (1.0 - (disc / 100.0));
      precoCadastro = applyPriceRounding(rawCad, rounding);
      descontoReais = Math.max(0, precoCadastro - precoComDesconto);
      descontoEfetivoPct = precoCadastro > 0 ? (descontoReais / precoCadastro * 100.0) : 0;
    }

    return {
      precoCadastro,
      precoComDesconto,
      descontoReais,
      descontoEfetivoPct,
      discountPromoPct: disc || 0,
      breakdown: promoBreakdown
    };
  }

  function computeCatalogTikTokPrices() {
    if (!state.data) return;
    const packaging = parseFloat(elements.tiktokCfgPack?.value) || state.tiktok?.packagingCost || 1.50;
    const margin = parseFloat(elements.tiktokCfgMargin?.value) || state.tiktok?.marginPct || 20.0;
    const tax = parseFloat(elements.tiktokCfgTax?.value) || state.tiktok?.taxPct || 0.0;
    const sellerRegime = elements.tiktokCfgNewSeller?.value || state.tiktok?.sellerRegime || 'standard';
    const rounding = elements.tiktokCfgRounding?.value || state.tiktok?.rounding || 'none';
    const discountPromo = parseFloat(elements.tiktokCfgPromoDiscount?.value) || state.tiktok?.discountPromoPct || 30.0;

    if (state.data.itens_detalhados) {
      state.data.itens_detalhados.forEach(it => {
        const pair = calcTikTokPricingPair(it.custo, packaging, margin, tax, sellerRegime, rounding, discountPromo);
        it.preco_tiktok_cad = pair.precoCadastro;
        it.preco_tiktok_promo = pair.precoComDesconto;
        it.preco_tiktok = pair.precoComDesconto;
        it.tiktok_desc_pct = pair.descontoEfetivoPct;
      });
    }

    if (state.data.produtos_agrupados) {
      state.data.produtos_agrupados.forEach(grp => {
        const pairMin = calcTikTokPricingPair(grp.custo_min, packaging, margin, tax, sellerRegime, rounding, discountPromo);
        const pairMax = calcTikTokPricingPair(grp.custo_max, packaging, margin, tax, sellerRegime, rounding, discountPromo);
        grp.preco_tiktok_cad_min = pairMin.precoCadastro;
        grp.preco_tiktok_cad_max = pairMax.precoCadastro;
        grp.preco_tiktok_promo_min = pairMin.precoComDesconto;
        grp.preco_tiktok_promo_max = pairMax.precoComDesconto;
        grp.preco_tiktok_min = pairMin.precoComDesconto;
        grp.preco_tiktok_max = pairMax.precoComDesconto;
        grp.preco_tiktok = pairMin.precoComDesconto;
        grp.preco_tiktok_cad = pairMin.precoCadastro;
        grp.tiktok_desc_pct = pairMin.descontoEfetivoPct;

        if (grp.variacoes) {
          grp.variacoes.forEach(v => {
            const vPair = calcTikTokPricingPair(v.custo, packaging, margin, tax, sellerRegime, rounding, discountPromo);
            v.preco_tiktok_cad = vPair.precoCadastro;
            v.preco_tiktok_promo = vPair.precoComDesconto;
            v.preco_tiktok = vPair.precoComDesconto;
            v.tiktok_desc_pct = vPair.descontoEfetivoPct;
          });
        }
      });
    }
  }

  // =========================================================================
  // SIMULADOR INDIVIDUAL TIKTOK SHOP
  // =========================================================================
  function initTikTokSimulator() {
    if (state.data?.itens_detalhados && state.data.itens_detalhados.length > 0) {
      const firstWithStock = state.data.itens_detalhados.find(it => it.estoque > 0 && it.custo > 0) || state.data.itens_detalhados[0];
      selectTikTokProduct(firstWithStock.sku);
    } else {
      updateTikTokSimulator();
    }
  }

  function selectTikTokProduct(sku) {
    if (!state.data?.itens_detalhados) return;
    const product = state.data.itens_detalhados.find(p => p.sku === sku);
    if (!product) return;

    state.tiktok.selectedProductSku = sku;

    if (elements.tiktokSimProductSearch) {
      elements.tiktokSimProductSearch.value = `${product.nome} [${product.variacao || 'Padrão'}] (SKU: ${product.sku})`;
    }
    if (elements.tiktokSimSearchClear) {
      elements.tiktokSimSearchClear.style.display = 'block';
    }
    if (elements.tiktokSimAutocompleteList) {
      elements.tiktokSimAutocompleteList.style.display = 'none';
    }

    if (elements.tiktokSimProductPreview) {
      elements.tiktokSimProductPreview.style.display = 'flex';
      elements.tiktokSimProductImg.src = product.img || PLACEHOLDER_IMG;
      elements.tiktokSimProductName.textContent = `${product.nome} (${product.variacao})`;
      elements.tiktokSimProductCat.textContent = `SKU: ${product.sku} | Categoria: ${product.categoria}`;
      elements.tiktokSimProductStorePrice.textContent = `Loja Integrada: ${fmtCurrency.format(product.preco_venda)}`;
      if (elements.tiktokSimProductShopeePrice) {
        const shopeePair = calcShopeePricingPair(product.custo, 1.50, 20.0, 0.0, 'cnpj', 'none', 30.0);
        elements.tiktokSimProductShopeePrice.textContent = `Shopee (Promo): ${fmtCurrency.format(shopeePair.precoComDesconto)}`;
      }
    }

    if (elements.tiktokSimCostInput) {
      elements.tiktokSimCostInput.value = product.custo.toFixed(2);
    }

    if (elements.tiktokSimManualPrice) {
      elements.tiktokSimManualPrice.value = '';
    }

    updateTikTokSimulator();
  }

  function updateTikTokSimulator() {
    const cost = parseFloat(elements.tiktokSimCostInput?.value) || 0;
    const packaging = parseFloat(elements.tiktokCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.tiktokCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.tiktokCfgTax?.value) || 0.0;
    const sellerRegime = elements.tiktokCfgNewSeller?.value || 'standard';
    const rounding = elements.tiktokCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.tiktokSimPromoDiscountInput?.value) ?? (parseFloat(elements.tiktokCfgPromoDiscount?.value) || 30.0);

    if (elements.tiktokSimPackInput) elements.tiktokSimPackInput.value = packaging.toFixed(2);
    if (elements.tiktokMassMarginLabel) elements.tiktokMassMarginLabel.textContent = `${marginPct}%`;
    if (elements.tiktokMassPackLabel) elements.tiktokMassPackLabel.textContent = fmtCurrency.format(packaging);

    const manualPriceVal = parseFloat(elements.tiktokSimManualPrice?.value);
    let baseResult;
    let pricingPair;

    if (manualPriceVal && manualPriceVal > 0) {
      baseResult = getTikTokFinancialBreakdown(manualPriceVal, cost, packaging, taxPct, sellerRegime);
      const rawCad = discountPromo > 0 ? manualPriceVal / (1.0 - (discountPromo / 100.0)) : manualPriceVal;
      const precoCadastro = applyPriceRounding(rawCad, rounding);
      const descReais = Math.max(0, precoCadastro - manualPriceVal);
      const descEff = precoCadastro > 0 ? (descReais / precoCadastro * 100.0) : 0;
      pricingPair = {
        precoCadastro,
        precoComDesconto: manualPriceVal,
        descontoReais: descReais,
        descontoEfetivoPct: descEff,
        discountPromoPct: discountPromo,
        breakdown: baseResult
      };
    } else {
      pricingPair = calcTikTokPricingPair(cost, packaging, marginPct, taxPct, sellerRegime, rounding, discountPromo);
      baseResult = pricingPair.breakdown;
    }

    renderTikTokSimulatorResults(baseResult, pricingPair);
    updateTikTokAffiliateSimulation(baseResult, cost, packaging, marginPct, taxPct, sellerRegime, rounding);
  }

  function renderTikTokSimulatorResults(res, pair) {
    if (elements.tiktokSimDisplayCadPrice) elements.tiktokSimDisplayCadPrice.textContent = fmtCurrency.format(pair ? pair.precoCadastro : res.precoVenda);
    if (elements.tiktokSimDisplayPromoPrice) elements.tiktokSimDisplayPromoPrice.textContent = fmtCurrency.format(pair ? pair.precoComDesconto : res.precoVenda);
    if (elements.tiktokSimDisplayPromoBadge) {
      const disc = pair ? pair.descontoEfetivoPct : 30;
      elements.tiktokSimDisplayPromoBadge.textContent = `2. Preço c/ Desconto (-${disc.toFixed(0)}%)`;
    }
    if (elements.tiktokSimDisplayTier) elements.tiktokSimDisplayTier.textContent = `Regra TikTok: ${res.tierName}`;

    // Comparativo com a Loja Integrada e Shopee
    if (state.tiktok.selectedProductSku && state.data?.itens_detalhados) {
      const prod = state.data.itens_detalhados.find(p => p.sku === state.tiktok.selectedProductSku);
      const salePrice = pair ? pair.precoComDesconto : res.precoVenda;

      if (prod && prod.preco_venda > 0 && elements.tiktokSimComparisonBadge) {
        const diff = salePrice - prod.preco_venda;
        const diffPct = (diff / prod.preco_venda) * 100;
        const diffSign = diff >= 0 ? '+' : '';
        const colorClass = diff >= 0 ? '#10b981' : '#f59e0b';
        elements.tiktokSimComparisonBadge.innerHTML = `
          <span style="font-size: 0.75rem; font-weight: 600; color: ${colorClass}; background: var(--bg-surface); padding: 3px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
            Loja Própria: ${fmtCurrency.format(prod.preco_venda)} (${diffSign}${fmtCurrency.format(diff)} / ${diffSign}${diffPct.toFixed(1)}%)
          </span>
        `;
      } else if (elements.tiktokSimComparisonBadge) {
        elements.tiktokSimComparisonBadge.innerHTML = '';
      }

      if (prod && elements.tiktokSimVsShopeeBadge) {
        const shopeePair = calcShopeePricingPair(prod.custo, 1.50, 20.0, 0.0, 'cnpj', 'none', 30.0);
        const shopeePrice = shopeePair.precoComDesconto;
        const diffShopee = salePrice - shopeePrice;
        const diffShopeePct = shopeePrice > 0 ? (diffShopee / shopeePrice * 100) : 0;
        const isCheaper = diffShopee < 0;
        const shopeeColor = isCheaper ? '#10b981' : '#ee4d2d';
        const label = isCheaper 
          ? `🔥 TikTok ${fmtCurrency.format(Math.abs(diffShopee))} mais barato que Shopee (${Math.abs(diffShopeePct).toFixed(1)}% menor)!`
          : `Shopee: ${fmtCurrency.format(shopeePrice)}`;

        elements.tiktokSimVsShopeeBadge.innerHTML = `
          <span class="tiktok-vs-shopee-badge" style="font-size: 0.75rem; font-weight: 700; color: ${shopeeColor}; background: var(--bg-surface); padding: 3px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);">
            ${label}
          </span>
        `;
      } else if (elements.tiktokSimVsShopeeBadge) {
        elements.tiktokSimVsShopeeBadge.innerHTML = '';
      }
    } else {
      if (elements.tiktokSimComparisonBadge) elements.tiktokSimComparisonBadge.innerHTML = '';
      if (elements.tiktokSimVsShopeeBadge) elements.tiktokSimVsShopeeBadge.innerHTML = '';
    }

    // DRE TikTok
    if (elements.tiktokDreCadVal) elements.tiktokDreCadVal.textContent = fmtCurrency.format(pair ? pair.precoCadastro : res.precoVenda);
    if (elements.tiktokDrePromoDiscountRow) {
      if (pair && pair.descontoReais > 0) {
        elements.tiktokDrePromoDiscountRow.style.display = 'flex';
        if (elements.tiktokDrePromoDiscountPct) elements.tiktokDrePromoDiscountPct.textContent = `${pair.descontoEfetivoPct.toFixed(1)}%`;
        if (elements.tiktokDrePromoDiscountVal) elements.tiktokDrePromoDiscountVal.textContent = `-${fmtCurrency.format(pair.descontoReais)}`;
      } else {
        elements.tiktokDrePromoDiscountRow.style.display = 'none';
      }
    }

    if (elements.tiktokDreVenda) elements.tiktokDreVenda.textContent = fmtCurrency.format(res.precoVenda);
    if (elements.tiktokDrePct) elements.tiktokDrePct.textContent = `${res.taxaPercentualPct.toFixed(0)}%`;
    if (elements.tiktokDrePctVal) elements.tiktokDrePctVal.textContent = `-${fmtCurrency.format(res.taxaPercentualVal)}`;
    if (elements.tiktokDreFixVal) elements.tiktokDreFixVal.textContent = `-${fmtCurrency.format(res.taxaFixaVal)}`;
    if (elements.tiktokDrePackVal) elements.tiktokDrePackVal.textContent = `-${fmtCurrency.format(res.custoEmbalagem)}`;
    if (elements.tiktokDreCostVal) elements.tiktokDreCostVal.textContent = `-${fmtCurrency.format(res.custoProduto)}`;

    if (elements.tiktokDreTaxRow) {
      if (res.impostoPct > 0) {
        elements.tiktokDreTaxRow.style.display = 'flex';
        elements.tiktokDreTaxPct.textContent = `${res.impostoPct}%`;
        elements.tiktokDreTaxVal.textContent = `-${fmtCurrency.format(res.impostoVal)}`;
      } else {
        elements.tiktokDreTaxRow.style.display = 'none';
      }
    }

    if (elements.tiktokDreRepasse) elements.tiktokDreRepasse.textContent = fmtCurrency.format(res.repasseTikTok);
    if (elements.tiktokDreLucro) {
      elements.tiktokDreLucro.textContent = `${fmtCurrency.format(res.lucroLiquido)} (${res.margemRealPct.toFixed(1)}%)`;
      elements.tiktokDreLucro.style.color = res.lucroLiquido >= 0 ? 'var(--success-text)' : 'var(--danger-text)';
    }

    // Gráfico de Barras de Composição TikTok
    if (res.precoVenda > 0) {
      const pctCost = Math.max(0, (res.custoProduto / res.precoVenda) * 100);
      const pctPack = Math.max(0, (res.custoEmbalagem / res.precoVenda) * 100);
      const pctFee = Math.max(0, (res.taxaTikTokTotal / res.precoVenda) * 100);
      const pctTax = Math.max(0, (res.impostoVal / res.precoVenda) * 100);
      const pctProfit = Math.max(0, (res.lucroLiquido / res.precoVenda) * 100);

      if (elements.tiktokBarCost) elements.tiktokBarCost.style.width = `${pctCost.toFixed(1)}%`;
      if (elements.tiktokBarPack) elements.tiktokBarPack.style.width = `${pctPack.toFixed(1)}%`;
      if (elements.tiktokBarFee) elements.tiktokBarFee.style.width = `${pctFee.toFixed(1)}%`;
      if (elements.tiktokBarTax) elements.tiktokBarTax.style.width = `${pctTax.toFixed(1)}%`;
      if (elements.tiktokBarProfit) elements.tiktokBarProfit.style.width = `${pctProfit.toFixed(1)}%`;

      if (elements.tiktokBreakdownSummary) {
        elements.tiktokBreakdownSummary.textContent = `Taxas TikTok: ${pctFee.toFixed(1)}% | Custos: ${(pctCost + pctPack).toFixed(1)}% | Lucro: ${pctProfit.toFixed(1)}%`;
      }
    }
  }

  function updateTikTokAffiliateSimulation(baseResult, cost, packaging, marginPct, taxPct, sellerRegime, rounding) {
    const testedPct = state.tiktok.affiliate.testedPct;
    const minMarginPct = state.tiktok.affiliate.minMarginPct;
    const mode = state.tiktok.affiliate.mode;

    const maxViablePct = Math.max(0, baseResult.margemRealPct - minMarginPct);
    const maxViableVal = baseResult.precoVenda * (maxViablePct / 100.0);

    if (elements.tiktokAffKpiMaxPct) elements.tiktokAffKpiMaxPct.textContent = `${maxViablePct.toFixed(1)}%`;
    if (elements.tiktokAffKpiMaxVal) {
      elements.tiktokAffKpiMaxVal.textContent = `Até ${fmtCurrency.format(maxViableVal)} por venda (Piso: ${minMarginPct.toFixed(1)}% margem)`;
    }

    let activePrice = baseResult.precoVenda;
    let affVal = 0;
    let profitRemaining = 0;
    let marginRemaining = 0;

    if (mode === 'absorb') {
      activePrice = baseResult.precoVenda;
      affVal = activePrice * (testedPct / 100.0);
      profitRemaining = baseResult.lucroLiquido - affVal;
      marginRemaining = activePrice > 0 ? (profitRemaining / activePrice * 100.0) : 0;
    } else {
      const repassCalc = calcTikTokPrice(cost, packaging, marginPct, taxPct, sellerRegime, rounding, testedPct);
      activePrice = repassCalc.precoVenda;
      affVal = activePrice * (testedPct / 100.0);
      profitRemaining = repassCalc.lucroLiquido;
      marginRemaining = repassCalc.margemRealPct;
    }

    if (elements.tiktokAffTestedValLabel) {
      elements.tiktokAffTestedValLabel.textContent = `${fmtCurrency.format(affVal)} / venda`;
    }

    if (elements.tiktokAffKpiAffVal) elements.tiktokAffKpiAffVal.textContent = fmtCurrency.format(affVal);
    if (elements.tiktokAffKpiAffSub) {
      elements.tiktokAffKpiAffSub.textContent = `${testedPct.toFixed(1)}% ${mode === 'absorb' ? 'absorvido da margem' : 'repassado no preço'}`;
    }

    if (elements.tiktokAffKpiStatusPill && elements.tiktokAffKpiStatusSub) {
      if (marginRemaining >= 15.0) {
        elements.tiktokAffKpiStatusPill.className = 'risk-pill risk-safe';
        elements.tiktokAffKpiStatusPill.innerHTML = '● Excelente &amp; Muito Seguro';
        elements.tiktokAffKpiStatusSub.textContent = `Sua margem (${marginRemaining.toFixed(1)}%) é excelente para atrair criadores do TikTok.`;
      } else if (marginRemaining >= minMarginPct) {
        elements.tiktokAffKpiStatusPill.className = 'risk-pill risk-moderate';
        elements.tiktokAffKpiStatusPill.innerHTML = '● Viável &amp; Dentro do Piso';
        elements.tiktokAffKpiStatusSub.textContent = `Sua margem (${marginRemaining.toFixed(1)}%) atende ao piso seguro (${minMarginPct.toFixed(1)}%).`;
      } else if (marginRemaining > 0) {
        elements.tiktokAffKpiStatusPill.className = 'risk-pill risk-warning';
        elements.tiktokAffKpiStatusPill.innerHTML = '● Alerta: Abaixo do Piso';
        elements.tiktokAffKpiStatusSub.textContent = `Margem de ${marginRemaining.toFixed(1)}% compromete seu retorno financeiro mínimo.`;
      } else {
        elements.tiktokAffKpiStatusPill.className = 'risk-pill risk-danger';
        elements.tiktokAffKpiStatusPill.innerHTML = '● Prejuízo / Inviável';
        elements.tiktokAffKpiStatusSub.textContent = 'Essa comissão faz a operação ter prejuízo por venda!';
      }
    }
  }

  // =========================================================================
  // TABELA DE PRECIFICAÇÃO EM MASSA TIKTOK SHOP
  // =========================================================================
  function renderTikTokTable() {
    if (!elements.tiktokTableBody || !state.data?.itens_detalhados) return;

    const list = state.data.itens_detalhados;
    const search = state.tiktok.tableSearch.toLowerCase().trim();
    const stockFilter = state.tiktok.tableStockFilter;

    const packaging = parseFloat(elements.tiktokCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.tiktokCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.tiktokCfgTax?.value) || 0.0;
    const sellerRegime = elements.tiktokCfgNewSeller?.value || 'standard';
    const rounding = elements.tiktokCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.tiktokCfgPromoDiscount?.value) || state.tiktok.discountPromoPct || 30.0;
    const minMarginPct = state.tiktok.affiliate.minMarginPct;

    const filtered = list.filter(item => {
      if (search) {
        const mNome = (item.nome || '').toLowerCase().includes(search);
        const mSku = (item.sku || '').toLowerCase().includes(search);
        const mVar = (item.variacao || '').toLowerCase().includes(search);
        if (!mNome && !mSku && !mVar) return false;
      }

      if (stockFilter === 'in_stock' && item.estoque <= 0) return false;
      if (stockFilter === 'zero' && item.estoque > 0) return false;

      return true;
    });

    if (elements.tiktokMassCount) {
      elements.tiktokMassCount.textContent = `${filtered.length} itens`;
    }

    const size = state.tiktok.pageSize;
    const total = filtered.length;
    const totalPages = Math.ceil(total / size) || 1;
    const current = Math.min(state.tiktok.currentPage, totalPages);
    const start = (current - 1) * size;
    const pageItems = filtered.slice(start, start + size);

    if (pageItems.length === 0) {
      elements.tiktokTableBody.innerHTML = `
        <tr>
          <td colspan="14">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>Nenhum produto encontrado no TikTok Shop</h3>
              <p>Tente ajustar a busca ou o filtro de estoque.</p>
            </div>
          </td>
        </tr>
      `;
      if (elements.tiktokPaginationInfo) elements.tiktokPaginationInfo.textContent = 'Nenhum item';
      if (elements.tiktokPaginationPages) elements.tiktokPaginationPages.innerHTML = '';
      return;
    }

    let rowsHtml = '';

    pageItems.forEach(item => {
      const pair = calcTikTokPricingPair(item.custo, packaging, marginPct, taxPct, sellerRegime, rounding, discountPromo);
      const calc = pair.breakdown;
      const stockBadge = getStockBadgeClass(item.estoque);
      const imgSrc = item.img || PLACEHOLDER_IMG;

      const maxAffPct = Math.max(0, calc.margemRealPct - minMarginPct);
      const maxAffVal = calc.precoVenda * (maxAffPct / 100.0);

      rowsHtml += `
        <tr>
          <td>
            <img src="${imgSrc}" class="product-thumb" alt="${escapeHtml(item.nome)}"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
                 onclick="openLightbox('${escapeHtml(imgSrc)}', '${escapeHtml(item.nome)}', '${escapeHtml(item.sku)}', ${item.estoque}, ${item.custo});">
          </td>
          <td>
            <div class="product-meta">
              <span class="product-title">${escapeHtml(item.nome)}</span>
              <span class="product-cat">${escapeHtml(item.categoria)}</span>
            </div>
          </td>
          <td>
            <span class="sku-tag">
              ${escapeHtml(item.sku)}
              <button class="sku-copy-btn" data-copy-sku="${escapeHtml(item.sku)}">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
              </button>
            </span>
          </td>
          <td>
            <span class="variation-badge">${escapeHtml(item.variacao)}</span>
          </td>
          <td>
            <span class="currency-cost">${fmtCurrency.format(item.custo)}</span>
          </td>
          <td>
            <span class="currency-sale">${fmtCurrency.format(item.preco_venda)}</span>
          </td>
          <td>
            <span style="color: #fe2c55; font-weight: 600; font-size: 0.85rem;" title="${calc.tierName}">
              ${fmtCurrency.format(calc.taxaTikTokTotal)}
            </span>
          </td>
          <td style="background-color: rgba(254, 44, 85, 0.04);">
            <span style="font-weight: 600; color: var(--text-secondary); text-decoration: line-through;">
              ${fmtCurrency.format(pair.precoCadastro)}
            </span>
          </td>
          <td>
            <span class="price-tiktok-cell">${fmtCurrency.format(pair.precoComDesconto)}</span>
            <span style="background: #fe2c55; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-left: 3px;">
              -${pair.descontoEfetivoPct.toFixed(0)}%
            </span>
          </td>
          <td>
            <strong style="color: var(--success-text);">${fmtCurrency.format(calc.lucroLiquido)}</strong>
          </td>
          <td>
            <span class="margin-pill">${calc.margemRealPct.toFixed(1)}%</span>
          </td>
          <td>
            <span style="font-weight: 700; color: #fe2c55; font-size: 0.85rem;" title="Comissão máxima para manter ${minMarginPct}% de margem">
              ${fmtCurrency.format(maxAffVal)} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${maxAffPct.toFixed(0)}%)</span>
            </span>
          </td>
          <td>
            <div class="stock-badge ${stockBadge}">
              <span class="stock-dot"></span>
              <span>${fmtNumber.format(item.estoque)} un</span>
            </div>
          </td>
          <td style="text-align: center;">
            <button class="btn btn-outline-tiktok btn-sim-tiktok-product" data-sim-sku="${escapeHtml(item.sku)}" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" title="Carregar no simulador TikTok">
              ⚡ Simular
            </button>
          </td>
        </tr>
      `;
    });

    elements.tiktokTableBody.innerHTML = rowsHtml;

    elements.tiktokTableBody.querySelectorAll('.btn-sim-tiktok-product').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.getAttribute('data-sim-sku');
        selectTikTokProduct(sku);
        window.scrollTo({ top: elements.tiktokCfgMargin ? elements.tiktokCfgMargin.offsetTop - 120 : 0, behavior: 'smooth' });
        showToast(`Produto ${sku} carregado no simulador TikTok!`, 'success');
      });
    });

    elements.tiktokTableBody.querySelectorAll('[data-copy-sku]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copySku(btn.getAttribute('data-copy-sku'));
      });
    });

    const startNum = start + 1;
    const endNum = Math.min(start + size, total);
    if (elements.tiktokPaginationInfo) {
      elements.tiktokPaginationInfo.textContent = `Mostrando ${startNum}–${endNum} de ${total} produtos no TikTok Shop`;
    }

    renderTikTokPagination(totalPages, current);
  }

  function renderTikTokPagination(totalPages, current) {
    if (!elements.tiktokPaginationPages) return;

    if (totalPages <= 1) {
      elements.tiktokPaginationPages.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${current === 1 ? 'disabled' : ''} data-tiktok-page="${current - 1}">&laquo;</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 8 && Math.abs(p - current) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) {
          html += '<span style="padding: 0 4px; color: var(--text-muted);">...</span>';
        }
        continue;
      }
      html += `
        <button class="page-btn ${p === current ? 'active' : ''}" data-tiktok-page="${p}">${p}</button>
      `;
    }

    html += `
      <button class="page-btn" ${current === totalPages ? 'disabled' : ''} data-tiktok-page="${current + 1}">&raquo;</button>
    `;

    elements.tiktokPaginationPages.innerHTML = html;

    elements.tiktokPaginationPages.querySelectorAll('[data-tiktok-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-tiktok-page'));
        if (page && page !== state.tiktok.currentPage) {
          state.tiktok.currentPage = page;
          renderTikTokTable();
        }
      });
    });
  }

  // =========================================================================
  // Exportar Tabela TikTok Shop para CSV / Excel
  // =========================================================================
  function exportTikTokToCsv() {
    if (!state.data?.itens_detalhados) {
      showToast('Nenhum dado disponível para exportação.', 'warning');
      return;
    }

    const packaging = parseFloat(elements.tiktokCfgPack?.value) || 1.50;
    const marginPct = parseFloat(elements.tiktokCfgMargin?.value) || 20.0;
    const taxPct = parseFloat(elements.tiktokCfgTax?.value) || 0.0;
    const sellerRegime = elements.tiktokCfgNewSeller?.value || 'standard';
    const rounding = elements.tiktokCfgRounding?.value || 'none';
    const discountPromo = parseFloat(elements.tiktokCfgPromoDiscount?.value) || state.tiktok.discountPromoPct || 30.0;
    const minMarginPct = state.tiktok.affiliate.minMarginPct;

    const headers = [
      'SKU', 'SKU Pai', 'Produto', 'Variação / Tamanho', 'Categoria',
      'Preço Custo', 'Embalagem', 'Preço Loja Integrada',
      'Taxa Percentual TikTok (%)', 'Taxa Fixa TikTok (R$)', 'Total Taxas TikTok (R$)',
      'Preço Cadastro TikTok Âncora (R$)', 'Desconto Promo (%)', 'Preço com Desconto TikTok (R$)',
      'Repasse TikTok (R$)', 'Lucro Líquido (R$)', 'Margem Real (%)',
      'Teto Criadores %', 'Teto Criadores R$', 'Regra Aplicada', 'Estoque Atual'
    ];

    const rowsData = state.data.itens_detalhados.map(item => {
      const pair = calcTikTokPricingPair(item.custo, packaging, marginPct, taxPct, sellerRegime, rounding, discountPromo);
      const calc = pair.breakdown;
      const maxAffPct = Math.max(0, calc.margemRealPct - minMarginPct);
      const maxAffVal = calc.precoVenda * (maxAffPct / 100.0);

      return [
        item.sku,
        item.sku_pai || '',
        `"${(item.nome || '').replace(/"/g, '""')}"`,
        `"${(item.variacao || '').replace(/"/g, '""')}"`,
        `"${(item.categoria || '').replace(/"/g, '""')}"`,
        item.custo.toFixed(2),
        packaging.toFixed(2),
        item.preco_venda.toFixed(2),
        calc.taxaPercentualPct.toFixed(1),
        calc.taxaFixaVal.toFixed(2),
        calc.taxaTikTokTotal.toFixed(2),
        pair.precoCadastro.toFixed(2),
        pair.descontoEfetivoPct.toFixed(1),
        pair.precoComDesconto.toFixed(2),
        calc.repasseTikTok.toFixed(2),
        calc.lucroLiquido.toFixed(2),
        calc.margemRealPct.toFixed(1),
        maxAffPct.toFixed(1),
        maxAffVal.toFixed(2),
        `"${calc.tierName}"`,
        item.estoque
      ];
    });

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rowsData.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tiktok_shop_precificacao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Tabela TikTok Shop exportada com sucesso!', 'success');
  }

  // =========================================================================
  // Configuração de Event Listeners TikTok Shop
  // =========================================================================
  function setupTikTokEventListeners() {
    if (elements.navBtnTiktok) {
      elements.navBtnTiktok.addEventListener('click', () => switchTab('tiktok'));
    }

    const updateAllTikTok = () => {
      computeCatalogTikTokPrices();
      updateTikTokSimulator();
      renderTikTokTable();
    };

    if (elements.tiktokCfgMargin) elements.tiktokCfgMargin.addEventListener('input', updateAllTikTok);
    if (elements.tiktokCfgPack) elements.tiktokCfgPack.addEventListener('input', updateAllTikTok);
    if (elements.tiktokCfgPromoDiscount) {
      elements.tiktokCfgPromoDiscount.addEventListener('input', (e) => {
        const val = e.target.value;
        if (elements.tiktokSimPromoDiscountInput) elements.tiktokSimPromoDiscountInput.value = val;
        if (elements.tiktokSimDiscountPills) {
          elements.tiktokSimDiscountPills.forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-discount') === val);
          });
        }
        updateAllTikTok();
      });
    }
    if (elements.tiktokCfgNewSeller) elements.tiktokCfgNewSeller.addEventListener('change', updateAllTikTok);
    if (elements.tiktokCfgTax) elements.tiktokCfgTax.addEventListener('input', updateAllTikTok);
    if (elements.tiktokCfgRounding) elements.tiktokCfgRounding.addEventListener('change', updateAllTikTok);

    if (elements.tiktokSimPromoDiscountInput) {
      elements.tiktokSimPromoDiscountInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (elements.tiktokCfgPromoDiscount) elements.tiktokCfgPromoDiscount.value = val;
        if (elements.tiktokSimDiscountPills) {
          elements.tiktokSimDiscountPills.forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-discount') === val);
          });
        }
        updateAllTikTok();
      });
    }

    if (elements.tiktokSimDiscountPills) {
      elements.tiktokSimDiscountPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const disc = pill.getAttribute('data-discount');
          if (elements.tiktokSimPromoDiscountInput) elements.tiktokSimPromoDiscountInput.value = disc;
          if (elements.tiktokCfgPromoDiscount) elements.tiktokCfgPromoDiscount.value = disc;
          elements.tiktokSimDiscountPills.forEach(p => p.classList.toggle('active', p === pill));
          updateAllTikTok();
        });
      });
    }

    if (elements.tiktokRulesToggle) {
      elements.tiktokRulesToggle.addEventListener('click', () => {
        const isOpen = elements.tiktokRulesContent.classList.toggle('open');
        if (elements.tiktokRulesChevron) {
          elements.tiktokRulesChevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    // Autocomplete TikTok
    if (elements.tiktokSimProductSearch && elements.tiktokSimAutocompleteList) {
      let tiktokSearchTimeout;
      let activeIndex = -1;

      const renderTikTokAutocomplete = (query) => {
        if (!state.data?.itens_detalhados) return;
        const q = (query || '').trim().toLowerCase();

        let matches = [];
        if (q.length === 0) {
          matches = state.data.itens_detalhados
            .filter(it => it.estoque > 0 && it.custo > 0)
            .slice(0, 20);
        } else {
          const terms = q.split(/\s+/).filter(Boolean);
          matches = state.data.itens_detalhados.filter(item => {
            const itemStr = `${item.sku} ${item.nome} ${item.variacao || ''} ${item.categoria || ''}`.toLowerCase();
            return terms.every(t => itemStr.includes(t));
          }).slice(0, 25);
        }

        activeIndex = -1;

        if (matches.length === 0) {
          elements.tiktokSimAutocompleteList.innerHTML = `<div class="sim-autocomplete-empty">Nenhum produto encontrado para "<strong>${escapeHtml(q)}</strong>"</div>`;
        } else {
          elements.tiktokSimAutocompleteList.innerHTML = matches.map((it, idx) => {
            const thumb = it.img || PLACEHOLDER_IMG;
            const stockBadge = it.estoque > 0 ? `Estoque: ${it.estoque} un` : 'Sem estoque';
            return `
              <div class="sim-autocomplete-item ${idx === 0 ? 'active' : ''}" data-sku="${escapeHtml(it.sku)}" data-index="${idx}">
                <img src="${thumb}" class="sim-autocomplete-thumb" alt="${escapeHtml(it.nome)}">
                <div class="sim-autocomplete-info">
                  <div class="sim-autocomplete-title">${escapeHtml(it.nome)}</div>
                  <div class="sim-autocomplete-meta">
                    <span class="sim-autocomplete-sku-badge" style="background: rgba(254, 44, 85, 0.1); color: #fe2c55;">${escapeHtml(it.sku)}</span>
                    <span>${escapeHtml(it.variacao ? `[${it.variacao}]` : '')}</span>
                    <span class="sim-autocomplete-cost">Custo: ${fmtCurrency.format(it.custo)}</span>
                    <span class="sim-autocomplete-stock">• ${stockBadge}</span>
                    <span style="color: #2563eb;">• Loja: ${fmtCurrency.format(it.preco_venda)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          elements.tiktokSimAutocompleteList.querySelectorAll('.sim-autocomplete-item').forEach(el => {
            el.addEventListener('click', () => {
              const sku = el.getAttribute('data-sku');
              if (sku) selectTikTokProduct(sku);
            });
          });
        }

        elements.tiktokSimAutocompleteList.style.display = 'block';
      };

      elements.tiktokSimProductSearch.addEventListener('input', (e) => {
        clearTimeout(tiktokSearchTimeout);
        const val = e.target.value;
        if (elements.tiktokSimSearchClear) {
          elements.tiktokSimSearchClear.style.display = val.length > 0 ? 'block' : 'none';
        }
        tiktokSearchTimeout = setTimeout(() => {
          renderTikTokAutocomplete(val);
        }, 120);
      });

      elements.tiktokSimProductSearch.addEventListener('focus', () => {
        renderTikTokAutocomplete(elements.tiktokSimProductSearch.value);
      });

      elements.tiktokSimProductSearch.addEventListener('keydown', (e) => {
        if (elements.tiktokSimAutocompleteList.style.display === 'none') return;
        const items = elements.tiktokSimAutocompleteList.querySelectorAll('.sim-autocomplete-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIndex = (activeIndex + 1) % items.length;
          items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
          items[activeIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
          items[activeIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = activeIndex >= 0 ? items[activeIndex] : items[0];
          if (target) {
            const sku = target.getAttribute('data-sku');
            if (sku) selectTikTokProduct(sku);
          }
        } else if (e.key === 'Escape') {
          elements.tiktokSimAutocompleteList.style.display = 'none';
        }
      });

      if (elements.tiktokSimSearchClear) {
        elements.tiktokSimSearchClear.addEventListener('click', () => {
          elements.tiktokSimProductSearch.value = '';
          elements.tiktokSimSearchClear.style.display = 'none';
          elements.tiktokSimAutocompleteList.style.display = 'none';
          state.tiktok.selectedProductSku = null;
          if (elements.tiktokSimProductPreview) elements.tiktokSimProductPreview.style.display = 'none';
          if (elements.tiktokSimCostInput) elements.tiktokSimCostInput.value = '18.00';
          updateTikTokSimulator();
          elements.tiktokSimProductSearch.focus();
        });
      }

      document.addEventListener('click', (e) => {
        if (!elements.tiktokSimProductSearch.contains(e.target) && !elements.tiktokSimAutocompleteList.contains(e.target)) {
          elements.tiktokSimAutocompleteList.style.display = 'none';
        }
      });
    }

    if (elements.tiktokSimCostInput) elements.tiktokSimCostInput.addEventListener('input', updateTikTokSimulator);
    if (elements.tiktokSimPackInput) {
      elements.tiktokSimPackInput.addEventListener('input', (e) => {
        if (elements.tiktokCfgPack) elements.tiktokCfgPack.value = e.target.value;
        updateTikTokSimulator();
        renderTikTokTable();
      });
    }
    if (elements.tiktokSimManualPrice) elements.tiktokSimManualPrice.addEventListener('input', updateTikTokSimulator);

    // Creators / Affiliates
    if (elements.tiktokAffModeAbsorb && elements.tiktokAffModeRepass) {
      elements.tiktokAffModeAbsorb.addEventListener('click', () => {
        elements.tiktokAffModeAbsorb.classList.add('active');
        elements.tiktokAffModeRepass.classList.remove('active');
        state.tiktok.affiliate.mode = 'absorb';
        updateTikTokSimulator();
      });

      elements.tiktokAffModeRepass.addEventListener('click', () => {
        elements.tiktokAffModeRepass.classList.add('active');
        elements.tiktokAffModeAbsorb.classList.remove('active');
        state.tiktok.affiliate.mode = 'repass';
        updateTikTokSimulator();
      });
    }

    if (elements.tiktokAffTestedPct) {
      elements.tiktokAffTestedPct.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.tiktok.affiliate.testedPct = val;
        if (elements.tiktokAffQuickPctBtns) {
          elements.tiktokAffQuickPctBtns.forEach(b => {
            b.classList.toggle('active', parseFloat(b.getAttribute('data-pct')) === val);
          });
        }
        updateTikTokSimulator();
      });
    }

    if (elements.tiktokAffMinMargin) {
      elements.tiktokAffMinMargin.addEventListener('input', (e) => {
        state.tiktok.affiliate.minMarginPct = parseFloat(e.target.value) || 10.0;
        updateTikTokSimulator();
        renderTikTokTable();
      });
    }

    if (elements.tiktokAffQuickPctBtns) {
      elements.tiktokAffQuickPctBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseFloat(btn.getAttribute('data-pct'));
          state.tiktok.affiliate.testedPct = val;
          if (elements.tiktokAffTestedPct) elements.tiktokAffTestedPct.value = val;
          elements.tiktokAffQuickPctBtns.forEach(b => b.classList.toggle('active', b === btn));
          updateTikTokSimulator();
        });
      });
    }

    // Mass Table
    if (elements.tiktokTableSearch) {
      let massTiktokTimeout;
      elements.tiktokTableSearch.addEventListener('input', (e) => {
        clearTimeout(massTiktokTimeout);
        massTiktokTimeout = setTimeout(() => {
          state.tiktok.tableSearch = e.target.value;
          state.tiktok.currentPage = 1;
          renderTikTokTable();
        }, 150);
      });
    }

    if (elements.tiktokTableStockFilter) {
      elements.tiktokTableStockFilter.addEventListener('change', (e) => {
        state.tiktok.tableStockFilter = e.target.value;
        state.tiktok.currentPage = 1;
        renderTikTokTable();
      });
    }

    if (elements.btnExportTiktok) {
      elements.btnExportTiktok.addEventListener('click', exportTikTokToCsv);
    }
  }

  // =========================================================================
  // Categorias (Catálogo)
  // =========================================================================
  function populateCategories() {
    if (!elements.categoryFilter || !state.data?.categorias) return;
    const current = elements.categoryFilter.value;
    elements.categoryFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
    
    state.data.categorias.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      elements.categoryFilter.appendChild(opt);
    });
    
    if (current && [...elements.categoryFilter.options].some(o => o.value === current)) {
      elements.categoryFilter.value = current;
    }
  }

  // =========================================================================
  // Filtros & Ordenação (Catálogo)
  // =========================================================================
  function applyFilters() {
    if (!state.data) return;

    const isGrouped = state.viewStructure === 'grouped';
    const sourceList = isGrouped ? state.data.produtos_agrupados : state.data.itens_detalhados;

    const searchTerm = state.filters.search.toLowerCase().trim();
    const stockStatus = state.filters.stockStatus;
    const cat = state.filters.category;
    const status = state.filters.status;

    let result = sourceList.filter(item => {
      if (searchTerm) {
        const matchesName = (item.nome || '').toLowerCase().includes(searchTerm);
        const matchesSku = (item.sku || '').toLowerCase().includes(searchTerm);
        const matchesCat = (item.categoria || '').toLowerCase().includes(searchTerm);
        const matchesVar = (item.variacao || '').toLowerCase().includes(searchTerm);

        let matchesChild = false;
        if (isGrouped && item.variacoes) {
          matchesChild = item.variacoes.some(v => 
            (v.sku || '').toLowerCase().includes(searchTerm) || 
            (v.variacao || '').toLowerCase().includes(searchTerm)
          );
        }

        if (!matchesName && !matchesSku && !matchesCat && !matchesVar && !matchesChild) {
          return false;
        }
      }

      const stock = isGrouped ? item.estoque_total : item.estoque;
      if (stockStatus === 'in_stock' && stock <= 0) return false;
      if (stockStatus === 'low_stock' && (stock <= 0 || stock > 2)) return false;
      if (stockStatus === 'out_of_stock' && stock > 0) return false;

      if (cat !== 'all') {
        if (item.categoria !== cat) return false;
      }

      if (status !== 'all') {
        if (item.ativo !== status) return false;
      }

      return true;
    });

    const field = state.sort.field;
    const dir = state.sort.direction === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return valA.localeCompare(valB, 'pt-BR') * dir;
      }
      return (valA - valB) * dir;
    });

    state.filteredItems = result;
    state.pagination.currentPage = 1;

    updatePillCounters();
    renderKPIs();
    renderView();
  }

  function updatePillCounters() {
    if (!state.data) return;
    const isGrouped = state.viewStructure === 'grouped';
    const list = isGrouped ? state.data.produtos_agrupados : state.data.itens_detalhados;

    let total = list.length;
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    list.forEach(it => {
      const s = isGrouped ? it.estoque_total : it.estoque;
      if (s > 2) inStock++;
      else if (s > 0 && s <= 2) {
        inStock++;
        lowStock++;
      } else {
        outOfStock++;
      }
    });

    const elTotal = document.getElementById('count-all');
    const elInStock = document.getElementById('count-in-stock');
    const elLowStock = document.getElementById('count-low-stock');
    const elZero = document.getElementById('count-out-stock');

    if (elTotal) elTotal.textContent = total;
    if (elInStock) elInStock.textContent = inStock;
    if (elLowStock) elLowStock.textContent = lowStock;
    if (elZero) elZero.textContent = outOfStock;
  }

  // =========================================================================
  // Renderização de KPIs (Catálogo)
  // =========================================================================
  function renderKPIs() {
    if (!elements.kpisContainer || !state.data) return;

    const isGrouped = state.viewStructure === 'grouped';
    let totalPecas = 0;
    let totalCusto = 0;
    let totalVenda = 0;
    let comEstoque = 0;

    if (isGrouped) {
      state.filteredItems.forEach(p => {
        totalPecas += p.estoque_total;
        totalCusto += p.custo_total;
        totalVenda += p.venda_total;
        if (p.estoque_total > 0) comEstoque++;
      });
    } else {
      state.filteredItems.forEach(it => {
        totalPecas += it.estoque;
        totalCusto += it.custo_total;
        totalVenda += it.venda_total;
        if (it.estoque > 0) comEstoque++;
      });
    }

    const lucroTotal = totalVenda - totalCusto;
    const margemMedia = totalVenda > 0 ? (lucroTotal / totalVenda * 100) : 0;
    const custoMedioPeca = totalPecas > 0 ? (totalCusto / totalPecas) : 0;

    elements.kpisContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Peças em Estoque</span>
          <div class="kpi-icon-wrapper kpi-icon-indigo">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
        </div>
        <div class="kpi-value">${fmtNumber.format(totalPecas)} un</div>
        <div class="kpi-subtitle">
          <span class="kpi-chip kpi-chip-info">${comEstoque} itens c/ estoque</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Custo Total em Estoque</span>
          <div class="kpi-icon-wrapper kpi-icon-blue">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
        </div>
        <div class="kpi-value">${fmtCurrency.format(totalCusto)}</div>
        <div class="kpi-subtitle">
          Custo médio: <strong>${fmtCurrency.format(custoMedioPeca)}/un</strong>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Valor de Venda (Estoque)</span>
          <div class="kpi-icon-wrapper kpi-icon-emerald">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"/></svg>
          </div>
        </div>
        <div class="kpi-value">${fmtCurrency.format(totalVenda)}</div>
        <div class="kpi-subtitle">
          Potencial de faturamento
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Lucro Bruto Projetado</span>
          <div class="kpi-icon-wrapper kpi-icon-purple">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
          </div>
        </div>
        <div class="kpi-value">${fmtCurrency.format(lucroTotal)}</div>
        <div class="kpi-subtitle">
          <span class="kpi-chip kpi-chip-success">Margem: ${margemMedia.toFixed(1)}%</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Renderização Geral (Table / Cards - Catálogo)
  // =========================================================================
  function renderView() {
    if (state.viewMode === 'table') {
      elements.tableContainer.style.display = 'block';
      elements.cardsContainer.style.display = 'none';
      renderTable();
    } else {
      elements.tableContainer.style.display = 'none';
      elements.cardsContainer.style.display = 'grid';
      renderCards();
    }
    renderPagination();
  }

  // =========================================================================
  // Renderização de Tabela (Catálogo)
  // =========================================================================
  function renderTable() {
    const isGrouped = state.viewStructure === 'grouped';
    
    elements.tableHead.innerHTML = `
      <tr>
        ${isGrouped ? '<th style="width: 40px;"></th>' : ''}
        <th style="width: 70px;">Foto</th>
        <th class="sortable" data-sort="nome">
          <div class="th-content">Produto ${getSortIcon('nome')}</div>
        </th>
        <th class="sortable" data-sort="sku">
          <div class="th-content">SKU ${getSortIcon('sku')}</div>
        </th>
        ${!isGrouped ? '<th class="sortable" data-sort="variacao"><div class="th-content">Variação / Tamanho ' + getSortIcon('variacao') + '</div></th>' : '<th>Variações</th>'}
        <th class="sortable" data-sort="${isGrouped ? 'custo_min' : 'custo'}">
          <div class="th-content">Preço Custo ${getSortIcon(isGrouped ? 'custo_min' : 'custo')}</div>
        </th>
        <th class="sortable" data-sort="${isGrouped ? 'preco_min' : 'preco_venda'}">
          <div class="th-content">Preço Loja ${getSortIcon(isGrouped ? 'preco_min' : 'preco_venda')}</div>
        </th>
        <th class="sortable" data-sort="${isGrouped ? 'preco_shopee_min' : 'preco_shopee'}" style="background-color: rgba(238, 77, 45, 0.05);">
          <div class="th-content" style="color: #ee4d2d; font-weight: 700;">
            <span class="shopee-badge" style="padding: 1px 4px; font-size: 0.65rem; margin-right: 3px;">Shopee</span>
            Preço Shopee ${getSortIcon(isGrouped ? 'preco_shopee_min' : 'preco_shopee')}
          </div>
        </th>
        <th class="sortable" data-sort="${isGrouped ? 'preco_tiktok_min' : 'preco_tiktok'}" style="background-color: rgba(254, 44, 85, 0.05);">
          <div class="th-content" style="color: #fe2c55; font-weight: 700;">
            <span class="tiktok-badge" style="padding: 1px 4px; font-size: 0.65rem; margin-right: 3px;">TikTok</span>
            Preço TikTok ${getSortIcon(isGrouped ? 'preco_tiktok_min' : 'preco_tiktok')}
          </div>
        </th>
        <th class="sortable" data-sort="${isGrouped ? 'estoque_total' : 'estoque'}">
          <div class="th-content">Estoque ${getSortIcon(isGrouped ? 'estoque_total' : 'estoque')}</div>
        </th>
        <th class="sortable" data-sort="custo_total">
          <div class="th-content">Custo Total ${getSortIcon('custo_total')}</div>
        </th>
        <th class="sortable" data-sort="margem_pct">
          <div class="th-content">Margem Loja ${getSortIcon('margem_pct')}</div>
        </th>
        <th style="text-align: center;">Análise &amp; Detalhes</th>
      </tr>
    `;

    const pageItems = getPageItems();

    if (pageItems.length === 0) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="13">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>Nenhum produto encontrado</h3>
              <p>Tente ajustar os filtros ou o termo pesquisado.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    pageItems.forEach((item, idx) => {
      if (isGrouped) {
        rowsHtml += renderGroupedRow(item, idx);
      } else {
        rowsHtml += renderSkuRow(item);
      }
    });

    elements.tableBody.innerHTML = rowsHtml;
    attachTableRowEvents();
  }

  function renderGroupedRow(item, idx) {
    const isExpanded = state.expandedGroups.has(item.sku);
    const stockClass = getStockBadgeClass(item.estoque_total);
    const hasMultipleCosts = item.custo_min !== item.custo_max;
    const custoDisplay = hasMultipleCosts 
      ? `${fmtCurrency.format(item.custo_min)} ~ ${fmtCurrency.format(item.custo_max)}` 
      : fmtCurrency.format(item.custo_min);

    const hasMultiplePrices = item.preco_min !== item.preco_max;
    const precoDisplay = hasMultiplePrices 
      ? `${fmtCurrency.format(item.preco_min)} ~ ${fmtCurrency.format(item.preco_max)}` 
      : fmtCurrency.format(item.preco_min);

    // Shopee
    const cadMin = item.preco_shopee_cad_min || item.preco_shopee_cad || item.preco_shopee_min || 0;
    const cadMax = item.preco_shopee_cad_max || item.preco_shopee_cad || item.preco_shopee_max || 0;
    const promoMin = item.preco_shopee_promo_min || item.preco_shopee_min || item.preco_shopee || 0;
    const promoMax = item.preco_shopee_promo_max || item.preco_shopee_max || item.preco_shopee || 0;
    const descPct = item.shopee_desc_pct || 30.0;

    const shopeeCadDisplay = hasMultipleCosts 
      ? `${fmtCurrency.format(cadMin)} ~ ${fmtCurrency.format(cadMax)}` 
      : fmtCurrency.format(cadMin);

    const shopeePromoDisplay = hasMultipleCosts 
      ? `${fmtCurrency.format(promoMin)} ~ ${fmtCurrency.format(promoMax)}` 
      : fmtCurrency.format(promoMin);

    // TikTok
    const tikCadMin = item.preco_tiktok_cad_min || item.preco_tiktok_cad || item.preco_tiktok_min || 0;
    const tikCadMax = item.preco_tiktok_cad_max || item.preco_tiktok_cad || item.preco_tiktok_max || 0;
    const tikPromoMin = item.preco_tiktok_promo_min || item.preco_tiktok_min || item.preco_tiktok || 0;
    const tikPromoMax = item.preco_tiktok_promo_max || item.preco_tiktok_max || item.preco_tiktok || 0;
    const tikDescPct = item.tiktok_desc_pct || 30.0;

    const tiktokCadDisplay = hasMultipleCosts 
      ? `${fmtCurrency.format(tikCadMin)} ~ ${fmtCurrency.format(tikCadMax)}` 
      : fmtCurrency.format(tikCadMin);

    const tiktokPromoDisplay = hasMultipleCosts 
      ? `${fmtCurrency.format(tikPromoMin)} ~ ${fmtCurrency.format(tikPromoMax)}` 
      : fmtCurrency.format(tikPromoMin);

    const imgSrc = item.img || PLACEHOLDER_IMG;
    const firstSku = item.variacoes && item.variacoes.length > 0 ? item.variacoes[0].sku : item.sku;

    let html = `
      <tr class="accordion-toggle ${isExpanded ? 'accordion-open' : ''}" data-group-sku="${escapeHtml(item.sku)}">
        <td style="text-align: center;">
          <span class="accordion-chevron">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </span>
        </td>
        <td>
          <img src="${imgSrc}" class="product-thumb" alt="${escapeHtml(item.nome)}" 
               onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
               data-img-src="${escapeHtml(imgSrc)}"
               data-img-title="${escapeHtml(item.nome)}"
               data-img-sku="${escapeHtml(item.sku)}"
               data-img-stock="${item.estoque_total}"
               data-img-cost="${item.custo_min}">
        </td>
        <td>
          <div class="product-meta">
            <span class="product-title">${escapeHtml(item.nome)}</span>
            <span class="product-cat">${escapeHtml(item.categoria)}</span>
          </div>
        </td>
        <td>
          <div class="sku-tag">
            <span>${escapeHtml(item.sku)}</span>
            <button class="sku-copy-btn" title="Copiar SKU" data-copy-sku="${escapeHtml(item.sku)}">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            ${item._isEdited ? '<span class="edited-badge" title="Valores alterados manualmente">✏️ Editado</span>' : ''}
          </div>
        </td>
        <td>
          <span class="variation-badge">${item.qtd_variacoes} grade(s)</span>
        </td>
        <td>
          <span class="currency-cost">${custoDisplay}</span>
        </td>
        <td>
          <span class="currency-sale">${precoDisplay}</span>
        </td>
        <td style="background-color: rgba(238, 77, 45, 0.04);">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 500;">Cad:</span>
              <span style="font-weight: 600; text-decoration: line-through; color: var(--text-secondary);">${shopeeCadDisplay}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #ee4d2d; font-size: 0.88rem; background: rgba(238, 77, 45, 0.12); padding: 2px 6px; border-radius: 4px;">
                ${shopeePromoDisplay}
              </strong>
              <span style="background: #ee4d2d; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                -${descPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </td>
        <td style="background-color: rgba(254, 44, 85, 0.04);">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 500;">Cad:</span>
              <span style="font-weight: 600; text-decoration: line-through; color: var(--text-secondary);">${tiktokCadDisplay}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #fe2c55; font-size: 0.88rem; background: rgba(254, 44, 85, 0.12); padding: 2px 6px; border-radius: 4px;">
                ${tiktokPromoDisplay}
              </strong>
              <span style="background: #fe2c55; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                -${tikDescPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </td>
        <td>
          <div class="stock-badge ${stockClass}">
            <span class="stock-dot"></span>
            <span>${fmtNumber.format(item.estoque_total)} un</span>
          </div>
        </td>
        <td>
          <span class="currency-total">${fmtCurrency.format(item.custo_total)}</span>
        </td>
        <td>
          <span class="margin-pill">${item.margem_pct.toFixed(1)}%</span>
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button class="btn-edit-prod" data-edit-sku="${escapeHtml(firstSku)}" title="Editar Preço e Estoque deste produto">
              ✏️ Editar
            </button>
            <button class="btn btn-outline-shopee btn-goto-shopee" data-target-sku="${escapeHtml(firstSku)}" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" title="Abrir análise detalhada no Precificador Shopee">
              Shopee
            </button>
            <button class="btn btn-outline-tiktok btn-goto-tiktok" data-target-sku="${escapeHtml(firstSku)}" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" title="Abrir análise detalhada no Precificador TikTok Shop">
              TikTok
            </button>
          </div>
        </td>
      </tr>
    `;

    if (isExpanded && item.variacoes && item.variacoes.length > 0) {
      html += `
        <tr class="nested-variations-row">
          <td colspan="13" style="padding: 0.5rem 1.5rem 1rem 3rem;">
            <table class="nested-variations-table">
              <thead>
                <tr>
                  <th>Variação / Tamanho</th>
                  <th>SKU Específico</th>
                  <th>Preço Custo</th>
                  <th>Preço Loja</th>
                  <th style="color: #ee4d2d;">Preço Shopee (Cad &amp; Promo)</th>
                  <th style="color: #fe2c55;">Preço TikTok (Cad &amp; Promo)</th>
                  <th>Estoque</th>
                  <th>Custo em Estoque</th>
                  <th>Status</th>
                  <th style="text-align: center;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${item.variacoes.map(v => {
                  const vStockClass = getStockBadgeClass(v.estoque);
                  const vDesc = v.shopee_desc_pct || descPct;
                  const vTikDesc = v.tiktok_desc_pct || tikDescPct;
                  return `
                    <tr>
                      <td><strong>${escapeHtml(v.variacao)}</strong></td>
                      <td>
                        <span class="sku-tag">
                          ${escapeHtml(v.sku)}
                          <button class="sku-copy-btn" title="Copiar SKU" data-copy-sku="${escapeHtml(v.sku)}">
                            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
                          </button>
                          ${v._isEdited ? '<span class="edited-badge" title="Variação alterada">✏️</span>' : ''}
                        </span>
                      </td>
                      <td class="currency-cost">${fmtCurrency.format(v.custo)}</td>
                      <td class="currency-sale">
                        ${v.preco_promo > 0 ? `<span class="currency-strike">${fmtCurrency.format(v.preco_cheio)}</span>` : ''}
                        ${fmtCurrency.format(v.preco_venda)}
                      </td>
                      <td style="background-color: rgba(238, 77, 45, 0.04);">
                        <div style="display: flex; flex-direction: column; gap: 1px;">
                          <div style="font-size: 0.7rem; color: var(--text-muted);">
                            <span>Cad: </span>
                            <span style="text-decoration: line-through; color: var(--text-secondary); font-weight: 600;">${fmtCurrency.format(v.preco_shopee_cad || v.preco_shopee)}</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 2px;">
                            <strong style="color: #ee4d2d; background: rgba(238, 77, 45, 0.1); padding: 1px 5px; border-radius: 3px; font-size: 0.82rem;">
                              ${fmtCurrency.format(v.preco_shopee_promo || v.preco_shopee)}
                            </strong>
                            <span style="background: #ee4d2d; color: white; font-size: 0.6rem; font-weight: 700; padding: 1px 3px; border-radius: 3px;">
                              -${vDesc.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style="background-color: rgba(254, 44, 85, 0.04);">
                        <div style="display: flex; flex-direction: column; gap: 1px;">
                          <div style="font-size: 0.7rem; color: var(--text-muted);">
                            <span>Cad: </span>
                            <span style="text-decoration: line-through; color: var(--text-secondary); font-weight: 600;">${fmtCurrency.format(v.preco_tiktok_cad || v.preco_tiktok)}</span>
                          </div>
                          <div style="display: flex; align-items: center; gap: 2px;">
                            <strong style="color: #fe2c55; background: rgba(254, 44, 85, 0.1); padding: 1px 5px; border-radius: 3px; font-size: 0.82rem;">
                              ${fmtCurrency.format(v.preco_tiktok_promo || v.preco_tiktok)}
                            </strong>
                            <span style="background: #fe2c55; color: white; font-size: 0.6rem; font-weight: 700; padding: 1px 3px; border-radius: 3px;">
                              -${vTikDesc.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="stock-badge ${vStockClass}">
                          <span class="stock-dot"></span>
                          <span>${fmtNumber.format(v.estoque)} un</span>
                        </div>
                      </td>
                      <td class="currency-total">${fmtCurrency.format(v.custo_total)}</td>
                      <td>
                        <span style="font-size: 0.75rem; color: ${v.ativo === 'S' ? 'var(--success-dot)' : 'var(--danger-dot)'};">
                          ● ${v.ativo === 'S' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <div style="display: flex; gap: 3px; justify-content: center; align-items: center;">
                          <button class="btn-edit-prod" data-edit-sku="${escapeHtml(v.sku)}" style="padding: 0.15rem 0.45rem; font-size: 0.68rem;" title="Editar Preço e Estoque">
                            ✏️ Editar
                          </button>
                          <button class="btn btn-outline-shopee btn-goto-shopee" data-target-sku="${escapeHtml(v.sku)}" style="padding: 0.15rem 0.35rem; font-size: 0.68rem;" title="Abrir no Precificador Shopee">
                            Shopee
                          </button>
                          <button class="btn btn-outline-tiktok btn-goto-tiktok" data-target-sku="${escapeHtml(v.sku)}" style="padding: 0.15rem 0.35rem; font-size: 0.68rem;" title="Abrir no Precificador TikTok Shop">
                            TikTok
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </td>
        </tr>
      `;
    }

    return html;
  }

  function renderSkuRow(item) {
    const stockClass = getStockBadgeClass(item.estoque);
    const imgSrc = item.img || PLACEHOLDER_IMG;

    // Shopee
    const cadPrice = item.preco_shopee_cad || item.preco_shopee;
    const promoPrice = item.preco_shopee_promo || item.preco_shopee;
    const descPct = item.shopee_desc_pct || 30.0;

    // TikTok
    const tikCadPrice = item.preco_tiktok_cad || item.preco_tiktok;
    const tikPromoPrice = item.preco_tiktok_promo || item.preco_tiktok;
    const tikDescPct = item.tiktok_desc_pct || 30.0;

    return `
      <tr>
        <td>
          <img src="${imgSrc}" class="product-thumb" alt="${escapeHtml(item.nome)}" 
               onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
               data-img-src="${escapeHtml(imgSrc)}"
               data-img-title="${escapeHtml(item.nome)} (${escapeHtml(item.variacao)})"
               data-img-sku="${escapeHtml(item.sku)}"
               data-img-stock="${item.estoque}"
               data-img-cost="${item.custo}">
        </td>
        <td>
          <div class="product-meta">
            <span class="product-title">${escapeHtml(item.nome)}</span>
            <span class="product-cat">${escapeHtml(item.categoria)}</span>
          </div>
        </td>
        <td>
          <div class="sku-tag">
            <span>${escapeHtml(item.sku)}</span>
            <button class="sku-copy-btn" title="Copiar SKU" data-copy-sku="${escapeHtml(item.sku)}">
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            </button>
            ${item._isEdited ? '<span class="edited-badge" title="Valores alterados manualmente">✏️ Editado</span>' : ''}
          </div>
        </td>
        <td>
          <span class="variation-badge">${escapeHtml(item.variacao)}</span>
        </td>
        <td>
          <span class="currency-cost">${fmtCurrency.format(item.custo)}</span>
        </td>
        <td>
          <span class="currency-sale">
            ${item.preco_promo > 0 ? `<span class="currency-strike">${fmtCurrency.format(item.preco_cheio)}</span>` : ''}
            ${fmtCurrency.format(item.preco_venda)}
          </span>
        </td>
        <td style="background-color: rgba(238, 77, 45, 0.04);">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 500;">Cad:</span>
              <span style="font-weight: 600; text-decoration: line-through; color: var(--text-secondary);">${fmtCurrency.format(cadPrice)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #ee4d2d; font-size: 0.88rem; background: rgba(238, 77, 45, 0.12); padding: 2px 6px; border-radius: 4px;">
                ${fmtCurrency.format(promoPrice)}
              </strong>
              <span style="background: #ee4d2d; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                -${descPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </td>
        <td style="background-color: rgba(254, 44, 85, 0.04);">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 500;">Cad:</span>
              <span style="font-weight: 600; text-decoration: line-through; color: var(--text-secondary);">${fmtCurrency.format(tikCadPrice)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: #fe2c55; font-size: 0.88rem; background: rgba(254, 44, 85, 0.12); padding: 2px 6px; border-radius: 4px;">
                ${fmtCurrency.format(tikPromoPrice)}
              </strong>
              <span style="background: #fe2c55; color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                -${tikDescPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </td>
        <td>
          <div class="stock-badge ${stockClass}">
            <span class="stock-dot"></span>
            <span>${fmtNumber.format(item.estoque)} un</span>
          </div>
        </td>
        <td>
          <span class="currency-total">${fmtCurrency.format(item.custo_total)}</span>
        </td>
        <td>
          <span class="margin-pill">${item.margem_pct.toFixed(1)}%</span>
        </td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
            <button class="btn-edit-prod" data-edit-sku="${escapeHtml(item.sku)}" title="Editar Preço e Estoque">
              ✏️ Editar
            </button>
            <button class="btn btn-outline-shopee btn-goto-shopee" data-target-sku="${escapeHtml(item.sku)}" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" title="Abrir análise detalhada no Precificador Shopee">
              Shopee
            </button>
            <button class="btn btn-outline-tiktok btn-goto-tiktok" data-target-sku="${escapeHtml(item.sku)}" style="padding: 0.25rem 0.5rem; font-size: 0.72rem;" title="Abrir análise detalhada no Precificador TikTok Shop">
              TikTok
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // =========================================================================
  // Renderização em Cards (Catálogo)
  // =========================================================================
  function renderCards() {
    const isGrouped = state.viewStructure === 'grouped';
    const pageItems = getPageItems();

    if (pageItems.length === 0) {
      elements.cardsContainer.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>Nenhum produto encontrado</h3>
            <p>Tente ajustar os filtros ou o termo pesquisado.</p>
          </div>
        </div>
      `;
      return;
    }

    let cardsHtml = '';

    pageItems.forEach(item => {
      const stock = isGrouped ? item.estoque_total : item.estoque;
      const stockClass = getStockBadgeClass(stock);
      const imgSrc = item.img || PLACEHOLDER_IMG;
      const firstSku = isGrouped && item.variacoes?.length ? item.variacoes[0].sku : item.sku;

      const custo = isGrouped 
        ? (item.custo_min === item.custo_max ? fmtCurrency.format(item.custo_min) : `${fmtCurrency.format(item.custo_min)}~${fmtCurrency.format(item.custo_max)}`)
        : fmtCurrency.format(item.custo);

      const preco = isGrouped 
        ? (item.preco_min === item.preco_max ? fmtCurrency.format(item.preco_min) : `${fmtCurrency.format(item.preco_min)}~${fmtCurrency.format(item.preco_max)}`)
        : fmtCurrency.format(item.preco_venda);

      // Shopee
      const cadMin = item.preco_shopee_cad_min || item.preco_shopee_cad || item.preco_shopee_min || 0;
      const cadMax = item.preco_shopee_cad_max || item.preco_shopee_cad || item.preco_shopee_max || 0;
      const promoMin = item.preco_shopee_promo_min || item.preco_shopee_min || item.preco_shopee || 0;
      const promoMax = item.preco_shopee_promo_max || item.preco_shopee_max || item.preco_shopee || 0;
      const descPct = item.shopee_desc_pct || 30.0;

      const hasMultipleCosts = isGrouped && item.custo_min !== item.custo_max;
      const shopeeCadDisplay = isGrouped && hasMultipleCosts 
        ? `${fmtCurrency.format(cadMin)} ~ ${fmtCurrency.format(cadMax)}`
        : fmtCurrency.format(cadMin);

      const shopeePromoDisplay = isGrouped && hasMultipleCosts 
        ? `${fmtCurrency.format(promoMin)} ~ ${fmtCurrency.format(promoMax)}`
        : fmtCurrency.format(item.preco_shopee_promo || promoMin);

      // TikTok
      const tikCadMin = item.preco_tiktok_cad_min || item.preco_tiktok_cad || item.preco_tiktok_min || 0;
      const tikCadMax = item.preco_tiktok_cad_max || item.preco_tiktok_cad || item.preco_tiktok_max || 0;
      const tikPromoMin = item.preco_tiktok_promo_min || item.preco_tiktok_min || item.preco_tiktok || 0;
      const tikPromoMax = item.preco_tiktok_promo_max || item.preco_tiktok_max || item.preco_tiktok || 0;
      const tikDescPct = item.tiktok_desc_pct || 30.0;

      const tiktokCadDisplay = isGrouped && hasMultipleCosts 
        ? `${fmtCurrency.format(tikCadMin)} ~ ${fmtCurrency.format(tikCadMax)}`
        : fmtCurrency.format(tikCadMin);

      const tiktokPromoDisplay = isGrouped && hasMultipleCosts 
        ? `${fmtCurrency.format(tikPromoMin)} ~ ${fmtCurrency.format(tikPromoMax)}`
        : fmtCurrency.format(item.preco_tiktok_promo || tikPromoMin);

      cardsHtml += `
        <div class="product-card">
          <div class="card-img-wrapper">
            <div class="card-top-badges">
              <span class="stock-badge ${stockClass}">
                <span class="stock-dot"></span>
                <span>${fmtNumber.format(stock)} un</span>
              </span>
              <span class="kpi-chip ${item.ativo === 'S' ? 'kpi-chip-success' : 'stock-zero'}">
                ${item.ativo === 'S' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <img src="${imgSrc}" class="card-img" alt="${escapeHtml(item.nome)}"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}';"
                 data-img-src="${escapeHtml(imgSrc)}"
                 data-img-title="${escapeHtml(item.nome)}"
                 data-img-sku="${escapeHtml(item.sku)}"
                 data-img-stock="${stock}"
                 data-img-cost="${isGrouped ? item.custo_min : item.custo}">
          </div>
          <div class="card-body">
            <span class="card-category">${escapeHtml(item.categoria)}</span>
            <h3 class="card-title">${escapeHtml(item.nome)}</h3>
            <div class="sku-tag" style="align-self: flex-start;">
              <span>SKU: ${escapeHtml(item.sku)}</span>
              <button class="sku-copy-btn" data-copy-sku="${escapeHtml(item.sku)}">
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
              </button>
              ${item._isEdited ? '<span class="edited-badge" title="Valores alterados manualmente">✏️ Editado</span>' : ''}
            </div>

            ${isGrouped && item.variacoes ? `
              <div class="card-variations-chips">
                ${item.variacoes.map(v => `
                  <span class="card-var-chip ${v.estoque > 0 ? 'has-stock' : ''}">
                    ${escapeHtml(v.variacao)}: <strong>${v.estoque}</strong>
                  </span>
                `).join('')}
              </div>
            ` : `
              <div>
                <span class="variation-badge">${escapeHtml(item.variacao)}</span>
              </div>
            `}

            <div class="card-metrics-grid">
              <div class="card-metric-item">
                <span class="card-metric-label">Preço Custo</span>
                <span class="card-metric-val currency-cost">${custo}</span>
              </div>
              <div class="card-metric-item">
                <span class="card-metric-label">Preço Loja</span>
                <span class="card-metric-val currency-sale">${preco}</span>
              </div>
              <div class="card-metric-item" style="background: rgba(238, 77, 45, 0.08); border-radius: var(--radius-sm); padding: 5px; border: 1px solid rgba(238, 77, 45, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="card-metric-label" style="color: #ee4d2d; font-weight: 700;">Preços Shopee</span>
                  <span style="background: #ee4d2d; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">-${descPct.toFixed(0)}% OFF</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 3px;">
                  <span style="font-size: 0.7rem; color: var(--text-muted);">Cadastro (Âncora):</span>
                  <span style="font-size: 0.75rem; text-decoration: line-through; color: var(--text-secondary); font-weight: 600;">${shopeeCadDisplay}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 1px;">
                  <span style="font-size: 0.72rem; color: #ee4d2d; font-weight: 600;">Com Desconto:</span>
                  <span style="font-size: 0.9rem; color: #ee4d2d; font-weight: 800;">${shopeePromoDisplay}</span>
                </div>
              </div>
              <div class="card-metric-item" style="background: rgba(254, 44, 85, 0.08); border-radius: var(--radius-sm); padding: 5px; border: 1px solid rgba(254, 44, 85, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="card-metric-label" style="color: #fe2c55; font-weight: 700;">Preços TikTok Shop</span>
                  <span style="background: #fe2c55; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">-${tikDescPct.toFixed(0)}% OFF</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 3px;">
                  <span style="font-size: 0.7rem; color: var(--text-muted);">Cadastro (Âncora):</span>
                  <span style="font-size: 0.75rem; text-decoration: line-through; color: var(--text-secondary); font-weight: 600;">${tiktokCadDisplay}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 1px;">
                  <span style="font-size: 0.72rem; color: #fe2c55; font-weight: 600;">Com Desconto:</span>
                  <span style="font-size: 0.9rem; color: #fe2c55; font-weight: 800;">${tiktokPromoDisplay}</span>
                </div>
              </div>
              <div class="card-metric-item">
                <span class="card-metric-label">Custo Estoque</span>
                <span class="card-metric-val currency-total">${fmtCurrency.format(item.custo_total)}</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.35rem; margin-top: 0.5rem;">
              <button class="btn-edit-prod" data-edit-sku="${escapeHtml(firstSku)}" style="justify-content: center; font-size: 0.72rem; padding: 0.35rem 0.2rem;" title="Editar Preço e Estoque">
                ✏️ Editar
              </button>
              <button class="btn btn-outline-shopee btn-goto-shopee" data-target-sku="${escapeHtml(firstSku)}" style="justify-content: center; font-size: 0.72rem; padding: 0.35rem 0.2rem;" title="Simulador Shopee">
                Shopee
              </button>
              <button class="btn btn-outline-tiktok btn-goto-tiktok" data-target-sku="${escapeHtml(firstSku)}" style="justify-content: center; font-size: 0.72rem; padding: 0.35rem 0.2rem;" title="Simulador TikTok">
                TikTok
              </button>
            </div>
          </div>
        </div>
      `;
    });

    elements.cardsContainer.innerHTML = cardsHtml;
    attachCardEvents();
  }

  // =========================================================================
  // Paginação (Catálogo)
  // =========================================================================
  function getPageItems() {
    const total = state.filteredItems.length;
    const size = state.pagination.pageSize;

    if (size === -1) {
      return state.filteredItems;
    }

    const start = (state.pagination.currentPage - 1) * size;
    return state.filteredItems.slice(start, start + size);
  }

  function renderPagination() {
    const total = state.filteredItems.length;
    const size = state.pagination.pageSize;

    if (size === -1 || total === 0) {
      elements.paginationInfo.textContent = `Mostrando todos os ${total} itens`;
      elements.paginationPages.innerHTML = '';
      return;
    }

    const totalPages = Math.ceil(total / size);
    const current = state.pagination.currentPage;
    const start = (current - 1) * size + 1;
    const end = Math.min(current * size, total);

    elements.paginationInfo.textContent = `Mostrando ${start}–${end} de ${total} itens`;

    let html = `
      <button class="page-btn" ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">
        &laquo;
      </button>
    `;

    let pageNumbers = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      if (current <= 4) {
        pageNumbers = [1, 2, 3, 4, 5, '...', totalPages];
      } else if (current >= totalPages - 3) {
        pageNumbers = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pageNumbers = [1, '...', current - 1, current, current + 1, '...', totalPages];
      }
    }

    pageNumbers.forEach(p => {
      if (p === '...') {
        html += '<span style="padding: 0 4px; color: var(--text-muted);">...</span>';
      } else {
        html += `
          <button class="page-btn ${p === current ? 'active' : ''}" data-page="${p}">
            ${p}
          </button>
        `;
      }
    });

    html += `
      <button class="page-btn" ${current === totalPages ? 'disabled' : ''} data-page="${current + 1}">
        &raquo;
      </button>
    `;

    elements.paginationPages.innerHTML = html;

    elements.paginationPages.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'));
        if (page && page !== state.pagination.currentPage) {
          state.pagination.currentPage = page;
          renderView();
          window.scrollTo({ top: elements.tableContainer ? elements.tableContainer.offsetTop - 80 : 0, behavior: 'smooth' });
        }
      });
    });
  }

  // =========================================================================
  // Auxiliares de Ordenação e Estilos
  // =========================================================================
  function getSortIcon(field) {
    if (state.sort.field !== field) {
      return '<span class="sort-icon">↕</span>';
    }
    return state.sort.direction === 'asc' 
      ? '<span class="sort-icon">▲</span>' 
      : '<span class="sort-icon">▼</span>';
  }

  function getStockBadgeClass(stock) {
    if (stock > 2) return 'stock-high';
    if (stock > 0) return 'stock-low';
    return 'stock-zero';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // Configuração de Event Listeners (Shopee)
  // =========================================================================
  function setupShopeeEventListeners() {
    if (elements.navBtnCatalog) {
      elements.navBtnCatalog.addEventListener('click', () => switchTab('catalog'));
    }
    if (elements.navBtnShopee) {
      elements.navBtnShopee.addEventListener('click', () => switchTab('shopee'));
    }

    const updateAllShopee = () => {
      computeCatalogShopeePrices();
      renderView();
      updateShopeeSimulator();
      renderShopeeTable();
    };

    if (elements.shopeeCfgMargin) elements.shopeeCfgMargin.addEventListener('input', updateAllShopee);
    if (elements.shopeeCfgPack) elements.shopeeCfgPack.addEventListener('input', updateAllShopee);
    if (elements.shopeeCfgPromoDiscount) {
      elements.shopeeCfgPromoDiscount.addEventListener('input', (e) => {
        const val = e.target.value;
        if (elements.simPromoDiscountInput) {
          elements.simPromoDiscountInput.value = val;
        }
        if (elements.simDiscountPills) {
          elements.simDiscountPills.forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-discount') === val);
          });
        }
        updateAllShopee();
      });
    }
    if (elements.shopeeCfgSellerType) elements.shopeeCfgSellerType.addEventListener('change', updateAllShopee);
    if (elements.shopeeCfgTax) elements.shopeeCfgTax.addEventListener('input', updateAllShopee);
    if (elements.shopeeCfgRounding) elements.shopeeCfgRounding.addEventListener('change', updateAllShopee);

    if (elements.simPromoDiscountInput) {
      elements.simPromoDiscountInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (elements.shopeeCfgPromoDiscount) elements.shopeeCfgPromoDiscount.value = val;
        if (elements.simDiscountPills) {
          elements.simDiscountPills.forEach(pill => {
            pill.classList.toggle('active', pill.getAttribute('data-discount') === val);
          });
        }
        updateAllShopee();
      });
    }

    if (elements.simDiscountPills) {
      elements.simDiscountPills.forEach(pill => {
        pill.addEventListener('click', () => {
          const disc = pill.getAttribute('data-discount');
          if (elements.simPromoDiscountInput) elements.simPromoDiscountInput.value = disc;
          if (elements.shopeeCfgPromoDiscount) elements.shopeeCfgPromoDiscount.value = disc;
          elements.simDiscountPills.forEach(p => p.classList.toggle('active', p === pill));
          updateAllShopee();
        });
      });
    }

    if (elements.rulesAccordionToggle) {
      elements.rulesAccordionToggle.addEventListener('click', () => {
        const isOpen = elements.rulesAccordionContent.classList.toggle('open');
        if (elements.rulesChevron) {
          elements.rulesChevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      });
    }

    // Autocomplete / Busca por SKU e Nome no Simulador
    if (elements.simProductSearch && elements.simAutocompleteList) {
      let simSearchTimeout;
      let activeIndex = -1;

      const renderSimAutocomplete = (query) => {
        if (!state.data?.itens_detalhados) return;
        const q = (query || '').trim().toLowerCase();
        
        let matches = [];
        if (q.length === 0) {
          // Mostrar produtos com estoque primeiro
          matches = state.data.itens_detalhados
            .filter(it => it.estoque > 0 && it.custo > 0)
            .slice(0, 20);
        } else {
          const terms = q.split(/\s+/).filter(Boolean);
          matches = state.data.itens_detalhados.filter(item => {
            const itemStr = `${item.sku} ${item.nome} ${item.variacao || ''} ${item.categoria || ''}`.toLowerCase();
            return terms.every(t => itemStr.includes(t));
          }).slice(0, 25);
        }

        activeIndex = -1;

        if (matches.length === 0) {
          elements.simAutocompleteList.innerHTML = `<div class="sim-autocomplete-empty">Nenhum produto encontrado para "<strong>${escapeHtml(q)}</strong>"</div>`;
        } else {
          elements.simAutocompleteList.innerHTML = matches.map((it, idx) => {
            const thumb = it.img || PLACEHOLDER_IMG;
            const stockBadge = it.estoque > 0 ? `Estoque: ${it.estoque} un` : 'Sem estoque';
            return `
              <div class="sim-autocomplete-item ${idx === 0 ? 'active' : ''}" data-sku="${escapeHtml(it.sku)}" data-index="${idx}">
                <img src="${thumb}" class="sim-autocomplete-thumb" alt="${escapeHtml(it.nome)}">
                <div class="sim-autocomplete-info">
                  <div class="sim-autocomplete-title">${escapeHtml(it.nome)}</div>
                  <div class="sim-autocomplete-meta">
                    <span class="sim-autocomplete-sku-badge">${escapeHtml(it.sku)}</span>
                    <span>${escapeHtml(it.variacao ? `[${it.variacao}]` : '')}</span>
                    <span class="sim-autocomplete-cost">Custo: ${fmtCurrency.format(it.custo)}</span>
                    <span class="sim-autocomplete-stock">• ${stockBadge}</span>
                    <span style="color: #2563eb;">• Loja: ${fmtCurrency.format(it.preco_venda)}</span>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          elements.simAutocompleteList.querySelectorAll('.sim-autocomplete-item').forEach(el => {
            el.addEventListener('click', () => {
              const sku = el.getAttribute('data-sku');
              if (sku) selectShopeeProduct(sku);
            });
          });
        }

        elements.simAutocompleteList.style.display = 'block';
      };

      elements.simProductSearch.addEventListener('input', (e) => {
        clearTimeout(simSearchTimeout);
        const val = e.target.value;
        if (elements.simSearchClear) {
          elements.simSearchClear.style.display = val.length > 0 ? 'block' : 'none';
        }
        simSearchTimeout = setTimeout(() => {
          renderSimAutocomplete(val);
        }, 120);
      });

      elements.simProductSearch.addEventListener('focus', () => {
        renderSimAutocomplete(elements.simProductSearch.value);
      });

      elements.simProductSearch.addEventListener('keydown', (e) => {
        if (elements.simAutocompleteList.style.display === 'none') return;
        const items = elements.simAutocompleteList.querySelectorAll('.sim-autocomplete-item');
        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          activeIndex = (activeIndex + 1) % items.length;
          items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
          items[activeIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          activeIndex = (activeIndex - 1 + items.length) % items.length;
          items.forEach((it, idx) => it.classList.toggle('active', idx === activeIndex));
          items[activeIndex]?.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const target = activeIndex >= 0 ? items[activeIndex] : items[0];
          if (target) {
            const sku = target.getAttribute('data-sku');
            if (sku) selectShopeeProduct(sku);
          }
        } else if (e.key === 'Escape') {
          elements.simAutocompleteList.style.display = 'none';
        }
      });

      if (elements.simSearchClear) {
        elements.simSearchClear.addEventListener('click', () => {
          elements.simProductSearch.value = '';
          elements.simSearchClear.style.display = 'none';
          elements.simAutocompleteList.style.display = 'none';
          state.shopee.selectedProductSku = null;
          if (elements.simProductPreview) elements.simProductPreview.style.display = 'none';
          if (elements.simCostInput) elements.simCostInput.value = '18.00';
          updateShopeeSimulator();
          elements.simProductSearch.focus();
        });
      }

      document.addEventListener('click', (e) => {
        if (!elements.simProductSearch.contains(e.target) && !elements.simAutocompleteList.contains(e.target)) {
          elements.simAutocompleteList.style.display = 'none';
        }
      });
    }

    if (elements.simProductSelect) {
      elements.simProductSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          selectShopeeProduct(e.target.value);
        }
      });
    }

    if (elements.simCostInput) elements.simCostInput.addEventListener('input', updateShopeeSimulator);
    if (elements.simPackInput) {
      elements.simPackInput.addEventListener('input', (e) => {
        if (elements.shopeeCfgPack) elements.shopeeCfgPack.value = e.target.value;
        updateShopeeSimulator();
        renderShopeeTable();
      });
    }
    if (elements.simManualPrice) elements.simManualPrice.addEventListener('input', updateShopeeSimulator);

    if (elements.shopeeTableSearch) {
      let massTimeout;
      elements.shopeeTableSearch.addEventListener('input', (e) => {
        clearTimeout(massTimeout);
        massTimeout = setTimeout(() => {
          state.shopee.tableSearch = e.target.value;
          state.shopee.currentPage = 1;
          renderShopeeTable();
        }, 150);
      });
    }

    if (elements.shopeeTableStockFilter) {
      elements.shopeeTableStockFilter.addEventListener('change', (e) => {
        state.shopee.tableStockFilter = e.target.value;
        state.shopee.currentPage = 1;
        renderShopeeTable();
      });
    }

    if (elements.btnExportShopee) {
      elements.btnExportShopee.addEventListener('click', exportShopeeToCsv);
    }
  }

  // =========================================================================
  // Configuração de Event Listeners (Catálogo)
  // =========================================================================
  function setupEventListeners() {
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const val = e.target.value;
      elements.searchClear.classList.toggle('visible', val.length > 0);
      searchTimeout = setTimeout(() => {
        state.filters.search = val;
        applyFilters();
      }, 150);
    });

    elements.searchClear.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.searchClear.classList.remove('visible');
      state.filters.search = '';
      applyFilters();
      elements.searchInput.focus();
    });

    elements.categoryFilter.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      applyFilters();
    });

    elements.statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      applyFilters();
    });

    elements.stockPills.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.stockPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.filters.stockStatus = pill.getAttribute('data-stock');
        applyFilters();
      });
    });

    elements.structureBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.structureBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.viewStructure = btn.getAttribute('data-structure');
        
        if (state.viewStructure === 'grouped') {
          if (state.sort.field === 'estoque') state.sort.field = 'estoque_total';
          if (state.sort.field === 'custo') state.sort.field = 'custo_min';
        } else {
          if (state.sort.field === 'estoque_total') state.sort.field = 'estoque';
          if (state.sort.field === 'custo_min') state.sort.field = 'custo';
        }

        applyFilters();
      });
    });

    elements.viewModeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.viewModeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.viewMode = btn.getAttribute('data-view-mode');
        renderView();
      });
    });

    elements.pageSizeSelect.addEventListener('change', (e) => {
      state.pagination.pageSize = parseInt(e.target.value);
      state.pagination.currentPage = 1;
      renderView();
    });

    elements.themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });

    elements.btnPrint.addEventListener('click', () => window.print());
    elements.btnExport.addEventListener('click', exportToCsv);

    if (elements.btnExportUpdated) {
      elements.btnExportUpdated.addEventListener('click', exportUpdatedCatalogToExcel);
    }
    if (elements.btnResetEdits) {
      elements.btnResetEdits.addEventListener('click', resetAllProductEdits);
    }

    // Modal de Edição de Produto
    if (elements.editProdClose) {
      elements.editProdClose.addEventListener('click', closeEditProductModal);
    }
    if (elements.editBtnCancel) {
      elements.editBtnCancel.addEventListener('click', closeEditProductModal);
    }
    if (elements.modalEditProduct) {
      elements.modalEditProduct.addEventListener('click', (e) => {
        if (e.target === elements.modalEditProduct) closeEditProductModal();
      });
    }
    if (elements.editProdForm) {
      elements.editProdForm.addEventListener('submit', saveProductEdit);
    }
    if (elements.editBtnResetSingle) {
      elements.editBtnResetSingle.addEventListener('click', () => {
        const sku = elements.editProdSkuInput?.value;
        if (sku) resetProductEdit(sku);
      });
    }

    // Inputs de recálculo instantâneo no modal de edição
    if (elements.editInputPrecoVenda) elements.editInputPrecoVenda.addEventListener('input', updateEditModalPreview);
    if (elements.editInputCusto) elements.editInputCusto.addEventListener('input', updateEditModalPreview);
    if (elements.editInputEstoque) elements.editInputEstoque.addEventListener('input', updateEditModalPreview);
    if (elements.editInputPrecoPromo) elements.editInputPrecoPromo.addEventListener('input', updateEditModalPreview);

    elements.btnUpload.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileSelect);

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dragOverlay.classList.add('active');
    });

    elements.dragOverlay.addEventListener('dragleave', (e) => {
      elements.dragOverlay.classList.remove('active');
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dragOverlay.classList.remove('active');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processUploadedFile(e.dataTransfer.files[0]);
      }
    });

    elements.lightboxClose.addEventListener('click', closeLightbox);
    elements.lightboxModal.addEventListener('click', (e) => {
      if (e.target === elements.lightboxModal) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
        closeEditProductModal();
      }
    });
  }

  function attachTableRowEvents() {
    elements.tableHead.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        if (state.sort.field === field) {
          state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.field = field;
        }
        state.sort.direction = 'desc';
        applyFilters();
      });
    });

    elements.tableBody.querySelectorAll('tr.accordion-toggle').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('.sku-copy-btn') || e.target.closest('.product-thumb') || e.target.closest('.btn-goto-shopee') || e.target.closest('.btn-goto-tiktok') || e.target.closest('.btn-edit-prod')) return;

        const sku = tr.getAttribute('data-group-sku');
        if (state.expandedGroups.has(sku)) {
          state.expandedGroups.delete(sku);
        } else {
          state.expandedGroups.add(sku);
        }
        renderTable();
      });
    });

    elements.tableBody.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-edit-sku');
        if (sku) openEditProductModal(sku);
      });
    });

    elements.tableBody.querySelectorAll('.product-thumb').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        openLightbox(
          img.getAttribute('data-img-src'),
          img.getAttribute('data-img-title'),
          img.getAttribute('data-img-sku'),
          parseFloat(img.getAttribute('data-img-stock')) || 0,
          parseFloat(img.getAttribute('data-img-cost')) || 0
        );
      });
    });

    elements.tableBody.querySelectorAll('[data-copy-sku]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copySku(btn.getAttribute('data-copy-sku'));
      });
    });

    elements.tableBody.querySelectorAll('.btn-goto-shopee').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-target-sku');
        switchTab('shopee');
        selectShopeeProduct(sku);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Produto ${sku} aberto no Precificador Shopee!`, 'info');
      });
    });

    elements.tableBody.querySelectorAll('.btn-goto-tiktok').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-target-sku');
        switchTab('tiktok');
        selectTikTokProduct(sku);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Produto ${sku} aberto no Precificador TikTok Shop!`, 'info');
      });
    });
  }

  function attachCardEvents() {
    elements.cardsContainer.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-edit-sku');
        if (sku) openEditProductModal(sku);
      });
    });

    elements.cardsContainer.querySelectorAll('.card-img').forEach(img => {
      img.addEventListener('click', () => {
        openLightbox(
          img.getAttribute('data-img-src'),
          img.getAttribute('data-img-title'),
          img.getAttribute('data-img-sku'),
          parseFloat(img.getAttribute('data-img-stock')) || 0,
          parseFloat(img.getAttribute('data-img-cost')) || 0
        );
      });
    });

    elements.cardsContainer.querySelectorAll('[data-copy-sku]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copySku(btn.getAttribute('data-copy-sku'));
      });
    });

    elements.cardsContainer.querySelectorAll('.btn-goto-shopee').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-target-sku');
        switchTab('shopee');
        selectShopeeProduct(sku);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Produto ${sku} aberto no Precificador Shopee!`, 'info');
      });
    });

    elements.cardsContainer.querySelectorAll('.btn-goto-tiktok').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.getAttribute('data-target-sku');
        switchTab('tiktok');
        selectTikTokProduct(sku);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(`Produto ${sku} aberto no Precificador TikTok Shop!`, 'info');
      });
    });
  }

  // =========================================================================
  // Processamento de Nova Planilha no Navegador (SheetJS)
  // =========================================================================
  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  }

  function processUploadedFile(file) {
    if (!window.XLSX) {
      showToast('Biblioteca SheetJS ainda carregando. Aguarde um segundo e tente novamente.', 'error');
      return;
    }

    showToast(`Carregando planilha "${file.name}"...`, 'info');

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        if (!rows || rows.length < 3) {
          showToast('A planilha parece estar vazia ou em formato incompatível.', 'error');
          return;
        }

        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(5, rows.length); r++) {
          const rowVals = rows[r].map(v => String(v || '').toLowerCase().trim());
          if (rowVals.includes('sku') && (rowVals.includes('tipo') || rowVals.includes('id'))) {
            headerRowIdx = r;
            break;
          }
        }

        if (headerRowIdx === -1) headerRowIdx = 1;

        const headers = rows[headerRowIdx].map(h => String(h || '').trim());
        const getIdx = (colName) => headers.indexOf(colName);

        const colId = getIdx('id');
        const colTipo = getIdx('tipo');
        const colSkuPai = getIdx('sku-pai');
        const colSku = getIdx('sku');
        const colAtivo = getIdx('ativo');
        const colNome = getIdx('nome');
        const colEstoque = getIdx('estoque-quantidade');
        const colCusto = getIdx('preco-custo');
        const colCheio = getIdx('preco-cheio');
        const colPromo = getIdx('preco-promocional');
        const colCat1 = getIdx('categoria-nome-nivel-1');
        const colCat2 = getIdx('categoria-nome-nivel-2');
        const colImg1 = getIdx('imagem-1');
        const colGradeTam = getIdx('grade-tamanho');
        const colGradeCor = getIdx('grade-produto-com-uma-cor');
        const colGradeAcess = getIdx('grade-acessorios');

        const parents = {};
        const items = [];
        const categoriasSet = new Set();

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const tipo = String(row[colTipo] || '').trim();
          if (tipo === 'com-variacao') {
            const sku = String(row[colSku] || '').trim();
            const cat1 = String(row[colCat1] || '').trim();
            const cat2 = String(row[colCat2] || '').trim();
            const categoria = cat1 + (cat2 ? ' > ' + cat2 : '');

            parents[sku] = {
              id: row[colId],
              sku: sku,
              nome: String(row[colNome] || '').trim(),
              ativo: row[colAtivo] || 'S',
              categoria: categoria,
              cat1: cat1,
              cat2: cat2,
              img: String(row[colImg1] || '').trim(),
              variacoes: []
            };
          }
        }

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const tipo = String(row[colTipo] || '').trim();
          if (tipo !== 'variacao' && tipo !== 'sem-variacao') continue;

          const sku = String(row[colSku] || '').trim();
          const skuPai = tipo === 'variacao' ? String(row[colSkuPai] || '').trim() : '';
          const parent = parents[skuPai] || {};

          let nome = String(row[colNome] || '').trim();
          if (!nome && parent.nome) nome = parent.nome;
          if (!nome) nome = sku;

          let img = String(row[colImg1] || '').trim();
          if (!img && parent.img) img = parent.img;

          let cat1 = String(row[colCat1] || '').trim() || parent.cat1 || '';
          let cat2 = String(row[colCat2] || '').trim() || parent.cat2 || '';
          let categoria = (cat1 + (cat2 ? ' > ' + cat2 : '')).trim() || 'Sem Categoria';
          categoriasSet.add(categoria);

          const tam = String(row[colGradeTam] || '').trim();
          const cor = String(row[colGradeCor] || '').trim();
          const acess = String(row[colGradeAcess] || '').trim();
          const grades = [tam, cor, acess].filter(Boolean);
          const variacaoNome = grades.length > 0 ? grades.join(' / ') : (tipo === 'sem-variacao' ? 'Padrão' : 'Único');

          const stock = parseFloat(row[colEstoque]) || 0;
          const cost = parseFloat(row[colCusto]) || 0;
          const price = parseFloat(row[colCheio]) || 0;
          const promo = parseFloat(row[colPromo]) || 0;

          const precoVenda = promo > 0 ? promo : price;
          const custoTotal = stock * cost;
          const vendaTotal = stock * precoVenda;
          const lucroTotal = vendaTotal - custoTotal;
          const margemPct = vendaTotal > 0 ? (lucroTotal / vendaTotal * 100) : (precoVenda > 0 ? ((precoVenda - cost) / precoVenda * 100) : 0);

          const item = {
            id: row[colId],
            sku: sku,
            sku_pai: skuPai,
            tipo: tipo,
            nome: nome,
            variacao: variacaoNome,
            categoria: categoria,
            img: img,
            ativo: row[colAtivo] || 'S',
            estoque: stock,
            custo: cost,
            preco_cheio: price,
            preco_promo: promo,
            preco_venda: precoVenda,
            custo_total: custoTotal,
            venda_total: vendaTotal,
            lucro_total: lucroTotal,
            margem_pct: margemPct
          };

          items.push(item);

          if (skuPai && parents[skuPai]) {
            parents[skuPai].variacoes.push(item);
          }
        }

        const produtosAgrupados = [];

        Object.values(parents).forEach(p => {
          if (!p.variacoes || p.variacoes.length === 0) return;

          const estoqueTotal = p.variacoes.reduce((acc, v) => acc + v.estoque, 0);
          const custoTotal = p.variacoes.reduce((acc, v) => acc + v.custo_total, 0);
          const vendaTotal = p.variacoes.reduce((acc, v) => acc + v.venda_total, 0);
          const lucroTotal = vendaTotal - custoTotal;
          const margemPct = vendaTotal > 0 ? (lucroTotal / vendaTotal * 100) : 0;

          const custos = p.variacoes.map(v => v.custo).filter(c => c > 0);
          const precos = p.variacoes.map(v => v.preco_venda).filter(p => p > 0);

          produtosAgrupados.push({
            sku: p.sku,
            tipo: 'com-variacao',
            nome: p.nome,
            categoria: p.categoria || 'Sem Categoria',
            img: p.img,
            ativo: p.ativo,
            estoque_total: estoqueTotal,
            custo_total: custoTotal,
            venda_total: vendaTotal,
            lucro_total: lucroTotal,
            margem_pct: margemPct,
            custo_min: custos.length ? Math.min(...custos) : 0,
            custo_max: custos.length ? Math.max(...custos) : 0,
            preco_min: precos.length ? Math.min(...precos) : 0,
            preco_max: precos.length ? Math.max(...precos) : 0,
            qtd_variacoes: p.variacoes.length,
            com_estoque: estoqueTotal > 0,
            variacoes: p.variacoes
          });
        });

        items.filter(it => it.tipo === 'sem-variacao').forEach(it => {
          produtosAgrupados.push({
            sku: it.sku,
            tipo: 'sem-variacao',
            nome: it.nome,
            categoria: it.categoria,
            img: it.img,
            ativo: it.ativo,
            estoque_total: it.estoque,
            custo_total: it.custo_total,
            venda_total: it.venda_total,
            lucro_total: it.lucro_total,
            margem_pct: it.margem_pct,
            custo_min: it.custo,
            custo_max: it.custo,
            preco_min: it.preco_venda,
            preco_max: it.preco_venda,
            qtd_variacoes: 1,
            com_estoque: it.estoque > 0,
            variacoes: [it]
          });
        });

        const totalEstoque = items.reduce((acc, it) => acc + it.estoque, 0);
        const totalCusto = items.reduce((acc, it) => acc + it.custo_total, 0);
        const totalVenda = items.reduce((acc, it) => acc + it.venda_total, 0);

        const newDataset = {
          kpis: {
            total_skus: items.length,
            total_produtos: produtosAgrupados.length,
            total_pecas_estoque: totalEstoque,
            skus_com_estoque: items.filter(x => x.estoque > 0).length,
            skus_sem_estoque: items.filter(x => x.estoque === 0).length,
            skus_estoque_baixo: items.filter(x => x.estoque > 0 && x.estoque <= 2).length,
            total_custo_estoque: totalCusto,
            total_venda_estoque: totalVenda,
            lucro_bruto_estoque: totalVenda - totalCusto,
            margem_media_estoque: totalVenda > 0 ? ((totalVenda - totalCusto) / totalVenda * 100) : 0,
            arquivo_origem: file.name
          },
          categorias: [...categoriasSet].sort(),
          produtos_agrupados: produtosAgrupados,
          itens_detalhados: items
        };

        state.data = newDataset;
        try {
          localStorage.setItem('luluks_custom_data', JSON.stringify(newDataset));
        } catch (e) {
          console.warn('LocalStorage cheio, mantendo em memória.', e);
        }

        populateCategories();
        populateShopeeProductsSelect();
        computeCatalogShopeePrices();
        computeCatalogTikTokPrices();
        if (elements.activeFilename) elements.activeFilename.textContent = file.name;
        if (elements.navCatalogBadge) elements.navCatalogBadge.textContent = items.length;

        applyFilters();
        initShopeeSimulator();
        initTikTokSimulator();
        renderShopeeTable();
        renderTikTokTable();

        showToast(`Planilha "${file.name}" carregada com ${items.length} itens!`, 'success');

      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
        showToast('Erro ao processar planilha. Verifique se o arquivo está correto.', 'error');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // =========================================================================
  // Exportar Catálogo para CSV
  // =========================================================================
  function exportToCsv() {
    if (!state.filteredItems || state.filteredItems.length === 0) {
      showToast('Nenhum item filtrado para exportar.', 'warning');
      return;
    }

    const isGrouped = state.viewStructure === 'grouped';
    let headers = [];
    let rowsData = [];

    if (isGrouped) {
      headers = [
        'SKU Pai', 'Produto', 'Categoria', 'Grades', 
        'Custo Min', 'Custo Max', 'Preço Venda Min', 'Preço Venda Max', 
        'Preço Shopee Cad (Min/Max)', 'Preço Shopee Promo (Min/Max)',
        'Preço TikTok Cad (Min/Max)', 'Preço TikTok Promo (Min/Max)',
        'Estoque Total', 'Custo Total em Estoque', 'Margem (%)', 'Status'
      ];
      rowsData = state.filteredItems.map(p => [
        p.sku,
        `"${(p.nome || '').replace(/"/g, '""')}"`,
        `"${(p.categoria || '').replace(/"/g, '""')}"`,
        p.qtd_variacoes,
        p.custo_min.toFixed(2),
        p.custo_max.toFixed(2),
        p.preco_min.toFixed(2),
        p.preco_max.toFixed(2),
        `${(p.preco_shopee_cad_min || 0).toFixed(2)} - ${(p.preco_shopee_cad_max || 0).toFixed(2)}`,
        `${(p.preco_shopee_promo_min || 0).toFixed(2)} - ${(p.preco_shopee_promo_max || 0).toFixed(2)}`,
        `${(p.preco_tiktok_cad_min || 0).toFixed(2)} - ${(p.preco_tiktok_cad_max || 0).toFixed(2)}`,
        `${(p.preco_tiktok_promo_min || 0).toFixed(2)} - ${(p.preco_tiktok_promo_max || 0).toFixed(2)}`,
        p.estoque_total,
        p.custo_total.toFixed(2),
        p.margem_pct.toFixed(1),
        p.ativo === 'S' ? 'Ativo' : 'Inativo'
      ]);
    } else {
      headers = [
        'SKU', 'SKU Pai', 'Produto', 'Variação / Tamanho', 'Categoria', 
        'Preço Custo', 'Preço Cheio', 'Preço Promo', 'Preço Venda', 
        'Preço Shopee Cad', 'Preço Shopee Promo',
        'Preço TikTok Cad', 'Preço TikTok Promo',
        'Estoque', 'Custo Total Estoque', 'Venda Total Estoque', 'Margem (%)', 'Status'
      ];
      rowsData = state.filteredItems.map(it => [
        it.sku,
        it.sku_pai || '',
        `"${(it.nome || '').replace(/"/g, '""')}"`,
        `"${(it.variacao || '').replace(/"/g, '""')}"`,
        `"${(it.categoria || '').replace(/"/g, '""')}"`,
        it.custo.toFixed(2),
        it.preco_cheio.toFixed(2),
        it.preco_promo.toFixed(2),
        it.preco_venda.toFixed(2),
        (it.preco_shopee_cad || 0).toFixed(2),
        (it.preco_shopee_promo || 0).toFixed(2),
        (it.preco_tiktok_cad || 0).toFixed(2),
        (it.preco_tiktok_promo || 0).toFixed(2),
        it.estoque,
        it.custo_total.toFixed(2),
        it.venda_total.toFixed(2),
        it.margem_pct.toFixed(1),
        it.ativo === 'S' ? 'Ativo' : 'Inativo'
      ]);
    }

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rowsData.map(r => r.join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `luluks_estoque_${isGrouped ? 'modelos' : 'skus'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Exportação concluída com sucesso!', 'success');
  }

  // =========================================================================
  // ABA 4: AUDITORIA SHOPEE REAL (178 Itens com Âncora e Promoções Reais)
  // =========================================================================
  function calcAuditShopeeFee(p) {
    if (p <= 0) return { fee: 0, pct: 0, fix: 0, tier: 'Inválido' };
    if (p < 9.00) return { fee: p * 0.20 + p * 0.50, pct: 20, fix: p * 0.50, tier: 'Sub R$ 9: 20% + 50% taxa fixa' };
    if (p <= 79.99) return { fee: p * 0.20 + 4.50, pct: 20, fix: 4.50, tier: 'Até R$ 79,99: 20% + R$ 4,50' };
    if (p <= 99.99) return { fee: p * 0.14 + 16.00, pct: 14, fix: 16.00, tier: 'R$ 80 a 99,99: 14% + R$ 16,00' };
    if (p <= 199.99) return { fee: p * 0.14 + 20.00, pct: 14, fix: 20.00, tier: 'R$ 100 a 199,99: 14% + R$ 20,00' };
    return { fee: p * 0.14 + 26.00, pct: 14, fix: 26.00, tier: 'Acima de R$ 200: 14% + R$ 26,00' };
  }

  function setupShopeeAuditEventListeners() {
    if (elements.navBtnAudit) {
      elements.navBtnAudit.addEventListener('click', () => switchTab('audit'));
    }

    if (elements.auditDiscountSlider) {
      elements.auditDiscountSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.audit.mode = 'custom';
        state.audit.discountPct = val;
        if (elements.auditDiscountDisplay) {
          elements.auditDiscountDisplay.textContent = `${val.toFixed(0)}% OFF`;
        }
        if (elements.auditPresetBtns) {
          elements.auditPresetBtns.forEach(btn => {
            const bVal = btn.dataset.discount;
            btn.classList.toggle('active', bVal !== 'real' && parseFloat(bVal) === val);
          });
        }
        renderShopeeAudit();
      });
    }

    if (elements.auditPresetBtns) {
      elements.auditPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const bVal = btn.dataset.discount;
          elements.auditPresetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          if (bVal === 'real') {
            state.audit.mode = 'real';
            state.audit.discountPct = 26.6;
            if (elements.auditDiscountSlider) elements.auditDiscountSlider.value = 26;
            if (elements.auditDiscountDisplay) elements.auditDiscountDisplay.textContent = 'Real Praticado';
          } else {
            const val = parseFloat(bVal) || 0;
            state.audit.mode = 'custom';
            state.audit.discountPct = val;
            if (elements.auditDiscountSlider) elements.auditDiscountSlider.value = val;
            if (elements.auditDiscountDisplay) elements.auditDiscountDisplay.textContent = `${val.toFixed(0)}% OFF`;
          }
          renderShopeeAudit();
        });
      });
    }

    if (elements.auditSearchInput) {
      let timeout;
      elements.auditSearchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          state.audit.search = e.target.value.trim().toLowerCase();
          state.audit.currentPage = 1;
          renderShopeeAudit();
        }, 150);
      });
    }

    if (elements.auditSearchClear) {
      elements.auditSearchClear.addEventListener('click', () => {
        if (elements.auditSearchInput) elements.auditSearchInput.value = '';
        state.audit.search = '';
        state.audit.currentPage = 1;
        renderShopeeAudit();
      });
    }

    if (elements.auditFilterPills) {
      elements.auditFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          elements.auditFilterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          state.audit.filter = pill.dataset.auditFilter || 'all';
          state.audit.currentPage = 1;
          renderShopeeAudit();
        });
      });
    }

    if (elements.btnExportAudit) {
      elements.btnExportAudit.addEventListener('click', exportShopeeAuditToExcel);
    }
  }

  function renderShopeeAudit() {
    const auditData = window.DADOS_SHOPEE_REAL;
    if (!auditData || !auditData.itens) return;

    if (elements.auditKpiTotal) elements.auditKpiTotal.textContent = auditData.total_shopee;
    if (elements.auditKpiPriceCad) elements.auditKpiPriceCad.textContent = fmtCurrency.format(auditData.preco_medio_cad || 119.46);
    if (elements.auditKpiPricePromo) elements.auditKpiPricePromo.textContent = fmtCurrency.format(auditData.preco_medio_promo || 84.46);
    if (elements.auditKpiPricePromoSub) elements.auditKpiPricePromoSub.textContent = `Média de ${(auditData.desconto_medio_praticado || 26.6).toFixed(1)}% OFF praticado`;
    if (elements.auditKpiMarginReal) elements.auditKpiMarginReal.textContent = `${(auditData.margem_media_real || 29.8).toFixed(1)}%`;
    if (elements.auditKpiMarginRealSub) elements.auditKpiMarginRealSub.innerHTML = `Lucro real médio: <strong>${fmtCurrency.format(auditData.lucro_medio_real || 27.15)}</strong> / peça`;

    const isRealMode = state.audit.mode === 'real';
    const discount = state.audit.discountPct;
    const discountFactor = 1.0 - (discount / 100.0);

    let sumPrice = 0;
    let sumMargin = 0;
    let sumProfit = 0;
    let countSafe = 0;
    let countWarning = 0;
    let countLoss = 0;
    let countNoSku = 0;
    let validCount = 0;

    const calculatedItems = auditData.itens.map(it => {
      const cadPrice = it.shopee_cad_price || it.shopee_price || 0;
      const realPromoPrice = it.shopee_promo_price || it.shopee_price || cadPrice;
      const realDiscPct = it.shopee_real_discount_pct || 0;

      let simPrice = 0;
      let simDiscPct = 0;

      if (isRealMode) {
        simPrice = realPromoPrice;
        simDiscPct = realDiscPct;
      } else {
        simPrice = cadPrice * discountFactor;
        simDiscPct = discount;
      }

      const { fee, tier } = calcAuditShopeeFee(simPrice);
      const profit = simPrice - fee - it.custo - (it.embalagem || 1.50);
      const margin = simPrice > 0 ? (profit / simPrice * 100.0) : 0;

      const hasSku = Boolean(it.var_sku || it.parent_sku);
      if (!hasSku) countNoSku++;

      if (it.custo > 0) {
        validCount++;
        sumPrice += simPrice;
        sumMargin += margin;
        sumProfit += profit;
        if (margin >= 20.0) countSafe++;
        else if (profit < 0.0) countLoss++;
        else countWarning++;
      } else {
        if (margin >= 20.0) countSafe++;
        else if (profit < 0.0) countLoss++;
        else countWarning++;
      }

      return {
        ...it,
        _cadPrice: cadPrice,
        _realPromoPrice: realPromoPrice,
        _realDiscPct: realDiscPct,
        _simPrice: simPrice,
        _simDiscPct: simDiscPct,
        _fee: fee,
        _tier: tier,
        _profit: profit,
        _margin: margin,
        _hasSku: hasSku
      };
    });

    if (elements.auditSimResPrice) elements.auditSimResPrice.textContent = fmtCurrency.format(validCount ? sumPrice / validCount : (auditData.preco_medio_promo || 0));
    if (elements.auditSimResMargin) {
      const avgM = validCount ? sumMargin / validCount : (auditData.margem_media_real || 0);
      elements.auditSimResMargin.textContent = `${avgM.toFixed(1)}%`;
      elements.auditSimResMargin.style.color = avgM >= 20 ? '#16a34a' : (avgM >= 10 ? '#d97706' : '#dc2626');
    }
    if (elements.auditSimResProfit) elements.auditSimResProfit.textContent = fmtCurrency.format(validCount ? sumProfit / validCount : (auditData.lucro_medio_real || 0));
    if (elements.auditSimResSafe) elements.auditSimResSafe.textContent = `${countSafe} / ${auditData.total_shopee}`;
    if (elements.auditSimResLoss) elements.auditSimResLoss.textContent = `${countLoss} / ${auditData.total_shopee}`;

    // Atualizar labels dos filtros
    if (elements.auditFilterAll) elements.auditFilterAll.textContent = `Todos (${auditData.total_shopee})`;
    if (elements.auditFilterSafe) elements.auditFilterSafe.textContent = `Margem Segura ≥ 20% (${countSafe})`;
    if (elements.auditFilterWarning) elements.auditFilterWarning.textContent = `Margem 0% a 20% (${countWarning})`;
    if (elements.auditFilterDanger) elements.auditFilterDanger.textContent = `Prejuízo < 0% (${countLoss})`;
    if (elements.auditFilterNoSku) elements.auditFilterNoSku.textContent = `Sem SKU Shopee (${countNoSku})`;

    const q = state.audit.search;
    const f = state.audit.filter;

    const filtered = calculatedItems.filter(it => {
      if (f === 'safe' && it._margin < 20.0) return false;
      if (f === 'warning' && (it._margin < 0.0 || it._margin >= 20.0)) return false;
      if (f === 'danger' && it._profit >= 0.0) return false;
      if (f === 'no_sku' && it._hasSku) return false;

      if (q) {
        const matchSearch = (
          (it.prod_name && it.prod_name.toLowerCase().includes(q)) ||
          (it.var_name && it.var_name.toLowerCase().includes(q)) ||
          (it.var_sku && it.var_sku.toLowerCase().includes(q)) ||
          (it.parent_sku && it.parent_sku.toLowerCase().includes(q)) ||
          (it.loja_sku && it.loja_sku.toLowerCase().includes(q)) ||
          (it.loja_nome && it.loja_nome.toLowerCase().includes(q))
        );
        if (!matchSearch) return false;
      }
      return true;
    });

    const total = filtered.length;
    const pageSize = state.audit.pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (state.audit.currentPage > totalPages) state.audit.currentPage = totalPages;
    const page = state.audit.currentPage;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    if (elements.auditTableBody) {
      if (pageItems.length === 0) {
        elements.auditTableBody.innerHTML = `
          <tr>
            <td colspan="13" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
              Nenhum produto encontrado para os filtros selecionados.
            </td>
          </tr>
        `;
      } else {
        elements.auditTableBody.innerHTML = pageItems.map(it => {
          let riskPill = '';
          if (it._profit < 0.0) {
            riskPill = `<span class="risk-pill risk-danger">🛑 ${it._margin.toFixed(1)}%</span>`;
          } else if (it._margin < 10.0) {
            riskPill = `<span class="risk-pill risk-warning">⚠️ ${it._margin.toFixed(1)}%</span>`;
          } else if (it._margin < 20.0) {
            riskPill = `<span class="risk-pill risk-moderate">⚠️ ${it._margin.toFixed(1)}%</span>`;
          } else {
            riskPill = `<span class="risk-pill risk-safe">✅ ${it._margin.toFixed(1)}%</span>`;
          }

          let diagPill = '';
          if (it._profit < 0) {
            diagPill = '<span class="risk-pill risk-danger">Prejuízo Imediato</span>';
          } else if (it._margin < 20) {
            diagPill = '<span class="risk-pill risk-moderate">Margem Baixa</span>';
          } else {
            diagPill = '<span class="risk-pill risk-safe">Margem Saudável</span>';
          }

          const skuBadge = it._hasSku 
            ? `<code style="font-size:0.75rem;">${escapeHtml(it.var_sku || it.parent_sku)}</code>`
            : '<span class="sku-missing-badge">Sem SKU Shopee</span>';

          const lojaSkuBadge = it.loja_sku
            ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">Loja: <code>${escapeHtml(it.loja_sku)}</code></div>`
            : '<div style="font-size:0.72rem; color:#d97706; margin-top:2px;">Não vinculado</div>';

          const skuMissingAlert = !it._hasSku ? '<div style="margin-top:4px;"><span class="sku-missing-badge">⚠️ Vincular SKU</span></div>' : '';

          const imgSrc = it.img || PLACEHOLDER_IMG;
          const imgHtml = `
            <img src="${escapeHtml(imgSrc)}" 
                 alt="${escapeHtml(it.prod_name)}" 
                 class="product-thumb" 
                 loading="lazy" 
                 onerror="this.src='${PLACEHOLDER_IMG}'"
                 onclick="openLightbox('${escapeHtml(imgSrc)}', '${escapeHtml(it.prod_name)}', '${escapeHtml(it.var_sku || it.parent_sku || it.loja_sku || '')}', ${it.shopee_stock || 0}, ${it.custo || 0})"
                 title="Clique para ampliar"
                 style="cursor: pointer; width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-subtle);">
          `;

          const promoBadge = it._realDiscPct > 0
            ? `<div style="font-size: 0.72rem; font-weight: 700; color: #ea580c; margin-top: 1px;">-${it._realDiscPct.toFixed(1)}% OFF</div>`
            : '<div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">Sem Desconto</div>';

          const simBadge = `<div style="font-size: 0.72rem; font-weight: 600; color: #2563eb; margin-top: 1px;">-${it._simDiscPct.toFixed(1)}% OFF</div>`;

          return `
            <tr>
              <td style="text-align: center; vertical-align: middle;">
                ${imgHtml}
              </td>
              <td>
                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.85rem; line-height: 1.3;">
                  ${escapeHtml(it.prod_name)}
                </div>
                ${it.var_name ? `<div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">Variação: <strong>${escapeHtml(it.var_name)}</strong></div>` : ''}
              </td>
              <td>
                ${skuBadge}
                ${lojaSkuBadge}
              </td>
              <td style="font-weight: 500;">${fmtCurrency.format(it.custo)}</td>
              <td style="color: var(--text-secondary);">${it.preco_loja > 0 ? fmtCurrency.format(it.preco_loja) : '-'}</td>
              <td style="font-weight: 600; color: var(--text-primary);">
                ${fmtCurrency.format(it._cadPrice)}
                <div style="font-size: 0.70rem; color: var(--text-muted);">Âncora</div>
              </td>
              <td style="background-color: rgba(238, 77, 45, 0.04); font-weight: 700; color: #ea580c;">
                ${fmtCurrency.format(it._realPromoPrice)}
                ${promoBadge}
              </td>
              <td style="background-color: rgba(37, 99, 235, 0.04); font-weight: 700; color: #2563eb;">
                ${fmtCurrency.format(it._simPrice)}
                ${simBadge}
              </td>
              <td>
                <div style="font-weight: 500;">${fmtCurrency.format(it._fee)}</div>
                <div style="font-size: 0.70rem; color: var(--text-muted);">${it._tier}</div>
              </td>
              <td style="font-weight: 700; color: ${it._profit < 0 ? '#dc2626' : 'var(--text-primary)'};">
                ${fmtCurrency.format(it._profit)}
              </td>
              <td>
                ${riskPill}
              </td>
              <td style="background-color: rgba(139, 92, 246, 0.04); font-weight: 600; color: #8b5cf6;">
                Até ${it.desc_max_seguro_20}% OFF
                <div style="font-size: 0.70rem; color: var(--text-muted);">P/ 10%: até ${it.desc_max_seguro_10}%</div>
              </td>
              <td style="text-align: center;">
                ${diagPill}
                ${skuMissingAlert}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    if (elements.auditPaginationInfo) {
      if (total === 0) {
        elements.auditPaginationInfo.textContent = 'Nenhum item';
      } else {
        const from = start + 1;
        const to = Math.min(start + pageSize, total);
        elements.auditPaginationInfo.textContent = `Mostrando ${from} a ${to} de ${total} anúncios cadastrados`;
      }
    }

    if (elements.auditPaginationPages) {
      if (totalPages <= 1) {
        elements.auditPaginationPages.innerHTML = '';
      } else {
        let pagesHtml = '';
        const prevDisabled = page === 1 ? 'disabled' : '';
        pagesHtml += `<button class="page-btn" ${prevDisabled} data-audit-page="${page - 1}">&lsaquo;</button>`;

        let startP = Math.max(1, page - 2);
        let endP = Math.min(totalPages, page + 2);

        if (startP > 1) {
          pagesHtml += `<button class="page-btn" data-audit-page="1">1</button>`;
          if (startP > 2) pagesHtml += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
        }

        for (let p = startP; p <= endP; p++) {
          pagesHtml += `<button class="page-btn ${p === page ? 'active' : ''}" data-audit-page="${p}">${p}</button>`;
        }

        if (endP < totalPages) {
          if (endP < totalPages - 1) pagesHtml += `<span style="padding: 0 4px; color: var(--text-muted);">...</span>`;
          pagesHtml += `<button class="page-btn" data-audit-page="${totalPages}">${totalPages}</button>`;
        }

        const nextDisabled = page === totalPages ? 'disabled' : '';
        pagesHtml += `<button class="page-btn" ${nextDisabled} data-audit-page="${page + 1}">&rsaquo;</button>`;

        elements.auditPaginationPages.innerHTML = pagesHtml;

        elements.auditPaginationPages.querySelectorAll('[data-audit-page]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const p = parseInt(e.currentTarget.dataset.auditPage);
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
              state.audit.currentPage = p;
              renderShopeeAudit();
            }
          });
        });
      }
    }
  }

  function exportShopeeAuditToExcel() {
    const auditData = window.DADOS_SHOPEE_REAL;
    if (!auditData || !auditData.itens || typeof XLSX === 'undefined') {
      showToast('Biblioteca XLSX ou dados não disponíveis para exportação.', 'warning');
      return;
    }

    const isRealMode = state.audit.mode === 'real';
    const discount = state.audit.discountPct;
    const discountFactor = 1.0 - (discount / 100.0);

    const exportRows = auditData.itens.map(it => {
      const cadPrice = it.shopee_cad_price || it.shopee_price || 0;
      const realPromoPrice = it.shopee_promo_price || it.shopee_price || cadPrice;
      const realDiscPct = it.shopee_real_discount_pct || 0;

      let simPrice = isRealMode ? realPromoPrice : (cadPrice * discountFactor);
      let simDisc = isRealMode ? realDiscPct : discount;

      const { fee, tier } = calcAuditShopeeFee(simPrice);
      const profit = simPrice - fee - it.custo - (it.embalagem || 1.50);
      const margin = simPrice > 0 ? (profit / simPrice * 100.0) : 0;

      let status = 'Margem Saudável (≥ 20%)';
      if (profit < 0) status = 'Prejuízo Imediato - Aumentar Preço';
      else if (margin < 20) status = 'Margem Baixa (0% a 20%)';

      const skuShopee = it.var_sku || it.parent_sku || 'SEM SKU';

      return {
        'Produto Shopee': it.prod_name,
        'Variação Shopee': it.var_name,
        'SKU Shopee': skuShopee,
        'SKU Loja Integrada': it.loja_sku || 'Não Vinculado',
        'Produto Loja Integrada': it.loja_nome || '-',
        'Custo Unitário (R$)': it.custo,
        'Preço Loja Integrada (R$)': it.preco_loja,
        'Preço Âncora Cadastrado Shopee (R$)': cadPrice,
        'Preço Real com Desconto Shopee (R$)': realPromoPrice,
        'Desconto Real Praticado Shopee (%)': realDiscPct,
        'Preço Simulado de Venda (R$)': parseFloat(simPrice.toFixed(2)),
        'Desconto Simulado (%)': parseFloat(simDisc.toFixed(1)),
        'Faixa Shopee 2026': tier,
        'Taxas Totais Shopee 2026 (R$)': parseFloat(fee.toFixed(2)),
        'Repasse Líquido Shopee (R$)': parseFloat((simPrice - fee).toFixed(2)),
        'Lucro Líquido Unitário (R$)': parseFloat(profit.toFixed(2)),
        'Margem Líquida Real (%)': parseFloat(margin.toFixed(1)),
        'Desconto Máx Seguro p/ Margem 20% (%)': it.desc_max_seguro_20,
        'Desconto Máx Seguro p/ Margem 10% (%)': it.desc_max_seguro_10,
        'Diagnóstico Financeiro': status,
        'Ação Cadastral': (!it.var_sku && !it.parent_sku) ? 'Cadastrar SKU na Shopee' : 'OK'
      };
    });

    const suffix = isRealMode ? 'Real_Praticado' : `${discount}pct_desconto`;
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Auditoria_Shopee`);
    XLSX.writeFile(workbook, `Auditoria_Shopee_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    showToast('Planilha de auditoria exportada com sucesso!', 'success');
  }

  // =========================================================================
  // Funções Auxiliares (Lightbox, Copiar SKU, Toasts)
  // =========================================================================
  function copySku(sku) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(sku).then(() => {
        showToast(`SKU ${sku} copiado!`, 'success');
      }).catch(() => fallbackCopy(sku));
    } else {
      fallbackCopy(sku);
    }
  }

  function fallbackCopy(text) {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast(`SKU ${text} copiado!`, 'success');
  }

  function openLightbox(imgSrc, title, sku, stock, cost) {
    if (!elements.lightboxModal) return;
    elements.lightboxImg.src = imgSrc || PLACEHOLDER_IMG;
    elements.lightboxTitle.textContent = title;
    elements.lightboxSku.textContent = sku;
    elements.lightboxStock.textContent = `${stock} unidades`;
    elements.lightboxCost.textContent = cost > 0 ? fmtCurrency.format(cost) : '-';
    elements.lightboxModal.classList.add('active');
  }

  function closeLightbox() {
    if (elements.lightboxModal) {
      elements.lightboxModal.classList.remove('active');
    }
  }

  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '🔔';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // =========================================================================
  // Edição de Preços & Estoque (Modal, Persistência Local e Exportação)
  // =========================================================================
  function openEditProductModal(sku) {
    if (!state.data?.itens_detalhados) return;
    const prod = state.data.itens_detalhados.find(p => p.sku === sku);
    if (!prod) {
      showToast(`Produto com SKU "${sku}" não encontrado.`, 'error');
      return;
    }

    if (elements.editProdSkuInput) elements.editProdSkuInput.value = prod.sku;
    if (elements.editProdTitle) elements.editProdTitle.textContent = prod.nome;
    if (elements.editProdSku) elements.editProdSku.textContent = `SKU: ${prod.sku}`;
    if (elements.editProdVar) elements.editProdVar.textContent = prod.variacao ? `Variação: ${prod.variacao}` : 'Produto Padrão';
    if (elements.editProdImg) elements.editProdImg.src = prod.img || PLACEHOLDER_IMG;

    if (elements.editInputPrecoVenda) elements.editInputPrecoVenda.value = prod.preco_venda.toFixed(2);
    if (elements.editInputEstoque) elements.editInputEstoque.value = prod.estoque;
    if (elements.editInputCusto) elements.editInputCusto.value = prod.custo.toFixed(2);
    if (elements.editInputPrecoPromo) elements.editInputPrecoPromo.value = prod.preco_promo > 0 ? prod.preco_promo.toFixed(2) : '';

    const isAlreadyEdited = Boolean(state.overrides && state.overrides[prod.sku]);
    if (elements.editBtnResetSingle) {
      elements.editBtnResetSingle.style.display = isAlreadyEdited ? 'inline-block' : 'none';
    }

    updateEditModalPreview();

    if (elements.modalEditProduct) {
      elements.modalEditProduct.classList.add('active');
    }
  }

  function closeEditProductModal() {
    if (elements.modalEditProduct) {
      elements.modalEditProduct.classList.remove('active');
    }
  }

  function updateEditModalPreview() {
    const precoVenda = parseFloat(elements.editInputPrecoVenda?.value) || 0;
    const custo = parseFloat(elements.editInputCusto?.value) || 0;
    const lucro = precoVenda - custo;
    const margem = precoVenda > 0 ? (lucro / precoVenda * 100) : 0;

    // Shopee sug
    const packaging = parseFloat(elements.shopeeCfgPack?.value) || 1.50;
    const marginShopee = parseFloat(elements.shopeeCfgMargin?.value) || 20.0;
    const taxShopee = parseFloat(elements.shopeeCfgTax?.value) || 0.0;
    const sellerType = elements.shopeeCfgSellerType?.value || 'cnpj';
    const rounding = elements.shopeeCfgRounding?.value || 'none';
    const discountPromoShopee = parseFloat(elements.shopeeCfgPromoDiscount?.value) || 30.0;
    const pairShopee = calcShopeePricingPair(custo, packaging, marginShopee, taxShopee, sellerType, rounding, discountPromoShopee);

    // TikTok sug
    const sellerRegimeTik = elements.tiktokCfgNewSeller?.value || 'standard';
    const discountPromoTik = parseFloat(elements.tiktokCfgPromoDiscount?.value) || 30.0;
    const pairTik = calcTikTokPricingPair(custo, packaging, marginShopee, taxShopee, sellerRegimeTik, rounding, discountPromoTik);

    if (elements.editPreviewLucro) {
      elements.editPreviewLucro.textContent = fmtCurrency.format(lucro);
      elements.editPreviewLucro.style.color = lucro >= 0 ? 'var(--text-primary)' : 'var(--danger-dot)';
    }
    if (elements.editPreviewMargem) {
      elements.editPreviewMargem.textContent = `${margem.toFixed(1)}%`;
      elements.editPreviewMargem.style.color = margem >= 20 ? 'var(--success-dot)' : (margem > 0 ? 'var(--warning-dot)' : 'var(--danger-dot)');
    }
    if (elements.editPreviewShopee) {
      elements.editPreviewShopee.textContent = fmtCurrency.format(pairShopee.precoComDesconto);
    }
    if (elements.editPreviewTiktok) {
      elements.editPreviewTiktok.textContent = fmtCurrency.format(pairTik.precoComDesconto);
    }
  }

  function saveProductEdit(e) {
    if (e) e.preventDefault();
    const sku = elements.editProdSkuInput?.value;
    if (!sku) return;

    const precoVenda = parseFloat(elements.editInputPrecoVenda?.value);
    const estoque = parseInt(elements.editInputEstoque?.value, 10);
    const custo = parseFloat(elements.editInputCusto?.value) || 0;
    const precoPromo = parseFloat(elements.editInputPrecoPromo?.value) || 0;

    if (isNaN(precoVenda) || precoVenda < 0) {
      showToast('Informe um Preço de Venda válido.', 'error');
      return;
    }
    if (isNaN(estoque) || estoque < 0) {
      showToast('Informe um Estoque válido.', 'error');
      return;
    }

    if (!state.overrides) state.overrides = {};
    state.overrides[sku] = {
      preco_venda: precoVenda,
      estoque: estoque,
      custo: custo,
      preco_promo: precoPromo,
      preco_cheio: precoPromo > 0 ? precoVenda : precoVenda,
      updated_at: new Date().toISOString()
    };

    saveOverridesToStorage();
    applyProductOverrides();
    computeCatalogShopeePrices();
    computeCatalogTikTokPrices();

    applyFilters();
    updateShopeeSimulator();
    updateTikTokSimulator();
    renderShopeeTable();
    renderTikTokTable();

    closeEditProductModal();
    showToast(`Produto ${sku} atualizado com sucesso!`, 'success');
  }

  function resetProductEdit(sku) {
    if (!sku || !state.overrides || !state.overrides[sku]) return;

    delete state.overrides[sku];
    saveOverridesToStorage();

    // Reload base dataset and re-apply remaining overrides
    if (window.DADOS_PRODUTOS) {
      state.data = JSON.parse(JSON.stringify(window.DADOS_PRODUTOS));
    }
    applyProductOverrides();
    computeCatalogShopeePrices();
    computeCatalogTikTokPrices();

    applyFilters();
    updateShopeeSimulator();
    updateTikTokSimulator();
    renderShopeeTable();
    renderTikTokTable();

    closeEditProductModal();
    showToast(`Valores originais restaurados para ${sku}!`, 'info');
  }

  function resetAllProductEdits() {
    const count = Object.keys(state.overrides || {}).length;
    if (count === 0) return;

    if (!confirm(`Deseja descartar todas as alterações de preço e estoque (${count} itens) e voltar aos dados originais da planilha/banco?`)) {
      return;
    }

    state.overrides = {};
    localStorage.removeItem('luluks_product_overrides');

    if (window.DADOS_PRODUTOS) {
      state.data = JSON.parse(JSON.stringify(window.DADOS_PRODUTOS));
    }
    applyProductOverrides();
    computeCatalogShopeePrices();
    computeCatalogTikTokPrices();

    applyFilters();
    updateShopeeSimulator();
    updateTikTokSimulator();
    renderShopeeTable();
    renderTikTokTable();

    showToast('Todas as alterações manuais foram revertidas!', 'info');
  }

  function exportUpdatedCatalogToExcel() {
    if (!state.data?.itens_detalhados || typeof XLSX === 'undefined') {
      showToast('Nenhum dado ou biblioteca XLSX não disponível para exportação.', 'warning');
      return;
    }

    const exportRows = state.data.itens_detalhados.map(it => {
      const isEdited = Boolean(state.overrides && state.overrides[it.sku]);
      return {
        'SKU': it.sku,
        'SKU Pai': it.sku_pai || '',
        'Nome do Produto': it.nome,
        'Variação': it.variacao || '',
        'Categoria': it.categoria || '',
        'Estoque Atual': it.estoque,
        'Preço Custo (R$)': it.custo,
        'Preço Cheio (R$)': it.preco_cheio || it.preco_venda,
        'Preço Promo (R$)': it.preco_promo || 0,
        'Preço de Venda Final (R$)': it.preco_venda,
        'Preço Sugerido Shopee (R$)': it.preco_shopee_promo || it.preco_shopee || 0,
        'Preço Cadastro Shopee Âncora (R$)': it.preco_shopee_cad || 0,
        'Preço Sugerido TikTok (R$)': it.preco_tiktok_promo || it.preco_tiktok || 0,
        'Preço Cadastro TikTok Âncora (R$)': it.preco_tiktok_cad || 0,
        'Custo Total Estoque (R$)': it.custo_total,
        'Valor Total Venda Estoque (R$)': it.venda_total,
        'Lucro Total Estoque (R$)': it.lucro_total,
        'Margem (%)': parseFloat(it.margem_pct.toFixed(1)),
        'Status': it.ativo === 'S' ? 'Ativo' : 'Inativo',
        'Alterado Manualmente': isEdited ? 'SIM' : 'NÃO'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo_Atualizado');
    XLSX.writeFile(workbook, `Luluks_Estoque_Precos_Atualizados_${new Date().toISOString().slice(0, 10)}.xlsx`);

    showToast('Planilha com catálogo atualizado exportada com sucesso!', 'success');
  }

  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

