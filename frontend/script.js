/**
 * =====================================================
 * TechStore — script.js (UAS Version, integrasi API)
 * Fullstack: Frontend (UTS) + REST API Backend (UAS)
 * =====================================================
 */
'use strict';

const BASE_URL = window.BACKEND_URL || 'http://localhost:3000';

// ── State ───────────────────────────────────────────
let STATE = {
  products: [],
  session : null,   // { id, name, email, role, token }
  cart    : [],     // dari API: [{id, product_id, name, price, image, stock, quantity}]
  orders  : [],
};

let FILTER = { search: '', category: 'all', maxPrice: 35000000, sort: 'default' };

const LS_SESSION = 'ts_session';
function lsGet(k, def = null) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : def; } catch { return def; } }
function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function lsRemove(k) { localStorage.removeItem(k); }

// ── API Helper ──────────────────────────────────────
async function api(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && STATE.session?.token) headers['Authorization'] = `Bearer ${STATE.session.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, ...data };
  } catch (err) {
    console.error('API error:', err);
    return { ok: false, success: false, message: 'Gagal terhubung ke server. Pastikan backend aktif.' };
  }
}

// ── INIT ────────────────────────────────────────────
async function init() {
  STATE.session = lsGet(LS_SESSION, null);
  renderNavAuth();
  await loadProducts();
  renderCategoryGrid();
  renderCategoryFilterSidebar();
  renderFeaturedProducts();
  if (STATE.session) await syncCart();
  updateCartBadge();
  showPage('home');
}

// ── PRODUCTS ─────────────────────────────────────────
async function loadProducts() {
  const res = await api('GET', '/api/products?limit=100');
  if (res.success) {
    STATE.products = res.data;
  } else {
    try {
      const r = await fetch('products.json');
      STATE.products = await r.json();
    } catch { STATE.products = []; }
  }
}

// ── AUTH ──────────────────────────────────────────────
function switchAuthTab(tab) {
  const tabLogin    = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin    = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');

  if (tab === 'login') {
    tabLogin.className    = 'flex-1 py-3 rounded-lg text-sm font-display font-700 transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white';
    tabRegister.className = 'flex-1 py-3 rounded-lg text-sm font-display font-700 transition-all text-slate-400 hover:text-slate-200';
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  } else {
    tabRegister.className = 'flex-1 py-3 rounded-lg text-sm font-display font-700 transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white';
    tabLogin.className     = 'flex-1 py-3 rounded-lg text-sm font-display font-700 transition-all text-slate-400 hover:text-slate-200';
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash');
  }
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  if (!email || !password) { showFormError(errEl, 'Email dan password wajib diisi!'); return; }

  const res = await api('POST', '/api/auth/login', { email, password });
  if (!res.success) { showFormError(errEl, res.message); return; }

  hideFormError(errEl);
  STATE.session = res.data;
  lsSet(LS_SESSION, STATE.session);
  await syncCart();
  renderNavAuth();
  updateCartBadge();
  showToast(`Selamat datang, ${res.data.name}! 👋`, 'success');
  showPage('home');
}

async function handleRegister() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const errEl    = document.getElementById('reg-error');

  if (!name || !email || !password || !confirm) { showFormError(errEl, 'Semua field wajib diisi!'); return; }
  if (password.length < 6) { showFormError(errEl, 'Password minimal 6 karakter!'); return; }
  if (password !== confirm) { showFormError(errEl, 'Konfirmasi password tidak cocok!'); return; }

  const res = await api('POST', '/api/auth/register', { name, email, password });
  if (!res.success) { showFormError(errEl, res.message); return; }

  hideFormError(errEl);
  STATE.session = res.data;
  lsSet(LS_SESSION, STATE.session);
  renderNavAuth();
  updateCartBadge();
  showToast(`Akun berhasil dibuat! Selamat datang, ${name}! 🎉`, 'success');
  showPage('home');
}

function handleLogout() {
  STATE.session = null;
  STATE.cart    = [];
  STATE.orders  = [];
  lsRemove(LS_SESSION);
  renderNavAuth();
  updateCartBadge();
  showToast('Berhasil logout. Sampai jumpa!', 'info');
  showPage('home');
}

function showFormError(el, msg) {
  if (!el) return;
  const span = el.querySelector('span');
  if (span) span.textContent = msg; else el.textContent = msg;
  el.classList.remove('hidden');
}
function hideFormError(el) { if (el) el.classList.add('hidden'); }

// ── CART (API) ────────────────────────────────────────
async function syncCart() {
  if (!STATE.session) return;
  const res = await api('GET', '/api/cart', null, true);
  if (res.success) STATE.cart = res.data.items || [];
}

async function addToCart(productId, qty = 1) {
  if (!STATE.session) { showToast('Silakan login terlebih dahulu!', 'warning'); showPage('auth'); return; }

  const res = await api('POST', '/api/cart', { product_id: productId, quantity: qty }, true);
  if (!res.success) { showToast(res.message, 'error'); return; }

  await syncCart();
  updateCartBadge();
  showToast('Produk ditambahkan ke keranjang! 🛒', 'success');
}

async function updateCartQty(cartId, delta) {
  const item = STATE.cart.find(i => i.id === cartId);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty < 1) { await removeFromCart(cartId); return; }

  const res = await api('PUT', `/api/cart/${cartId}`, { quantity: newQty }, true);
  if (res.success) {
    await syncCart();
    renderCartPage();
    updateCartBadge();
  }
}

async function removeFromCart(cartId) {
  const res = await api('DELETE', `/api/cart/${cartId}`, null, true);
  if (res.success) {
    await syncCart();
    renderCartPage();
    updateCartBadge();
    showToast('Item dihapus dari keranjang.', 'info');
  }
}

function getCartTotal()     { return STATE.cart.reduce((s, i) => s + i.price * i.quantity, 0); }
function getCartItemCount() { return STATE.cart.reduce((s, i) => s + i.quantity, 0); }

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCartItemCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── CHECKOUT ──────────────────────────────────────────
function goToCheckout() {
  if (!STATE.session) { showToast('Silakan login terlebih dahulu!', 'warning'); showPage('auth'); return; }
  if (STATE.cart.length === 0) { showToast('Keranjang Anda masih kosong!', 'warning'); return; }
  renderCheckoutPage();
  showPage('checkout');
}

async function handleCheckout() {
  const name    = document.getElementById('co-name').value.trim();
  const phone   = document.getElementById('co-phone').value.trim();
  const address = document.getElementById('co-address').value.trim();
  const city    = document.getElementById('co-city').value.trim();
  const postal  = document.getElementById('co-postal').value.trim();
  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'Transfer Bank';
  const errEl   = document.getElementById('co-error');

  if (!name || !phone || !address || !city || !postal) {
    showFormError(errEl, 'Semua field pengiriman wajib diisi!'); return;
  }
  if (!/^[\d\-\+\s]{8,15}$/.test(phone)) {
    showFormError(errEl, 'Format nomor HP tidak valid!'); return;
  }
  hideFormError(errEl);

  const res = await api('POST', '/api/orders/checkout', { name, phone, address, city, postal, payment }, true);
  if (!res.success) { showFormError(errEl, res.message || 'Gagal melakukan checkout.'); return; }

  STATE.cart = [];
  updateCartBadge();
  document.getElementById('success-txid').textContent = `Transaction ID: ${res.data.txId}`;
  showPage('success');
}

// ── ORDER HISTORY ──────────────────────────────────────
async function loadOrders() {
  if (!STATE.session) return;
  const res = await api('GET', '/api/orders', null, true);
  if (res.success) STATE.orders = res.data;
}

// ── UI HELPERS ────────────────────────────────────────
function showToast(message, type = 'info') {
  const colors = {
    success: 'border-green-500/30 text-green-400',
    error  : 'border-red-500/30 text-red-400',
    warning: 'border-amber-500/30 text-amber-400',
    info   : 'border-cyan-500/30 text-cyan-400',
  };
  const icons = { success:'fa-check-circle', error:'fa-times-circle', warning:'fa-exclamation-triangle', info:'fa-info-circle' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `glass-card px-5 py-3 rounded-xl border ${colors[type] || colors.info} flex items-center gap-2 shadow-xl pointer-events-auto transition-all duration-300`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span class="text-slate-200 text-sm">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(s => s.classList.add('hidden'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (pageId === 'products') renderProductsPage();
  if (pageId === 'cart')     renderCartPage();
  if (pageId === 'history')  { loadOrders().then(renderHistoryPage); }
}

function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (menu) menu.classList.add('hidden');
}

// ── RENDER NAV ────────────────────────────────────────
function renderNavAuth() {
  const container = document.getElementById('nav-auth');
  if (!container) return;

  if (STATE.session) {
    container.innerHTML = `
      <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-slate-700">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
          ${STATE.session.name.charAt(0).toUpperCase()}
        </div>
        <span class="text-slate-300 text-sm font-medium">${STATE.session.name.split(' ')[0]}</span>
      </div>
      <button onclick="handleLogout()" class="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:border-red-500/50 hover:text-red-400 text-sm font-medium transition-all">
        Logout
      </button>`;
  } else {
    container.innerHTML = `
      <button onclick="showPage('auth')" class="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:border-cyan-500/50 hover:text-cyan-400 text-sm font-medium transition-all">
        Login
      </button>
      <button onclick="showPage('auth')" class="btn-primary px-4 py-2 rounded-xl text-white text-sm font-medium">
        Daftar
      </button>`;
  }
}

// ── RENDER CATEGORIES (home grid) ─────────────────────
const ICON_MAP = { 'Laptop':'💻','Smartphone':'📱','Audio':'🎧','Tablet':'📟','Wearable':'⌚','Aksesoris':'🖱️','Monitor':'🖥️','Drone':'🚁','Kamera':'📷' };

function renderCategoryGrid() {
  const container = document.getElementById('category-grid');
  if (!container) return;

  const catMap = {};
  STATE.products.forEach(p => {
    const cat = p.category || 'Lainnya';
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  container.innerHTML = Object.entries(catMap).map(([cat, count]) => `
    <button onclick="filterByCategory('${cat}')"
      class="group flex flex-col items-center gap-3 p-5 rounded-2xl glass-card hover:border-cyan-500/50 transition-all duration-300 cursor-pointer">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/20
        flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
        ${ICON_MAP[cat] || '📦'}
      </div>
      <div class="text-center">
        <p class="text-slate-200 font-semibold text-sm">${cat}</p>
        <p class="text-slate-500 text-xs">${count} produk</p>
      </div>
    </button>`).join('');
}

function filterByCategory(cat) {
  FILTER.category = cat;
  showPage('products');
}

// ── RENDER CATEGORY FILTER (sidebar produk) ───────────
function renderCategoryFilterSidebar() {
  const container = document.getElementById('category-filter');
  if (!container) return;

  const cats = [...new Set(STATE.products.map(p => p.category).filter(Boolean))];

  const renderBtn = (val, label) => `
    <button onclick="setCategoryFilter('${val}')" data-cat="${val}"
      class="cat-filter-btn text-left px-3 py-2 rounded-lg text-sm transition-all
        ${FILTER.category === val ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:bg-dark-700 border border-transparent'}">
      ${label}
    </button>`;

  container.innerHTML = renderBtn('all', '🗂️ Semua Kategori') +
    cats.map(c => renderBtn(c, `${ICON_MAP[c] || '📦'} ${c}`)).join('');
}

function setCategoryFilter(cat) {
  FILTER.category = cat;
  renderProductsPage();
  renderCategoryFilterSidebar();
}

// ── RENDER FEATURED PRODUCTS (home) ───────────────────
function renderFeaturedProducts() {
  const container = document.getElementById('featured-grid');
  if (!container) return;
  const featured = STATE.products.slice(0, 4);
  container.innerHTML = featured.map(p => productCard(p)).join('');
}

// ── RENDER PRODUCTS PAGE ──────────────────────────────
function renderProductsPage() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = FILTER.search;
  if (!searchInput.dataset.bound) {
    searchInput.addEventListener('input', () => { FILTER.search = searchInput.value; renderProductsPage(); });
    searchInput.dataset.bound = '1';
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.addEventListener('change', () => { FILTER.sort = sortSelect.value; renderProductsPage(); });
    sortSelect.dataset.bound = '1';
  }

  let filtered = [...STATE.products];

  if (FILTER.search) {
    const q = FILTER.search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }
  if (FILTER.category && FILTER.category !== 'all') {
    filtered = filtered.filter(p => p.category === FILTER.category);
  }
  if (FILTER.maxPrice) {
    filtered = filtered.filter(p => p.price <= FILTER.maxPrice);
  }

  const sortMap = {
    'price-asc':  (a,b) => a.price - b.price,
    'price-desc': (a,b) => b.price - a.price,
    'rating':     (a,b) => b.rating - a.rating,
    'name':       (a,b) => a.name.localeCompare(b.name),
  };
  if (sortMap[FILTER.sort]) filtered.sort(sortMap[FILTER.sort]);

  const container  = document.getElementById('products-grid');
  const noResults  = document.getElementById('no-results');
  const countLabel = document.getElementById('product-count-label');

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (noResults) noResults.classList.remove('hidden');
  } else {
    if (noResults) noResults.classList.add('hidden');
    container.innerHTML = filtered.map(p => productCard(p)).join('');
  }

  if (countLabel) countLabel.textContent = `Menampilkan ${filtered.length} dari ${STATE.products.length} produk`;
}

function updatePriceLabel(val) {
  FILTER.maxPrice = parseInt(val);
  const label = document.getElementById('price-label');
  if (label) label.textContent = `Rp ${parseInt(val).toLocaleString('id-ID')}`;
  renderProductsPage();
}

function resetFilters() {
  FILTER = { search: '', category: 'all', maxPrice: 35000000, sort: 'default' };
  const searchInput = document.getElementById('search-input');
  const priceRange  = document.getElementById('price-range');
  const priceLabel  = document.getElementById('price-label');
  const sortSelect  = document.getElementById('sort-select');
  if (searchInput) searchInput.value = '';
  if (priceRange)  priceRange.value  = 35000000;
  if (priceLabel)  priceLabel.textContent = 'Semua';
  if (sortSelect)  sortSelect.value  = 'default';
  renderCategoryFilterSidebar();
  renderProductsPage();
}

// ── PRODUCT CARD ──────────────────────────────────────
function productCard(p) {
  const discount = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
  const badgeColors = {
    'Best Seller': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'New'        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Hot'        : 'bg-red-500/20 text-red-400 border-red-500/30',
    'Sale'       : 'bg-green-500/20 text-green-400 border-green-500/30',
    'Gaming'     : 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Best Value' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };
  const stars = '⭐'.repeat(Math.round(p.rating || 0));

  return `
  <div class="group relative glass-card rounded-2xl overflow-hidden hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-500 flex flex-col">
    <div class="relative overflow-hidden bg-dark-700 aspect-square cursor-pointer" onclick="showProductDetail(${p.id})">
      <img src="${p.image || ''}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        onerror="this.src='https://via.placeholder.com/400x400/1e293b/64748b?text=No+Image'">
      ${p.badge ? `<span class="absolute top-3 left-3 px-2.5 py-1 rounded-full border text-xs font-semibold ${badgeColors[p.badge] || 'bg-slate-700 text-slate-300 border-slate-600'}">${p.badge}</span>` : ''}
      ${discount > 0 ? `<span class="absolute top-3 right-3 px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold">-${discount}%</span>` : ''}
    </div>
    <div class="p-4 flex flex-col flex-1 gap-3">
      <div class="cursor-pointer" onclick="showProductDetail(${p.id})">
        <p class="text-slate-500 text-xs mb-1">${p.category || ''}</p>
        <h3 class="text-slate-100 font-semibold text-sm leading-tight line-clamp-2">${p.name}</h3>
      </div>
      <div class="flex items-center gap-2 text-xs text-slate-500">
        <span>${stars}</span><span>${p.rating || 0}</span><span>(${p.reviews || 0})</span>
        <span class="ml-auto ${p.stock > 0 ? 'text-emerald-400' : 'text-red-400'}">${p.stock > 0 ? `Stok: ${p.stock}` : 'Habis'}</span>
      </div>
      <div class="mt-auto">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-cyan-400 font-bold text-base">Rp ${p.price.toLocaleString('id-ID')}</span>
          ${p.original_price ? `<span class="text-slate-600 text-xs line-through">Rp ${p.original_price.toLocaleString('id-ID')}</span>` : ''}
        </div>
        <button onclick="addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}
          class="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
            ${p.stock > 0 ? 'btn-primary text-white' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-600'}">
          ${p.stock > 0 ? '🛒 Tambah ke Keranjang' : 'Stok Habis'}
        </button>
      </div>
    </div>
  </div>`;
}

// ── PRODUCT DETAIL MODAL ───────────────────────────────
function showProductDetail(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;

  const specs = Array.isArray(p.specs) ? p.specs : [];
  document.getElementById('modal-content').innerHTML = `
    <div class="relative">
      <img src="${p.image || ''}" alt="${p.name}" class="w-full h-72 object-cover rounded-t-3xl"
        onerror="this.src='https://via.placeholder.com/600x400/1e293b/64748b?text=No+Image'">
      <button onclick="closeProductModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="p-6">
      <p class="text-slate-500 text-xs mb-1">${p.category || ''}</p>
      <h2 class="font-display font-800 text-2xl text-white mb-2">${p.name}</h2>
      <div class="flex items-center gap-2 text-sm text-slate-400 mb-4">
        <span>⭐ ${p.rating || 0}</span><span>(${p.reviews || 0} ulasan)</span>
        <span class="ml-auto ${p.stock > 0 ? 'text-emerald-400' : 'text-red-400'}">${p.stock > 0 ? `Stok: ${p.stock}` : 'Stok Habis'}</span>
      </div>
      <div class="flex items-center gap-3 mb-4">
        <span class="text-cyan-400 font-bold text-2xl">Rp ${p.price.toLocaleString('id-ID')}</span>
        ${p.original_price ? `<span class="text-slate-600 text-sm line-through">Rp ${p.original_price.toLocaleString('id-ID')}</span>` : ''}
      </div>
      <p class="text-slate-400 text-sm leading-relaxed mb-5">${p.description || ''}</p>
      ${specs.length ? `
        <div class="mb-5">
          <h4 class="text-white font-semibold text-sm mb-2">Spesifikasi</h4>
          <ul class="grid grid-cols-1 gap-1.5">
            ${specs.map(s => `<li class="text-slate-400 text-sm flex items-center gap-2"><i class="fas fa-check-circle text-cyan-400 text-xs"></i>${s}</li>`).join('')}
          </ul>
        </div>` : ''}
      <button onclick="addToCart(${p.id}); closeProductModal();" ${p.stock === 0 ? 'disabled' : ''}
        class="w-full py-3.5 rounded-xl font-display font-700 text-sm ${p.stock > 0 ? 'btn-primary text-white' : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}">
        ${p.stock > 0 ? '🛒 Tambah ke Keranjang' : 'Stok Habis'}
      </button>
    </div>`;

  document.getElementById('modal-product').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('modal-product').classList.add('hidden');
}

// ── RENDER CART PAGE ──────────────────────────────────
function renderCartPage() {
  const container = document.getElementById('cart-items-container');
  const emptyEl   = document.getElementById('cart-empty');
  if (!container) return;

  if (STATE.cart.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
  } else {
    if (emptyEl) emptyEl.classList.add('hidden');
    container.innerHTML = STATE.cart.map(item => `
      <div class="glass-card rounded-2xl p-4 flex items-center gap-4 mb-4">
        <img src="${item.image || ''}" alt="${item.name}" class="w-20 h-20 object-cover rounded-xl bg-dark-700"
          onerror="this.src='https://via.placeholder.com/80x80/1e293b/64748b?text=IMG'">
        <div class="flex-1 min-w-0">
          <h4 class="text-slate-200 font-semibold text-sm truncate">${item.name}</h4>
          <p class="text-cyan-400 font-bold mt-1">Rp ${item.price.toLocaleString('id-ID')}</p>
        </div>
        <div class="flex items-center gap-2 bg-dark-700 rounded-xl border border-slate-700 overflow-hidden">
          <button onclick="updateCartQty(${item.id}, -1)" class="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-600 transition-all">−</button>
          <span class="px-3 py-2 text-slate-200 font-semibold min-w-[2rem] text-center">${item.quantity}</span>
          <button onclick="updateCartQty(${item.id}, 1)" class="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-600 transition-all">+</button>
        </div>
        <div class="text-right">
          <p class="text-slate-200 font-bold text-sm">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</p>
          <button onclick="removeFromCart(${item.id})" class="text-red-400 hover:text-red-300 text-xs mt-1 transition-colors">Hapus</button>
        </div>
      </div>`).join('');
  }

  const itemCountEl = document.getElementById('cart-item-count');
  const subtotalEl   = document.getElementById('cart-subtotal');
  const totalEl      = document.getElementById('cart-total-price');
  const count = getCartItemCount();
  const total = getCartTotal();
  if (itemCountEl) itemCountEl.textContent = count;
  if (subtotalEl)  subtotalEl.textContent  = `Rp ${total.toLocaleString('id-ID')}`;
  if (totalEl)     totalEl.textContent     = `Rp ${total.toLocaleString('id-ID')}`;
}

// ── RENDER CHECKOUT ───────────────────────────────────
function renderCheckoutPage() {
  const container = document.getElementById('co-items');
  if (!container) return;
  container.innerHTML = STATE.cart.map(item => `
    <div class="flex items-center gap-3 py-3 border-b border-slate-700/50 last:border-0">
      <img src="${item.image || ''}" alt="${item.name}" class="w-14 h-14 object-cover rounded-xl bg-dark-700"
        onerror="this.src='https://via.placeholder.com/56'">
      <div class="flex-1 min-w-0">
        <p class="text-slate-200 text-sm font-semibold line-clamp-1">${item.name}</p>
        <p class="text-slate-500 text-xs">x${item.quantity}</p>
      </div>
      <p class="text-cyan-400 font-bold text-sm">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</p>
    </div>`).join('');

  const totalEl = document.getElementById('co-total');
  if (totalEl) totalEl.textContent = `Rp ${getCartTotal().toLocaleString('id-ID')}`;

  if (STATE.session) {
    const nameEl = document.getElementById('co-name');
    if (nameEl && !nameEl.value) nameEl.value = STATE.session.name || '';
  }
}

// ── RENDER HISTORY (ORDERS) ────────────────────────────
function renderHistoryPage() {
  const container = document.getElementById('history-container');
  const emptyEl   = document.getElementById('history-empty');
  if (!container) return;

  if (!STATE.session || STATE.orders.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  const statusColors = {
    'Diproses':   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Dikirim':    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Selesai':    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Dibatalkan': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  container.innerHTML = STATE.orders.map(order => {
    const date = new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    return `
      <div class="glass-card rounded-2xl p-5 mb-4">
        <div class="flex items-start justify-between mb-4">
          <div>
            <p class="text-slate-400 text-xs mb-1">ID Transaksi</p>
            <p class="text-cyan-400 font-mono font-bold">${order.tx_id}</p>
            <p class="text-slate-500 text-xs mt-1">${date}</p>
          </div>
          <span class="px-3 py-1.5 rounded-full border text-xs font-semibold ${statusColors[order.status] || 'bg-slate-700 text-slate-300 border-slate-600'}">
            ${order.status}
          </span>
        </div>
        <div class="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <p class="text-slate-500 text-xs">${order.item_count || '?'} item • ${order.payment_method}</p>
          <p class="text-white font-bold">Rp ${Number(order.total).toLocaleString('id-ID')}</p>
        </div>
      </div>`;
  }).join('');
}

// ── MOBILE MENU ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn  = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('hidden'));

  // setup payment radio styling
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-option div').forEach(el => {
        el.className = 'py-2.5 px-3 rounded-xl border border-slate-700 text-center text-xs font-medium text-slate-400 hover:border-cyan-500/30 transition-all';
      });
      const div = radio.nextElementSibling;
      if (div) div.className = 'py-2.5 px-3 rounded-xl border border-cyan-500/50 bg-cyan-500/10 text-center text-xs font-medium text-cyan-400 transition-all';
    });
  });

  init();
});
