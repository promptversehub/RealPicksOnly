/**
 * script.js — RealPicksOnly v2.1
 * ─────────────────────────────────────────────────────────
 * FIXES in this version:
 *  1. Tech/category pages no longer cache stale renders —
 *     they always re-render fresh so new products show up.
 *  2. Offers filter bar no longer filters by category:"offers"
 *     (no product has that) — it now filters all products.
 *  3. Real per-product click tracking with localStorage,
 *     live counter updates on card, and a hidden admin
 *     dashboard (press Shift+Ctrl+D to open).
 * ─────────────────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════
   1. SAFE DOM UTILITIES
   ═══════════════════════════════════════════════════════════ */
const DOM = {
  q:  (sel, ctx = document) => ctx.querySelector(sel),
  qa: (sel, ctx = document) => [...ctx.querySelectorAll(sel)],

  el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    if (props.className) e.className = props.className;
    if (props.text !== undefined) e.textContent = props.text;
    if (props.style) Object.assign(e.style, props.style);
    if (props.attrs) {
      for (const [k, v] of Object.entries(props.attrs)) {
        e.setAttribute(k, v);
      }
    }
    // .html only for trusted static emoji/icon strings — never user data
    if (props.html !== undefined) e.innerHTML = props.html;
    children.forEach(c => c && e.appendChild(c));
    return e;
  },

  setText(el, text) { if (el) el.textContent = text; },
  setAttr(el, attr, val) { if (el) el.setAttribute(attr, val); },
  clear(el) { while (el?.firstChild) el.removeChild(el.firstChild); },
};

/* ═══════════════════════════════════════════════════════════
   2. CLICK TRACKER
   Stores real clicks per product in localStorage.
   Key: "rpo_clicks" -> { "t1": 5, "t2": 12, ... }
   These are genuine clicks by real visitors on YOUR device
   (or any device that visits the site).
   When you publish, every visitor's clicks accumulate in
   their own browser. The "clicks" field in products.js is
   just the starting/display number you set manually.
   ═══════════════════════════════════════════════════════════ */
const ClickTracker = {
  _data: {},
  _storageKey: 'rpo_clicks',

  init() {
    try {
      this._data = JSON.parse(localStorage.getItem(this._storageKey) || '{}');
    } catch {
      this._data = {};
    }
  },

  /** Total clicks = base (from products.js) + real tracked clicks */
  getTotal(productId) {
    const base = PRODUCTS.find(p => p.id === productId)?.clicks || 0;
    return base + (this._data[productId] || 0);
  },

  /** Real tracked clicks only (what real visitors have clicked) */
  getReal(productId) {
    return this._data[productId] || 0;
  },

  /** Record a click, save to localStorage, update visible counter */
  record(productId) {
    this._data[productId] = (this._data[productId] || 0) + 1;
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._data));
    } catch {}

    // Live-update the click badge on the card without re-rendering
    const badge = DOM.q(`[data-clickid="${productId}"]`);
    if (badge) {
      badge.textContent = `${this.getTotal(productId)} clicks`;
      badge.classList.add('pop');
      setTimeout(() => badge.classList.remove('pop'), 350);
    }
  },

  /** Get all products sorted by real clicks descending */
  getAllStats() {
    return PRODUCTS
      .map(p => ({
        id:         p.id,
        title:      p.title,
        category:   p.category,
        realClicks: this.getReal(p.id),
        baseClicks: p.clicks || 0,
        total:      this.getTotal(p.id),
        link:       p.affiliateLink,
      }))
      .sort((a, b) => b.realClicks - a.realClicks);
  },

  /** Reset all tracked clicks (use carefully) */
  reset() {
    this._data = {};
    try { localStorage.removeItem(this._storageKey); } catch {}
  },
};

/* ═══════════════════════════════════════════════════════════
   3. APP STATE
   ═══════════════════════════════════════════════════════════ */
const State = {
  currentPage:  'home',
  groomFilter:  'all',
  homeSubFilter: 'all',
  offerFilter:  'all',
  wallFilter:   'all',
};

/* ═══════════════════════════════════════════════════════════
   4. FORMATTERS
   ═══════════════════════════════════════════════════════════ */
const Fmt = {
  price: (n) => '\u20B9' + Number(n).toLocaleString('en-IN'),

  counter(el, target, ms = 900) {
    if (!el) return;
    const step = target / (ms / 16);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = Math.floor(cur);
      if (cur >= target) clearInterval(t);
    }, 16);
  },
};

/* ═══════════════════════════════════════════════════════════
   5. TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
const Toast = {
  _wrap: null,

  _getWrap() {
    if (!this._wrap) {
      this._wrap = DOM.el('div', {
        className: 'toast-container',
        attrs: { role: 'status', 'aria-live': 'polite' },
      });
      document.body.appendChild(this._wrap);
    }
    return this._wrap;
  },

  show(msg, type) {
    const wrap = this._getWrap();
    const t = DOM.el('div', {
      className: 'toast' + (type ? ' toast-' + type : ''),
      text: msg,
    });
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'toastFade 0.3s ease forwards';
      setTimeout(() => t.remove(), 320);
    }, 3200);
  },
};

/* ═══════════════════════════════════════════════════════════
   6. PRODUCT CARD BUILDER
   Uses DOM.el — no innerHTML with product data.
   ═══════════════════════════════════════════════════════════ */
