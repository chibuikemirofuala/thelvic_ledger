let brands = [];

async function loadBrands() {
  brands = await API.get('brands');
  const container = document.getElementById('prodInputs');
  container.innerHTML = brands.map(b => `
    <div class="input-grid">
      <label>${b.name} <span class="badge">~${fmt(b.unit_cost)}/unit material</span></label>
      <input type="number" min="0" step="1" data-brand-id="${b.id}" placeholder="0" class="prod-qty">
    </div>
  `).join('') || '<p class="empty">No brands configured. Add brands on the Database page.</p>';
}

async function loadRecent() {
  const rows = await API.get('production');
  const brandMap = Object.fromEntries(brands.map(b => [b.id, b]));
  const tbody = document.querySelector('#recentProduction tbody');
  const recent = rows.slice(0, 30);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">No production recorded yet</td></tr>';
    return;
  }
  tbody.innerHTML = recent.map(r => {
    const b = brandMap[r.brand_id] || { unit_cost: 0 };
    return `
      <tr>
        <td>${r.date}</td>
        <td>${r.brand_name}</td>
        <td>${r.quantity}</td>
        <td>${fmt(r.quantity * (b.unit_cost || 0))}</td>
        <td><button class="btn btn-danger btn-sm" data-delete-prod="${r.id}">Delete</button></td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  setActiveNav('production');
  document.getElementById('prodDate').value = todayISO();
  await loadBrands();
  await loadRecent();

  document.getElementById('saveProduction').addEventListener('click', async () => {
    const date = document.getElementById('prodDate').value;
    const entries = [...document.querySelectorAll('.prod-qty')].map(el => ({
      brand_id: Number(el.dataset.brandId),
      quantity: Number(el.value) || 0
    })).filter(e => e.quantity > 0);

    if (!entries.length) return toast('Enter at least one production quantity');
    await API.post('production', { date, entries });
    document.querySelectorAll('.prod-qty').forEach(el => el.value = '');
    toast('Production saved!');
    loadRecent();
  });

  document.querySelector('#recentProduction tbody').addEventListener('click', async e => {
    const id = e.target.dataset.deleteProd;
    if (!id) return;
    await API.del(`production/${id}`);
    toast('Production entry deleted');
    loadRecent();
  });
});
