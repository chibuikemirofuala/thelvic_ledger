function getToken() {
  return sessionStorage.getItem(AUTH_KEY);
}

function setToken(token) {
  sessionStorage.setItem(AUTH_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(AUTH_KEY);
}

async function verifySession() {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/check', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

function showLoginGate() {
  document.body.classList.add('auth-locked');
  if (document.getElementById('authGate')) return;

  const gate = document.createElement('div');
  gate.id = 'authGate';
  gate.className = 'auth-gate';
  gate.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">Thelvic Ledger</div>
      <h2>Sign in required</h2>
      <p>This page is password protected.</p>
      <label for="authPassword">Password</label>
      <input type="password" id="authPassword" placeholder="Enter password" autocomplete="current-password">
      <button class="btn btn-primary" id="authSubmit" style="width:100%;margin-top:0.75rem">Unlock</button>
      <p class="auth-error" id="authError"></p>
    </div>
  `;
  document.body.appendChild(gate);

  const submit = () => attemptLogin();
  document.getElementById('authSubmit').addEventListener('click', submit);
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });
}

async function attemptLogin() {
  const password = document.getElementById('authPassword').value;
  const errEl = document.getElementById('authError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      errEl.textContent = 'Incorrect password';
      return;
    }
    const { token } = await res.json();
    setToken(token);
    document.body.classList.remove('auth-locked');
    document.getElementById('authGate')?.remove();
    window.dispatchEvent(new Event('auth-ready'));
  } catch {
    errEl.textContent = 'Login failed. Try again.';
  }
}

async function requireAuth() {
  if (await verifySession()) {
    document.body.classList.remove('auth-locked');
    return true;
  }
  clearToken();
  showLoginGate();
  return new Promise(resolve => {
    window.addEventListener('auth-ready', () => resolve(true), { once: true });
  });
}