const Cards = {
  _fallbackSrc: 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
    '<rect fill="#1a1a28" width="200" height="200"/>' +
    '<text fill="#444" x="50%" y="50%" text-anchor="middle" dy=".35em" font-size="40">&#128230;</text>' +
    '</svg>'
  ),

  product(p, delayIndex) {
    if (delayIndex === undefined) delayIndex = 0;
    const clicks  = ClickTracker.getTotal(p.id);
    const isHot   = clicks > 150;
    const hasSale = p.originalPrice > p.price;

    /* Image */
    const img = DOM.el('img', {
      attrs: {
        src:      p.image || this._fallbackSrc,
        alt:      p.title,
        loading:  'lazy',
        decoding: 'async',
        width:    '240',
        height:   '200',
      },
    });
    img.addEventListener('error', () => { img.src = this._fallbackSrc; });

    /* Badges */
    const badges = DOM.el('div', { className: 'pc-badges' });
    if (p.discount > 0) {
      badges.appendChild(DOM.el('span', {
        className: 'badge-discount',
        text: '-' + p.discount + '%',
        attrs: { 'aria-label': p.discount + '% discount' },
      }));
    }
    if (isHot) {
      badges.appendChild(DOM.el('span', {
        className: 'badge-popular',
        html: '\uD83D\uDD25 Hot',
        attrs: { 'aria-label': 'Popular product' },
      }));
    }

    /* Click counter badge — updates live on click */
    const clickBadge = DOM.el('span', {
      className: 'pc-clicks',
      text: clicks + ' clicks',
      attrs: {
        'data-clickid': p.id,
        'aria-label': clicks + ' people clicked this',
      },
    });

    const imgWrap = DOM.el('div', { className: 'pc-img-wrap' }, img, badges, clickBadge);

    /* Body */
    const cat   = DOM.el('p', { className: 'pc-category', text: p.category.toUpperCase() });
    const title = DOM.el('h3', { className: 'pc-title', text: p.title });

    const priceEl = DOM.el('span', {
      className: 'pc-price',
      text: Fmt.price(p.price),
      attrs: { 'aria-label': 'Price: ' + Fmt.price(p.price) },
    });
    const priceRow = DOM.el('div', { className: 'pc-price-row' }, priceEl);
    if (hasSale) {
      priceRow.appendChild(DOM.el('span', {
        className: 'pc-original',
        text: Fmt.price(p.originalPrice),
        attrs: { 'aria-label': 'Original price: ' + Fmt.price(p.originalPrice) },
      }));
    }

    /* Affiliate link */
    const link = DOM.el('a', {
      className: 'pc-btn',
      text: 'View on Amazon \u2197',
      attrs: {
        href:   p.affiliateLink || '#',
        target: '_blank',
        rel:    'noopener noreferrer sponsored',
        'aria-label': 'View ' + p.title + ' on Amazon (opens in new tab)',
      },
    });
    link.addEventListener('click', () => ClickTracker.record(p.id));

    const body = DOM.el('div', { className: 'pc-body' }, cat, title, priceRow, link);

    const card = DOM.el('article', {
      className: 'product-card',
      style:     { animationDelay: (delayIndex * 0.06) + 's' },
      attrs:     { 'aria-label': p.title },
    }, imgWrap, body);

    return card;
  },

  skeleton() {
    return DOM.el('div', { className: 'skeleton-card', attrs: { 'aria-hidden': 'true' } },
      DOM.el('div', { className: 'skel skel-img' }),
      DOM.el('div', { className: 'skel skel-line skel-line-lg' }),
      DOM.el('div', { className: 'skel skel-line skel-line-sm' }),
      DOM.el('div', { className: 'skel skel-btn' }),
    );
  },

  wallpaper(w, delayIndex) {
    if (delayIndex === undefined) delayIndex = 0;
    const img = DOM.el('img', {
      className: 'wc-img',
      attrs: {
        src:      w.image || '',
        alt:      w.title + ' \u2014 ' + (w.type === 'desktop' ? 'Desktop' : 'Mobile') + ' wallpaper',
        loading:  'lazy',
        decoding: 'async',
        width:    '260',
        height:   w.type === 'mobile' ? '250' : '170',
      },
    });
    img.addEventListener('error', () => {
      img.src = 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=60';
    });

    const previewBtn = DOM.el('button', {
      className: 'wc-btn',
      html: '\uD83D\uDC41 Preview',
      attrs: { 'aria-label': 'Preview ' + w.title, type: 'button' },
    });
    previewBtn.addEventListener('click', function(e) { e.stopPropagation(); WallModal.open(w.id); });

    const dlLink = DOM.el('a', {
      className: 'wc-btn wc-btn-dl',
      html: '\u2B07 Download',
      attrs: {
        href:     w.download || w.image,
        download: w.title,
        target:   '_blank',
        rel:      'noopener noreferrer',
        'aria-label': 'Download ' + w.title + ' wallpaper',
      },
    });
    dlLink.addEventListener('click', () => Toast.show('Download starting\u2026', 'success'));

    const overlay = DOM.el('div',
      { className: 'wc-overlay', attrs: { 'aria-hidden': 'true' } },
      DOM.el('div', { className: 'wc-actions' }, previewBtn, dlLink)
    );

    const typeTag = DOM.el('span', { className: 'wc-tag', text: w.type === 'desktop' ? '\uD83D\uDDA5 Desktop' : '\uD83D\uDCF1 Mobile' });
    const resTag  = DOM.el('span', { className: 'wc-tag', text: w.resolution || 'HD' });
    const meta    = DOM.el('div', { className: 'wc-meta' }, typeTag, resTag);
    if (w.category === 'ai') meta.appendChild(DOM.el('span', { className: 'wc-tag', text: '\u2728 AI' }));

    const info = DOM.el('div', { className: 'wc-info' },
      DOM.el('p', { className: 'wc-title', text: w.title }),
      meta
    );

    const card = DOM.el('article', {
      className: 'wallpaper-card',
      attrs:     { 'data-type': w.type, tabindex: '0', 'aria-label': w.title + ' wallpaper' },
      style:     { animationDelay: (delayIndex * 0.05) + 's' },
    }, img, overlay, info);

    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); WallModal.open(w.id); }
    });

    return card;
  },

  myProduct(p, delayIndex) {
    if (delayIndex === undefined) delayIndex = 0;
    const isAvail = p.status === 'available';

    const img = DOM.el('img', {
      className: 'mp-img',
      attrs: {
        src: p.image || '', alt: p.title,
        loading: 'lazy', decoding: 'async',
        width: '300', height: '210',
      },
    });
    img.addEventListener('error', () => {
      img.src = 'https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=600&q=60';
    });

    const statusBadge = DOM.el('span', {
      className: 'mp-status ' + (isAvail ? 'mp-status-available' : 'mp-status-coming'),
      text: isAvail ? '\u2713 Available Now' : '\u23F3 Coming Soon',
    });

    const tagsWrap = DOM.el('div', { className: 'mp-tags' });
    (p.tags || []).forEach(function(t) {
      tagsWrap.appendChild(DOM.el('span', { className: 'mp-tag', text: '#' + t }));
    });

    var cta;
    if (isAvail) {
      cta = DOM.el('a', {
        className: 'btn-primary',
        text: 'Buy Now \u2192',
        attrs: {
          href: p.buyLink || '#', target: '_blank', rel: 'noopener noreferrer',
          'aria-label': 'Buy ' + p.title,
          style: 'width:100%;justify-content:center;',
        },
      });
    } else {
      cta = DOM.el('button', {
        className: 'btn-ghost',
        html: '\uD83D\uDD14 Notify Me',
        attrs: { type: 'button', style: 'width:100%;justify-content:center;' },
      });
      cta.addEventListener('click', () => {
  const email = prompt('Enter your email to get notified:');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    Toast.show('Please enter a valid email.', 'error');
    return;
  }
  fetch('https://formspree.io/f/mlgpyzrg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      source: 'RealPicksOnly — product: ' + p.title,
    }),
  })
  .then(() => Toast.show('✓ Added to waitlist! We will notify you.', 'success'))
  .catch(() => Toast.show('Something went wrong. Try again.', 'error'));
});
    }

    const card = DOM.el('article', {
      className: 'mp-card',
      style:     { animationDelay: (delayIndex * 0.08) + 's' },
      attrs:     { 'aria-label': p.title },
    },
      img,
      DOM.el('div', { className: 'mp-body' },
        statusBadge,
        DOM.el('h3', { className: 'mp-title', text: p.title }),
        DOM.el('p',  { className: 'mp-desc',  text: p.description }),
        DOM.el('p',  { className: 'mp-price', text: Fmt.price(p.price) }),
        tagsWrap,
        DOM.el('div', { className: 'mp-btn-wrap' }, cta),
      )
    );

    return card;
  },
};

