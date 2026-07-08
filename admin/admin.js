/**
 * TechStore Admin JS — Shared utilities & API calls
 */
'use strict';

const BASE_URL = 'https://web-production-11993.up.railway.app';

// ── Auth Guard ────────────────────────────────────────
function getToken() { return localStorage.getItem('admin_token'); }
function getAdminUser() { try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return null; } }

function requireAuth() {
  const token = getToken();
  if (!token) { window.location.href = 'index.html'; return null; }
  return token;
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = 'index.html';
}

// ── API Helper ────────────────────────────────────────
async function api(method, path, body = null) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(`${BASE_URL}${path}`, opts);
    if (res.status === 401) { logout(); return null; }
    return await res.json();
  } catch(e) {
    console.error('API error:', e);
    return { success: false, message: 'Gagal terhubung ke server.' };
  }
}

// ── Toast ─────────────────────────────────────────────
function toast(msg, type = 'success') {
  const colors = { success:'bg-emerald-500', error:'bg-red-500', warning:'bg-amber-500', info:'bg-cyan-500' };
  const el = document.createElement('div');
  el.className = `fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl text-white font-medium shadow-xl
    transition-all duration-300 ${colors[type]}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Format ────────────────────────────────────────────
function rupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function dateId(d) { return new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); }

// ── Render user info di navbar ─────────────────────────
function renderAdminNav() {
  const user = getAdminUser();
  const el   = document.getElementById('admin-name');
  if (el && user) el.textContent = user.name;
}

// ── Status badge ──────────────────────────────────────
function statusBadge(status) {
  const map = {
    'Diproses':   'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Dikirim':    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Selesai':    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Dibatalkan': 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return `<span class="px-2.5 py-1 rounded-full border text-xs font-semibold ${map[status] || 'bg-slate-700 text-slate-300 border-slate-600'}">${status}</span>`;
}
