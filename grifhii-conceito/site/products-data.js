/* GRIFHII — regras compartilhadas do catálogo.
 * O estoque, preço, fotos e variações reais continuam vindo da API/PostgreSQL.
 * Este arquivo centraliza somente regras de apresentação, URLs e manutenção.
 */
(() => {
  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const slugify = value => normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const categories = {
    camisas: {
      label: 'Camisas', singular: 'Camisa', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    camisetas: {
      label: 'Camisetas', singular: 'Camiseta', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    polos: {
      label: 'Gola polo', singular: 'Polo', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    calcas: {
      label: 'Calças', singular: 'Calça', sizeLabel: 'TAMANHO', sizeType: 'numeric-or-clothing',
      demoSizes: ['38', '40', '42', '44', '46', '48'],
      accordions: ['Sobre a peça', 'Modelagem e caimento', 'Cuidados', 'Disponibilidade']
    },
    bermudas: {
      label: 'Bermudas', singular: 'Bermuda', sizeLabel: 'TAMANHO', sizeType: 'numeric-or-clothing',
      demoSizes: ['38', '40', '42', '44', '46', '48'],
      accordions: ['Sobre a peça', 'Modelagem e caimento', 'Cuidados', 'Disponibilidade']
    },
    conjuntos: {
      label: 'Conjuntos', singular: 'Conjunto', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    esportivo: {
      label: 'Esportivo', singular: 'Peça esportiva', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    moletons: {
      label: 'Moletons', singular: 'Moletom', sizeLabel: 'TAMANHO', sizeType: 'clothing',
      demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
      accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
    },
    calcados: {
      label: 'Calçados', singular: 'Calçado', sizeLabel: 'NUMERAÇÃO', sizeType: 'shoe',
      demoSizes: ['37', '38', '39', '40', '41', '42', '43', '44'],
      accordions: ['Sobre a peça', 'Numeração e ajuste', 'Material e cuidados', 'Disponibilidade']
    },
    cintos: {
      label: 'Cintos', singular: 'Cinto', sizeLabel: 'TAMANHO', sizeType: 'belt',
      demoSizes: ['Único', 'Consulte'],
      accordions: ['Sobre a peça', 'Como medir', 'Material e cuidados', 'Disponibilidade']
    },
    acessorios: {
      label: 'Acessórios', singular: 'Acessório', sizeLabel: 'VARIAÇÃO', sizeType: 'none',
      demoSizes: [],
      accordions: ['Sobre a peça', 'Detalhes', 'Cuidados', 'Disponibilidade']
    }
  };

  const catalogGroups = {
    camisasGeral: { key: 'camisas-geral', label: 'Camisas e polos', categories: ['camisas', 'camisetas', 'polos'] },
    calcasShort: { key: 'calcas-short', label: 'Calças e shorts', categories: ['calcas', 'bermudas'] },
    outros: { key: 'outros', label: 'Outros', categories: ['conjuntos', 'esportivo', 'moletons', 'calcados', 'cintos', 'acessorios'] }
  };

  const catalogRailConfig = {
    colecao: {
      categories: [...new Set(Object.values(catalogGroups).flatMap(group => group.categories))],
      tabs: Object.values(catalogGroups).map(group => ({ key: group.key, label: group.label, categories: [...group.categories] }))
    }
  };

  const catalogFilterCategories = {
    'camisas-geral': { rail: 'colecao', tab: 'camisas-geral', categories: catalogGroups.camisasGeral.categories },
    'calcas-short': { rail: 'colecao', tab: 'calcas-short', categories: catalogGroups.calcasShort.categories },
    'outros': { rail: 'colecao', tab: 'outros', categories: catalogGroups.outros.categories },
    'todos': { rail: 'colecao', tab: 'camisas-geral', categories: catalogGroups.camisasGeral.categories },
    'camisas': { rail: 'colecao', tab: 'camisas-geral', categories: ['camisas'] },
    'camisetas': { rail: 'colecao', tab: 'camisas-geral', categories: ['camisetas'] },
    'polos': { rail: 'colecao', tab: 'camisas-geral', categories: ['polos'] },
    'calcas': { rail: 'colecao', tab: 'calcas-short', categories: ['calcas'] },
    'bermudas': { rail: 'colecao', tab: 'calcas-short', categories: ['bermudas'] },
    'conjuntos': { rail: 'colecao', tab: 'outros', categories: ['conjuntos'] },
    'esportivo': { rail: 'colecao', tab: 'outros', categories: ['esportivo'] },
    'moletons': { rail: 'colecao', tab: 'outros', categories: ['moletons'] },
    'calcados': { rail: 'colecao', tab: 'outros', categories: ['calcados'] },
    'cintos': { rail: 'colecao', tab: 'outros', categories: ['cintos'] },
    'acessorios': { rail: 'colecao', tab: 'outros', categories: ['acessorios'] },
    'variados': { rail: 'colecao', tab: 'outros', categories: catalogGroups.outros.categories },
    'camisas-polos': { rail: 'colecao', tab: 'camisas-geral', categories: catalogGroups.camisasGeral.categories },
    'gola-polo': { rail: 'colecao', tab: 'camisas-geral', categories: ['polos'] },
    'gola polo': { rail: 'colecao', tab: 'camisas-geral', categories: ['polos'] }
  };

  const catalogRailByFilter = Object.fromEntries(Object.keys(catalogFilterCategories).map(key => [key, 'colecao']));

  const brandIcon = domain => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

  const brands = {
    'tommy-hilfiger': {
      slug: 'tommy-hilfiger', label: 'TOMMY HILFIGER', menuLabel: 'Tommy Hilfiger', apiBrand: 'TOMMY HILFIGER',
      aliases: ['Tommy', 'Tommy Jeans'], domain: 'tommy.com', iconUrl: brandIcon('tommy.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Clássicos americanos com leitura contemporânea, entre polos, camisas, denim e essenciais casuais.',
      placeholderCategories: ['polos', 'camisetas', 'camisas']
    },
    'emporio-armani': {slug:'emporio-armani',label:'EMPORIO ARMANI',menuLabel:'Emporio Armani',apiBrand:'EMPORIO ARMANI',aliases:['Armani'],domain:'armani.com',iconUrl:brandIcon('armani.com'),kicker:'MARCA EM DESTAQUE',presentation:'Camisetas de identidade contemporânea.',placeholderCategories:['camisetas']},
    'armani-exchange': {slug:'armani-exchange',label:'ARMANI EXCHANGE',menuLabel:'Armani Exchange',apiBrand:'ARMANI EXCHANGE',aliases:['A|X'],domain:'armani.com',iconUrl:brandIcon('armani.com'),kicker:'MARCA EM DESTAQUE',presentation:'Estética urbana e assinatura A|X.',placeholderCategories:['camisetas']},
    'ralph-lauren': {
      slug: 'ralph-lauren', label: 'RALPH LAUREN', menuLabel: 'Ralph Lauren', apiBrand: 'RALPH LAUREN',
      aliases: ['Polo Ralph Lauren', 'POLO RALPH LAUREN'], domain: 'ralphlauren.com', iconUrl: brandIcon('ralphlauren.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Peças marcadas por uma linguagem atemporal, alfaiataria casual e a estética clássica da Polo Ralph Lauren.',
      placeholderCategories: ['camisas', 'polos', 'camisetas']
    },
    lacoste: {
      slug: 'lacoste', label: 'LACOSTE', menuLabel: 'Lacoste', apiBrand: 'LACOSTE',
      aliases: [], domain: 'lacoste.com', iconUrl: brandIcon('lacoste.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Uma seleção de peças com identidade esportiva sofisticada, polos icônicas e essenciais de presença.',
      placeholderCategories: ['polos', 'camisas', 'camisetas']
    },
    'hugo-boss': {
      slug: 'hugo-boss', label: 'HUGO BOSS', menuLabel: 'Hugo Boss', apiBrand: 'HUGO BOSS',
      aliases: ['Boss', 'BOSS', 'Hugo'], domain: 'hugoboss.com', iconUrl: brandIcon('hugoboss.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Refinamento urbano, alfaiataria e peças casuais com acabamento limpo e presença premium.',
      placeholderCategories: ['camisas', 'polos', 'calcas']
    },
    'fred-perry': {
      slug: 'fred-perry', label: 'FRED PERRY', menuLabel: 'Fred Perry', apiBrand: 'FRED PERRY',
      aliases: [], domain: 'fredperry.com', iconUrl: brandIcon('fredperry.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Herança britânica esportiva, polos e peças casuais com linguagem limpa e reconhecível.',
      placeholderCategories: ['polos', 'camisetas', 'moletons']
    },
    diesel: {
      slug: 'diesel', label: 'DIESEL', menuLabel: 'Diesel', apiBrand: 'DIESEL',
      aliases: [], domain: 'diesel.com', iconUrl: brandIcon('diesel.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Denim, atitude e uma estética urbana mais ousada para composições de personalidade.',
      placeholderCategories: ['calcas', 'camisetas', 'camisas']
    },
    colcci: {
      slug: 'colcci', label: 'COLCCI', menuLabel: 'Colcci', apiBrand: 'COLCCI',
      aliases: [], domain: 'colcci.com.br', iconUrl: brandIcon('colcci.com.br'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Moda urbana brasileira com foco em jeanswear, camisetas, camisas e peças contemporâneas.',
      placeholderCategories: ['camisas', 'camisetas', 'calcas']
    },
    acostamento: {
      slug: 'acostamento', label: 'ACOSTAMENTO', menuLabel: 'Acostamento', apiBrand: 'ACOSTAMENTO',
      aliases: [], domain: 'acostamento.com.br', iconUrl: brandIcon('acostamento.com.br'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Casual masculino com identidade marcante, polos, camisetas e camisas para o dia a dia.',
      placeholderCategories: ['polos', 'camisetas', 'camisas']
    },
    ellus: {
      slug: 'ellus', label: 'ELLUS', menuLabel: 'Ellus', apiBrand: 'ELLUS',
      aliases: [], domain: 'ellus.com', iconUrl: brandIcon('ellus.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'DNA urbano e denim premium em uma curadoria de peças com presença e acabamento contemporâneo.',
      placeholderCategories: ['calcas', 'camisetas', 'camisas']
    },
    'calvin-klein-jeans': {
      slug: 'calvin-klein-jeans', label: 'CALVIN KLEIN JEANS', menuLabel: 'Calvin Klein Jeans', apiBrand: 'CALVIN KLEIN JEANS',
      aliases: ['Calvin Klein', 'CALVIN KLEIN', 'CK Jeans'], domain: 'calvinklein.com.br', iconUrl: brandIcon('calvinklein.com.br'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Minimalismo, denim e essenciais contemporâneos com a leitura limpa da Calvin Klein Jeans.',
      placeholderCategories: ['calcas', 'camisetas', 'moletons']
    },
    zara: {
      slug: 'zara', label: 'ZARA', menuLabel: 'Zara', apiBrand: 'ZARA',
      aliases: [], domain: 'zara.com', iconUrl: brandIcon('zara.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Modelagens atuais e peças versáteis que transitam entre o casual e uma proposta mais refinada.',
      placeholderCategories: ['camisas', 'calcas', 'camisetas']
    },
    vilebrequin: {
      slug: 'vilebrequin', label: 'VILEBREQUIN', menuLabel: 'Vilebrequin', apiBrand: 'VILEBREQUIN',
      aliases: [], domain: 'vilebrequin.com', iconUrl: brandIcon('vilebrequin.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Resortwear de luxo, shorts de banho e peças leves com identidade mediterrânea e acabamento premium.',
      placeholderCategories: ['bermudas', 'camisas', 'polos']
    },
    'abercrombie-fitch': {
      slug: 'abercrombie-fitch', label: 'ABERCROMBIE & FITCH', menuLabel: 'Abercrombie & Fitch', apiBrand: 'ABERCROMBIE & FITCH',
      aliases: ['Abercrombie', 'A&F'], domain: 'abercrombie.com', iconUrl: brandIcon('abercrombie.com'), kicker: 'MARCA EM DESTAQUE',
      presentation: 'Casual americano de visual limpo, confortável e contemporâneo, com foco em essenciais bem resolvidos.',
      placeholderCategories: ['camisetas', 'moletons', 'calcas']
    },
    'on': {slug:'on',label:'ON',menuLabel:'On Running',apiBrand:'ON',aliases:['On Running','On Performance'],domain:'on.com',iconUrl:brandIcon('on.com'),kicker:'MODA FIT / PERFORMANCE',presentation:'Peças para corrida, musculação e treinos em geral, com estética esportiva minimalista.',placeholderCategories:['esportivo','bermudas','camisetas']},
    'ayrton-senna': { slug:'ayrton-senna',label:'AYRTON SENNA',menuLabel:'Ayrton Senna',apiBrand:'AYRTON SENNA',aliases:['Senna'],domain:null,iconUrl:'assets/lion-transparent.webp',kicker:'COLEÇÃO AUTOMOBILISMO',presentation:'Bonés temáticos que celebram o legado do piloto brasileiro e a paixão pelo automobilismo.',placeholderCategories:['acessorios'] },
    'selecao-grifhii': {
      slug: 'selecao-grifhii', label: 'SELEÇÃO GRIFHII', menuLabel: 'Seleção GRIFHII', apiBrand: null,
      aliases: [], domain: null, iconUrl: 'assets/lion-transparent.webp', kicker: 'CURADORIA GRIFHII', internal: true, showInMenu: false,
      presentation: 'Descubra outras peças selecionadas para traduzir personalidade e presença.',
      placeholderCategories: ['camisas', 'polos', 'calcas']
    }
  };

  const fallbackCategory = {
    label: 'Peça', singular: 'Peça', sizeLabel: 'TAMANHO', sizeType: 'clothing',
    demoSizes: ['P', 'M', 'G', 'GG', 'XGG'],
    accordions: ['Sobre a peça', 'Modelagem', 'Cuidados', 'Disponibilidade']
  };

  const api = {
    categories,
    brands,
    catalogGroups,
    catalogRailConfig,
    catalogFilterCategories,
    catalogRailByFilter,
    getCategory(category) {
      const key = slugify(category);
      return this.categories[key] || fallbackCategory;
    },
    getCategorySlug(category) {
      const key = slugify(category);
      if (this.categories[key]) return key;
      const match = Object.entries(this.categories).find(([, value]) => normalize(value.label) === normalize(category));
      return match ? match[0] : key || 'peca';
    },
    getDemoName(category, index = 0) {
      const profile = this.getCategory(category);
      return `${profile.singular} em destaque ${String(Number(index) + 1).padStart(2, '0')}`;
    },
    getBrand(valueOrSlug) {
      const query = normalize(valueOrSlug);
      return Object.values(this.brands).find(brand => {
        const aliases = Array.isArray(brand.aliases) ? brand.aliases : [];
        return normalize(brand.slug) === query ||
          normalize(brand.label) === query ||
          normalize(brand.menuLabel) === query ||
          normalize(brand.apiBrand) === query ||
          aliases.some(alias => normalize(alias) === query);
      }) || null;
    },
    pieceUrl(piece = {}) {
      const isDemo = Boolean(piece.placeholder || piece.demoKey || piece.__demoKey || String(piece.id || '').startsWith('demo-'));
      if (!isDemo && (piece.slug || piece.id)) {
        return `peca.html?slug=${encodeURIComponent(piece.slug || piece.id)}`;
      }

      const category = piece.category || 'peca';
      const categorySlug = this.getCategorySlug(category);
      const demoKey = piece.__demoKey || piece.demoKey || `catalog-${categorySlug}-${Number(piece.__catalogIndex || 0) + 1}`;
      const name = piece.name || this.getDemoName(category, piece.__catalogIndex || 0);
      const brand = piece.brand ? `&marca=${encodeURIComponent(this.getBrand(piece.brand)?.slug || piece.brand)}` : '';
      return `peca.html?demo=${encodeURIComponent(demoKey)}&nome=${encodeURIComponent(name)}&categoria=${encodeURIComponent(categorySlug)}${brand}`;
    },
    pieceLinkAttrs: ''
  };

  window.GRIFHII_PRODUCTS = window.GRIFHII_PRODUCTS || {};
  Object.assign(window.GRIFHII_PRODUCTS, api);
})();