/* ═══════════════════════════════════════════════════════════
   7. RENDERER
   ═══════════════════════════════════════════════════════════ */
const Renderer = {
  showSkeletons(containerId, n) {
    if (!n) n = 4;
    const el = DOM.q('#' + containerId);
    if (!el) return;
    DOM.clear(el);
    const frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) frag.appendChild(Cards.skeleton());
    el.appendChild(frag);
  },

  renderProducts(products, containerId) {
    const container = DOM.q('#' + containerId);
    if (!container) return;
    DOM.clear(container);

    if (!products || !products.length) {
      container.appendChild(
        DOM.el('div', { className: 'no-results' },
          DOM.el('div', { className: 'nr-icon', html: '\uD83D\uDD0D' }),
          DOM.el('h3', { text: 'No products found' }),
          DOM.el('p',  { text: 'Try adjusting your filters or search.' }),
        )
      );
      return;
    }

    const frag = document.createDocumentFragment();
    products.forEach(function(p, i) { frag.appendChild(Cards.product(p, i)); });
    container.appendChild(frag);
  },

  renderWallpapers(walls, containerId) {
    const container = DOM.q('#' + containerId);
    if (!container) return;
    DOM.clear(container);

    if (!walls || !walls.length) {
      container.appendChild(
        DOM.el('div', { className: 'no-results' },
          DOM.el('div', { className: 'nr-icon', html: '\uD83D\uDDBC\uFE0F' }),
          DOM.el('h3', { text: 'No wallpapers found' }),
          DOM.el('p',  { text: 'Try another filter.' }),
        )
      );
      return;
    }

    const frag = document.createDocumentFragment();
    walls.forEach(function(w, i) { frag.appendChild(Cards.wallpaper(w, i)); });
    container.appendChild(frag);
  },

  sortProducts(arr, by) {
    return arr.slice().sort(function(a, b) {
      if (by === 'price-asc')  return a.price - b.price;
      if (by === 'price-desc') return b.price - a.price;
      if (by === 'discount')   return b.discount - a.discount;
      return ClickTracker.getTotal(b.id) - ClickTracker.getTotal(a.id);
    });
  },

  /**
   * Build the sort + search filter bar for a category page.
   * FIX: 'offers' uses ALL products — no category restriction.
   */
  buildFilterBar(barId, category) {
    const bar = DOM.q('#' + barId);
    if (!bar) return;
    if (bar.dataset.built) return;
    bar.dataset.built = 'true';

    const label = DOM.el('span', { className: 'filter-label', text: 'Sort:' });

    const sel = DOM.el('select', {
      className: 'filter-select',
      attrs: { 'aria-label': 'Sort products' },
    });
    [
      ['popular',    'Most Popular'],
      ['price-asc',  'Price: Low \u2192 High'],
      ['price-desc', 'Price: High \u2192 Low'],
      ['discount',   'Highest Discount'],
    ].forEach(function(pair) {
      sel.appendChild(DOM.el('option', { text: pair[1], attrs: { value: pair[0] } }));
    });

    const self = this;
    sel.addEventListener('change', function() {
      // 'offers' = all products; 'home' uses home-living grid id
      const gridId = category === 'home' ? 'grid-home-living' : 'grid-' + category;
      let prods = category === 'offers'
        ? PRODUCTS.slice()
        : PRODUCTS.filter(function(p) { return p.category === category; });
      if (category === 'grooming' && State.groomFilter !== 'all') {
        prods = prods.filter(function(p) { return p.subcategory === State.groomFilter; });
      }
      if (category === 'home' && State.homeSubFilter && State.homeSubFilter !== 'all') {
        prods = prods.filter(function(p) { return p.subcategory === State.homeSubFilter; });
      }
      self.renderProducts(self.sortProducts(prods, sel.value), gridId);
    });

    const search = DOM.el('input', {
      className: 'filter-search',
      attrs: {
        type: 'search',
        placeholder: category === 'offers' ? 'Search all products\u2026' : category === 'home' ? 'Search home & living\u2026' : 'Search ' + category + '\u2026',
        autocomplete: 'off',
        'aria-label': 'Search products',
      },
    });

    var searchTimer;
    search.addEventListener('input', function() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function() {
        const q = search.value.trim().toLowerCase();
        const gridId = category === 'home' ? 'grid-home-living' : 'grid-' + category;
        let prods = category === 'offers'
          ? PRODUCTS.slice()
          : PRODUCTS.filter(function(p) { return p.category === category; });
        if (q) {
          prods = prods.filter(function(p) {
            return p.title.toLowerCase().includes(q) ||
              p.category.toLowerCase().includes(q) ||
              (p.tags || []).some(function(t) { return t.toLowerCase().includes(q); });
          });
        }
        self.renderProducts(self.sortProducts(prods, sel.value), gridId);
      }, 220);
    });

    bar.appendChild(label);
    bar.appendChild(sel);
    bar.appendChild(search);
  },

  renderHome() {
    Fmt.counter(DOM.q('#stat-products'), PRODUCTS.length);
    Fmt.counter(DOM.q('#stat-wallpapers'), WALLPAPERS.length);

    ['tech', 'fitness', 'health', 'grooming', 'home'].forEach(function(cat) {
      DOM.setText(
        DOM.q('#cat-count-' + cat),
        PRODUCTS.filter(function(p) { return p.category === cat; }).length + ' items'
      );
    });

    const trending = PRODUCTS.slice()
      .sort(function(a, b) { return ClickTracker.getTotal(b.id) - ClickTracker.getTotal(a.id); })
      .slice(0, 4);

    const deals = PRODUCTS.slice()
      .sort(function(a, b) { return b.discount - a.discount; })
      .slice(0, 4);

    const budget = PRODUCTS
      .filter(function(p) { return p.price < 999; })
      .sort(function(a, b) { return a.price - b.price; })
      .slice(0, 4);

    this.renderProducts(trending, 'trending-grid');
    this.renderProducts(deals,    'deals-grid');
    this.renderProducts(budget,   'budget-grid');
    this.renderWallpapers(WALLPAPERS.slice(0, 6), 'featured-wallpapers');
  },

  renderPage(page) {
    const self = this;
    switch (page) {
      case 'home':
        self.renderHome();
        break;

      /*
       * FIX: No stale render cache for category pages.
       * They always re-render so edits to products.js show up
       * immediately on page refresh in VS Code / browser.
       * The filter bar only builds once (bar.dataset.built).
       */
      case 'home-living':
        self.buildFilterBar('filter-bar-home-living', 'home');
        self.renderProducts(
          self.sortProducts(
            PRODUCTS.filter(function(p) {
              return p.category === 'home' &&
                (State.homeSubFilter === 'all' || !State.homeSubFilter || p.subcategory === State.homeSubFilter);
            }),
            'popular'
          ),
          'grid-home-living'
        );
        break;

      case 'tech':
      case 'fitness':
      case 'health':
        self.buildFilterBar('filter-bar-' + page, page);
        self.renderProducts(
          self.sortProducts(
            PRODUCTS.filter(function(p) { return p.category === page; }),
            'popular'
          ),
          'grid-' + page
        );
        break;

      case 'grooming':
        self.buildFilterBar('filter-bar-grooming', 'grooming');
        self.renderProducts(
          self.sortProducts(
            PRODUCTS.filter(function(p) {
              return p.category === 'grooming' &&
                (State.groomFilter === 'all' || p.subcategory === State.groomFilter);
            }),
            'popular'
          ),
          'grid-grooming'
        );
        break;

      case 'offers':
        self.buildFilterBar('filter-bar-offers', 'offers');
        self.renderOffers(State.offerFilter || 'all');
        break;

      case 'wallpapers':
        self.renderWallpapersFiltered(State.wallFilter || 'all');
        break;

      case 'myproducts':
        self.renderMyProducts();
        break;
    }
  },

  renderOffers(type) {
    var prods = PRODUCTS.slice();
    if (type === 'best')     { prods.sort(function(a, b) { return b.discount - a.discount; }); }
    else if (type === 'trending') { prods.sort(function(a, b) { return ClickTracker.getTotal(b.id) - ClickTracker.getTotal(a.id); }); }
    else if (type === 'budget')   { prods = prods.filter(function(p) { return p.price < 999; }).sort(function(a, b) { return a.price - b.price; }); }
    else { prods.sort(function(a, b) { return b.discount - a.discount; }); }
    this.renderProducts(prods, 'grid-offers');
  },

  renderWallpapersFiltered(type) {
    var walls = WALLPAPERS;
    if (type === 'desktop') walls = walls.filter(function(w) { return w.type === 'desktop'; });
    else if (type === 'mobile') walls = walls.filter(function(w) { return w.type === 'mobile'; });
    else if (type === 'ai')    walls = walls.filter(function(w) { return w.category === 'ai'; });
    this.renderWallpapers(walls, 'grid-wallpapers');
  },

  _myProductsRendered: false,
  renderMyProducts() {
    if (this._myProductsRendered) return;
    const grid = DOM.q('#grid-myproducts');
    if (!grid) return;
    DOM.clear(grid);
    const frag = document.createDocumentFragment();
    MY_PRODUCTS.forEach(function(p, i) { frag.appendChild(Cards.myProduct(p, i)); });
    grid.appendChild(frag);
    this._myProductsRendered = true;
  },
};

