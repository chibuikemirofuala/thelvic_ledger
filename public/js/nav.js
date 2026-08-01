const LOGO_SVG = `<svg class="logo-icon" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="6" y="8" width="20" height="18" rx="2" fill="#f5e6c8" stroke="#8b6914" stroke-width="1.2"/>
  <rect x="8" y="10" width="16" height="12" rx="1" fill="#e8c872"/>
  <ellipse cx="16" cy="14" rx="5" ry="3" fill="#d4a843"/>
  <path d="M6 12 Q16 6 26 12" fill="none" stroke="#8b6914" stroke-width="1.2"/>
  <rect x="14" y="6" width="4" height="4" rx="1" fill="#c45c26"/>
</svg>`;

function renderNav(activePage) {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  nav.innerHTML = `
    <span class="logo">${LOGO_SVG} Thelvic Ledger</span>
    <a href="/" data-page="admin">Admin</a>
    <a href="/sales.html" data-page="sales">Sales</a>
    <a href="/production.html" data-page="production">Production</a>
    <a href="/database.html" data-page="database">Database</a>
    <a href="/tax.html" data-page="tax">Tax</a>
    <a href="/expenses.html" data-page="expenses">Expenses</a>
  `;
  setActiveNav(activePage);
}
