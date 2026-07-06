/**
 * Sidebar navigation — shared across all admin pages
 */
function loadSidebar(activePage) {
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', href: 'dashboard.html' },
    { id: 'products',  label: 'Produk',    icon: '📦', href: 'products.html' },
    { id: 'orders',    label: 'Pesanan',   icon: '📋', href: 'orders.html' },
  ];

  const html = `
  <aside class="fixed inset-y-0 left-0 w-64 bg-dark-800 border-r border-slate-800 z-40 hidden lg:flex flex-col">
    <div class="p-6 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20">⚡</div>
        <div>
          <h1 class="text-white font-black text-lg leading-tight">TechStore</h1>
          <p class="text-cyan-400 text-[10px] font-semibold tracking-widest uppercase">Admin Panel</p>
        </div>
      </div>
    </div>
    <nav class="flex-1 p-4 space-y-1">
      ${menu.map(m => `
        <a href="${m.href}" class="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all
          ${activePage === m.id
            ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-400 border border-cyan-500/20'
            : 'text-slate-400 hover:bg-dark-700 hover:text-slate-200'}">
          <span class="text-lg">${m.icon}</span>
          ${m.label}
        </a>`).join('')}
    </nav>
    <div class="p-4 border-t border-slate-800">
      <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 font-medium text-sm transition-all">
        <span class="text-lg">🚪</span> Logout
      </button>
    </div>
  </aside>

  <!-- Mobile bottom nav -->
  <nav class="fixed bottom-0 inset-x-0 z-40 bg-dark-800 border-t border-slate-800 flex lg:hidden">
    ${menu.map(m => `
      <a href="${m.href}" class="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium
        ${activePage === m.id ? 'text-cyan-400' : 'text-slate-500'}">
        <span class="text-lg">${m.icon}</span>${m.label}
      </a>`).join('')}
    <button onclick="logout()" class="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-red-400">
      <span class="text-lg">🚪</span>Logout
    </button>
  </nav>`;

  document.getElementById('sidebar-container').innerHTML = html;
}