/* ═══════════════════════════════════════════════════════════
   8. WALLPAPER MODAL
   ═══════════════════════════════════════════════════════════ */
const WallModal = {
  _prevFocus: null,

  open(wallpaperId) {
    const w = WALLPAPERS.find(function(x) { return x.id === wallpaperId; });
    if (!w) return;

    this._prevFocus = document.activeElement;

    const modal  = DOM.q('#wallpaper-modal');
    const img    = DOM.q('#modal-img');
    const title  = DOM.q('#modal-title');
    const meta   = DOM.q('#modal-meta');
    const dlLink = DOM.q('#modal-download');

    if (img)  { img.src = w.image || ''; img.alt = w.title + ' \u2014 full preview'; }
    DOM.setText(title, w.title);
    DOM.setText(meta,
      (w.type === 'desktop' ? '\uD83D\uDDA5 Desktop' : '\uD83D\uDCF1 Mobile') +
      ' \u00B7 ' + (w.resolution || 'HD') +
      (w.category === 'ai' ? ' \u00B7 \u2728 AI Generated' : '')
    );
    if (dlLink) {
      dlLink.href = w.download || w.image;
      dlLink.setAttribute('download', w.title);
      dlLink.setAttribute('aria-label', 'Download ' + w.title + ' wallpaper');
    }

    modal && modal.classList.add('open');
    modal && modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
      var btn = DOM.q('#modal-close');
      if (btn) btn.focus();
    }, 50);
  },

  close() {
    const modal = DOM.q('#wallpaper-modal');
    modal && modal.classList.remove('open');
    modal && modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (this._prevFocus) this._prevFocus.focus();
  },
};

