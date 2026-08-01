const AUTH_KEY = 'thelvic_token';

const API = {
  authHeaders() {
    const token = sessionStorage.getItem(AUTH_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  async get(path) {
    const res = await fetch(`/api/${path}`, { headers: this.authHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed');
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(`/api/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  },
  async del(path) {
    const res = await fetch(`/api/${path}`, { method: 'DELETE', headers: this.authHeaders() });
    if (!res.ok) {
      let msg = 'Request failed';
      try { msg = (await res.json()).error || msg; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return res.json();
  }
};

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function fmt(n) {
  return 'N' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  return Number(n).toFixed(1) + '%';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function setActiveNav(page) {
  document.querySelectorAll('nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

function moneyClass(n) {
  return n >= 0 ? 'positive' : 'negative';
}