/* ═══════════════════════════════════════════════════════════
   9. CLICK STATS DASHBOARD
   Press Shift + Ctrl + D to open.
   Shows real clicks per product — only visible to YOU.
   ═══════════════════════════════════════════════════════════ */
const StatsDashboard = {
  _el: null,

  open() {
    if (this._el) { this._el.remove(); this._el = null; return; }

    const stats = ClickTracker.getAllStats();
    const totalRealClicks = stats.reduce(function(sum, s) { return sum + s.realClicks; }, 0);

    const overlay = document.createElement('div');
    overlay.setAttribute('style', [
      'position:fixed;inset:0;z-index:9999;',
      'background:rgba(0,0,0,0.92);backdrop-filter:blur(16px);',
      'display:flex;align-items:center;justify-content:center;padding:1rem;',
    ].join(''));

    const box = document.createElement('div');
    box.setAttribute('style', [
      'background:#111120;border:1px solid rgba(255,255,255,0.1);',
      'border-radius:20px;width:100%;max-width:720px;',
      'max-height:88vh;overflow-y:auto;font-family:inherit;',
    ].join(''));

    /* Header */
    const header = document.createElement('div');
    header.setAttribute('style', [
      'padding:1.25rem 1.5rem;border-bottom:1px solid rgba(255,255,255,0.07);',
      'display:flex;align-items:center;justify-content:space-between;',
      'position:sticky;top:0;background:#111120;z-index:1;',
    ].join(''));

    const titleWrap = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.setAttribute('style', 'font-family:Syne,sans-serif;font-size:1.1rem;font-weight:800;color:#f5f5f5;');
    h2.textContent = '\uD83D\uDCCA Click Stats Dashboard';
    const sub = document.createElement('p');
    sub.setAttribute('style', 'font-size:0.75rem;color:#666;margin-top:2px;');
    sub.textContent = 'Real clicks tracked in this browser. Shift+Ctrl+D to toggle.';
    titleWrap.appendChild(h2);
    titleWrap.appendChild(sub);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.setAttribute('style', [
      'background:rgba(255,255,255,0.08);border:none;color:#aaa;',
      'width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:0.9rem;',
    ].join(''));
    closeBtn.setAttribute('aria-label', 'Close stats dashboard');
    const self = this;
    closeBtn.addEventListener('click', function() { self.open(); });

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    /* Summary */
    const summary = document.createElement('div');
    summary.setAttribute('style', [
      'display:grid;grid-template-columns:repeat(3,1fr);',
      'border-bottom:1px solid rgba(255,255,255,0.07);',
    ].join(''));

    var topProduct = stats[0];
    [
      ['Total Products',    PRODUCTS.length,    '#f5a623'],
      ['Real Clicks Total', totalRealClicks,     '#2dd4a0'],
      ['Top Product',       (topProduct && topProduct.realClicks > 0) ? (topProduct.realClicks + ' clicks') : 'No clicks yet', '#60a5fa'],
    ].forEach(function(item) {
      const cell = document.createElement('div');
      cell.setAttribute('style', 'padding:1rem 1.5rem;border-right:1px solid rgba(255,255,255,0.07);');
      const num = document.createElement('div');
      num.setAttribute('style', 'font-size:1.4rem;font-weight:800;font-family:Syne,sans-serif;color:' + item[2] + ';');
      num.textContent = String(item[1]);
      const lbl = document.createElement('div');
      lbl.setAttribute('style', 'font-size:0.72rem;color:#555;margin-top:2px;font-weight:600;');
      lbl.textContent = item[0];
      cell.appendChild(num);
      cell.appendChild(lbl);
      summary.appendChild(cell);
    });

    /* Table */
    const tableWrap = document.createElement('div');
    tableWrap.setAttribute('style', 'padding:1rem 1.5rem;');

    const activeStats = stats.filter(function(s) { return s.realClicks > 0; });

    if (totalRealClicks === 0) {
      const empty = document.createElement('div');
      empty.setAttribute('style', 'text-align:center;padding:2rem;color:#555;font-size:0.85rem;line-height:1.8;');
      empty.innerHTML = '\uD83D\uDCEB No real clicks recorded yet.<br>Click <strong style="color:#f5a623">"View on Amazon \u2197"</strong> on any product to start tracking.';
      tableWrap.appendChild(empty);
    } else {
      const thead = document.createElement('div');
      thead.setAttribute('style', [
        'display:grid;grid-template-columns:1fr 80px 80px 80px;',
        'gap:0.5rem;padding:0.5rem 0.75rem;',
        'font-size:0.65rem;font-weight:700;letter-spacing:0.08em;',
        'text-transform:uppercase;color:#444;',
      ].join(''));
      ['Product','Real','Base','Total'].forEach(function(h) {
        const s = document.createElement('span');
        s.textContent = h;
        thead.appendChild(s);
      });
      tableWrap.appendChild(thead);

      activeStats.forEach(function(s, i) {
        const row = document.createElement('div');
        row.setAttribute('style', [
          'display:grid;grid-template-columns:1fr 80px 80px 80px;',
          'gap:0.5rem;padding:0.65rem 0.75rem;',
          'border-radius:8px;margin-bottom:2px;transition:background 0.15s;',
          i % 2 === 0 ? 'background:rgba(255,255,255,0.02);' : '',
        ].join(''));
        row.addEventListener('mouseenter', function() { row.style.background = 'rgba(245,166,35,0.05)'; });
        row.addEventListener('mouseleave', function() { row.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : ''; });

        const nameCell = document.createElement('div');
        const n1 = document.createElement('div');
        n1.setAttribute('style', 'font-size:0.82rem;font-weight:600;color:#eee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
        n1.textContent = s.title;
        const n2 = document.createElement('div');
        n2.setAttribute('style', 'font-size:0.68rem;color:#444;margin-top:1px;');
        n2.textContent = s.id + ' \u00B7 ' + s.category;
        nameCell.appendChild(n1);
        nameCell.appendChild(n2);
        row.appendChild(nameCell);

        [
          [s.realClicks, '#2dd4a0', true],
          [s.baseClicks, '#555',    false],
          [s.total,      '#f5a623', false],
        ].forEach(function(col) {
          const d = document.createElement('div');
          d.setAttribute('style', 'font-size:0.85rem;font-weight:' + (col[2] ? '700' : '500') + ';color:' + col[1] + ';');
          d.textContent = String(col[0]);
          row.appendChild(d);
        });

        tableWrap.appendChild(row);
      });
    }

    /* Footer / reset */
    const footer = document.createElement('div');
    footer.setAttribute('style', 'padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;');

    const note = document.createElement('span');
    note.setAttribute('style', 'font-size:0.72rem;color:#444;');
    note.textContent = 'Real = actual "View on Amazon" button clicks in this browser';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '\uD83D\uDDD1 Reset My Clicks';
    resetBtn.setAttribute('style', [
      'background:rgba(232,66,110,0.1);border:1px solid rgba(232,66,110,0.2);',
      'color:#e8426e;font-size:0.75rem;font-weight:600;',
      'padding:0.4rem 0.85rem;border-radius:20px;cursor:pointer;',
    ].join(''));
    resetBtn.addEventListener('click', function() {
      if (confirm('Reset ALL your tracked click counts? This cannot be undone.')) {
        ClickTracker.reset();
        self.open();
        setTimeout(function() { self.open(); }, 50);
      }
    });

    footer.appendChild(note);
    footer.appendChild(resetBtn);

    box.appendChild(header);
    box.appendChild(summary);
    box.appendChild(tableWrap);
    box.appendChild(footer);
    overlay.appendChild(box);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) self.open();
    });

    document.body.appendChild(overlay);
    this._el = overlay;
  },
};

/* ═══════════════════════════════════════════════════════════
   10. NAVIGATION
   ═══════════════════════════════════════════════════════════ */
const Nav = {
  _ham: null,
  _links: null,

  init() {
    this._ham   = DOM.q('#hamburger');
    this._links = DOM.q('#nav-links');

    const self = this;
    document.addEventListener('click', function(e) {
      const navEl = e.target.closest('[data-nav]');
      if (navEl) { e.preventDefault(); Router.go(navEl.dataset.nav); return; }

      if (e.target.closest('#modal-close') || e.target.id === 'modal-backdrop') {
        WallModal.close(); return;
      }
      if (e.target.closest('#disclosure-close')) {
        const bar = DOM.q('#disclosure-bar');
        if (bar) bar.style.display = 'none';
        return;
      }
      if (e.target.closest('[data-subscribe]')) {
        self._handleSubscribe(e.target.closest('[data-subscribe]')); return;
      }

      // Home & Living subcategory tabs
      const homeTab = e.target.closest('[data-home-sub]');
      if (homeTab) {
        State.homeSubFilter = homeTab.dataset.homeSub;
        DOM.qa('.home-tabs .gtab').forEach(function(b) {
          b.classList.toggle('active', b === homeTab);
          b.setAttribute('aria-selected', b === homeTab ? 'true' : 'false');
        });
        Renderer.renderPage('home-living'); return;
      }

      const groomTab = e.target.closest('[data-groom]');
      if (groomTab) {
        State.groomFilter = groomTab.dataset.groom;
        DOM.qa('.grooming-tabs .gtab').forEach(function(b) {
          b.classList.toggle('active', b === groomTab);
          b.setAttribute('aria-selected', b === groomTab ? 'true' : 'false');
        });
        Renderer.renderPage('grooming'); return;
      }

      const offerTab = e.target.closest('[data-offer]');
      if (offerTab) {
        State.offerFilter = offerTab.dataset.offer;
        DOM.qa('.deals-tabs .gtab').forEach(function(b) {
          b.classList.toggle('active', b === offerTab);
          b.setAttribute('aria-selected', b === offerTab ? 'true' : 'false');
        });
        Renderer.renderOffers(State.offerFilter); return;
      }

      const wallTab = e.target.closest('[data-wall]');
      if (wallTab) {
        State.wallFilter = wallTab.dataset.wall;
        DOM.qa('.wallpaper-tabs .gtab').forEach(function(b) {
          b.classList.toggle('active', b === wallTab);
          b.setAttribute('aria-selected', b === wallTab ? 'true' : 'false');
        });
        Renderer.renderWallpapersFiltered(State.wallFilter); return;
      }
    });

    this._ham && this._ham.addEventListener('click', function() { self._toggleMobile(); });

    const scrollBtn = DOM.q('#scroll-top');
    if (scrollBtn) scrollBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  _toggleMobile() {
    const open = !this._links.classList.contains('open');
    this._links.classList.toggle('open', open);
    this._ham.setAttribute('aria-expanded', String(open));
    this._ham.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  },

  closeMobile() {
    if (!this._links) return;
    this._links.classList.remove('open');
    this._ham && this._ham.setAttribute('aria-expanded', 'false');
    this._ham && this._ham.classList.remove('open');
    document.body.style.overflow = '';
  },

  _handleSubscribe(btn) {
  const form  = btn.closest('[role="form"], .email-sub-form');
  const input = form && form.querySelector('input[type="email"]');
  if (!input) return;

  const raw = input.value.trim();

  // Block empty submissions
  if (!raw) {
    Toast.show('Please enter your email first.', 'error');
    input.focus();
    return;
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    Toast.show('Please enter a valid email address.', 'error');
    input.focus();
    return;
  }

  // Send to Formspree
  fetch('https://formspree.io/f/mlgpyzrg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: raw,
      source: 'RealPicksOnly — notify button',
    }),
  })
  .then(() => {
    Toast.show('✓ Subscribed! You will be notified.', 'success');
    input.value = '';
    DOM.setText(btn, '✓ Subscribed!');
    btn.setAttribute('disabled', 'true');
    setTimeout(() => {
      DOM.setText(btn, 'Notify Me');
      btn.removeAttribute('disabled');
    }, 5000);
  })
  .catch(() => {
    Toast.show('Something went wrong. Try again.', 'error');
  });
},
};

/* ═══════════════════════════════════════════════════════════
   11. ROUTER
   ═══════════════════════════════════════════════════════════ */
const Router = {
  go(page) {
    if (!page) return;
    const safe = String(page).replace(/[^a-z-]/g, '');
    const prev = DOM.q('.page.active');
    const next = DOM.q('#page-' + safe);
    if (!next) return;

    if (prev && prev !== next) {
      prev.classList.add('page-exit');
      setTimeout(function() { prev.classList.remove('active', 'page-exit'); }, 200);
    }
    next.classList.add('active', 'page-enter');
    setTimeout(function() { next.classList.remove('page-enter'); }, 400);

    State.currentPage = safe;
    DOM.qa('.nav-link').forEach(function(l) {
      l.classList.toggle('active', l.dataset.page === safe);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    Nav.closeMobile();
    Renderer.renderPage(safe);
  },
};

/* ═══════════════════════════════════════════════════════════
   12. SEARCH
   ═══════════════════════════════════════════════════════════ */
const Search = {
  _input: null, _results: null, _wrap: null, _toggle: null, _timer: null,

  init() {
    this._input   = DOM.q('#search-input');
    this._results = DOM.q('#search-results');
    this._wrap    = DOM.q('#search-bar-wrap');
    this._toggle  = DOM.q('#search-toggle');
    const self = this;
    this._toggle && this._toggle.addEventListener('click', function() { self.toggle(); });
    this._input  && this._input.addEventListener('input',  function() { self._run(); });
    this._input  && this._input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') self.close();
    });
  },

  toggle() {
    const open = !this._wrap.classList.contains('open');
    this._wrap.classList.toggle('open', open);
    this._wrap.setAttribute('aria-hidden', String(!open));
    this._toggle.setAttribute('aria-expanded', String(open));
    if (open) { this._input && this._input.focus(); }
    else this.close();
  },

  close() {
    this._wrap && this._wrap.classList.remove('open');
    this._wrap && this._wrap.setAttribute('aria-hidden', 'true');
    this._toggle && this._toggle.setAttribute('aria-expanded', 'false');
    if (this._input)  this._input.value = '';
    if (this._results) DOM.clear(this._results);
  },

  _run() {
    const self = this;
    clearTimeout(this._timer);
    this._timer = setTimeout(function() {
      const q = self._input ? self._input.value.trim().toLowerCase() : '';
      if (!self._results) return;
      DOM.clear(self._results);
      if (q.length < 2) return;

      const hits = PRODUCTS.filter(function(p) {
        return p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.tags || []).some(function(t) { return t.toLowerCase().includes(q); });
      }).slice(0, 7);

      if (!hits.length) {
        self._results.appendChild(DOM.el('p', { className: 'sri-empty', text: 'No results found.' }));
        return;
      }

      const frag = document.createDocumentFragment();
      hits.forEach(function(p) {
        const img = DOM.el('img', {
          className: 'sri-img',
          attrs: { src: p.image || '', alt: '', loading: 'lazy', 'aria-hidden': 'true' },
        });
        img.addEventListener('error', function() { img.style.display = 'none'; });

        const item = DOM.el('div', {
          className: 'search-result-item',
          attrs: { role: 'option', tabindex: '0' },
        }, img,
          DOM.el('div', {},
            DOM.el('p', { className: 'sri-title', text: p.title }),
            DOM.el('p', { className: 'sri-price', text: Fmt.price(p.price) + ' \u00B7 -' + p.discount + '%' }),
          )
        );

        const go = function() { Router.go(p.category); self.close(); };
        item.addEventListener('click', go);
        item.addEventListener('keydown', function(e) { if (e.key === 'Enter') go(); });
        frag.appendChild(item);
      });
      self._results.appendChild(frag);
    }, 180);
  },
};

/* ═══════════════════════════════════════════════════════════
   13. THEME
   ═══════════════════════════════════════════════════════════ */
const Theme = {
  init() {
    var saved = 'dark';
    try { saved = localStorage.getItem('rpo_theme') || 'dark'; } catch {}
    this._apply(saved);
    const self = this;
    const btn = DOM.q('#theme-toggle');
    if (btn) btn.addEventListener('click', function() {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      self._apply(next);
      try { localStorage.setItem('rpo_theme', next); } catch {}
    });
  },
  _apply(t) {
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
  },
};

/* ═══════════════════════════════════════════════════════════
   14. SCROLL + ANIMATIONS
   ═══════════════════════════════════════════════════════════ */
const Scroll = {
  init() {
    const btn    = DOM.q('#scroll-top');
    const navbar = DOM.q('#navbar');
    window.addEventListener('scroll', function() {
      const y = window.scrollY;
      if (btn) btn.classList.toggle('visible', y > 280);
      if (navbar) navbar.classList.toggle('scrolled', y > 8);
    }, { passive: true });
  },
};

const Anim = {
  _obs: null,
  init() {
    if (!('IntersectionObserver' in window)) return;
    const self = this;
    this._obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          self._obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '60px' });

    new MutationObserver(function() { self._watch(); })
      .observe(document.body, { childList: true, subtree: true });
  },
  _watch() {
    const self = this;
    DOM.qa('.product-card, .wallpaper-card, .mp-card, .cat-card').forEach(function(c) {
      if (!c.dataset.watched) { c.dataset.watched = '1'; self._obs && self._obs.observe(c); }
    });
  },
};

/* ═══════════════════════════════════════════════════════════
   15. KEYBOARD SHORTCUTS
   ═══════════════════════════════════════════════════════════ */
const Keys = {
  init() {
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); Search.toggle(); return;
      }
      if (e.key === 'Escape') {
        WallModal.close(); Search.close(); return;
      }
      // YOUR SECRET SHORTCUT: Shift + Ctrl + D = open click stats
      if (e.shiftKey && e.ctrlKey && e.key === 'D') {
        e.preventDefault(); StatsDashboard.open(); return;
      }
    });
  },
};

/* ═══════════════════════════════════════════════════════════
   16. EXTERNAL LINK SAFETY
   ═══════════════════════════════════════════════════════════ */
const LinkSafety = {
  init() {
    document.addEventListener('click', function(e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        if (!a.rel || !a.rel.includes('noopener')) a.rel = 'noopener noreferrer';
        if (!a.target) a.target = '_blank';
      }
    });
  },
};

/* ═══════════════════════════════════════════════════════════
   17. BOOT
   ═══════════════════════════════════════════════════════════ */
(function boot() {
  Theme.init();
  ClickTracker.init();

  ['trending-grid', 'deals-grid', 'budget-grid'].forEach(function(id) {
    Renderer.showSkeletons(id, 4);
  });

  const yr = DOM.q('#footer-year');
  if (yr) yr.textContent = new Date().getFullYear();

  Nav.init();
  Search.init();
  Scroll.init();
  Keys.init();
  LinkSafety.init();
  Anim.init();

  window.addEventListener('load', function() {
    setTimeout(function() {
      const loader = DOM.q('#page-loader');
      if (loader) loader.classList.add('out');
      Renderer.renderHome();
    }, 900);
  });

  try {
    console.info('%c\u25C8 RealPicksOnly', 'color:#f5a623;font-size:18px;font-weight:800;');
    console.info('%cv2.1 \u2014 Bug fixes applied', 'color:#2dd4a0;font-size:11px;');
    console.info('%cShift+Ctrl+D \u2192 Click Stats Dashboard', 'color:#f5a623;font-size:11px;');
  } catch {}
})();
