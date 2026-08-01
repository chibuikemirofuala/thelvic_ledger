let brands = [];
let materials = [];

function updateSalesHeading(date) {
  const heading = document.getElementById('todaySalesHeading');
  if (!heading) return;
  heading.textContent = date === todayISO() ? "Today's Sales" : `Sales for ${date}`;
}

async function loadBrands() {
  brands = await API.get('brands');
  const container = document.getElementById('salesInputs');
  container.innerHTML = brands.map(b => `
    <div class="input-grid">
      <label>${b.name} <span class="badge">${fmt(b.price)}/unit</span></label>
      <input type="number" min="0" step="1" data-brand-id="${b.id}" placeholder="0" class="sale-qty">
    </div>
  `).join('') || '<p class="empty">No brands configured. Add brands on the Database page.</p>';
}

async function loadMaterials() {
  materials = await API.get('materials');
  const container = document.getElementById('materialInputs');
  container.innerHTML = materials.map(m => `
    <div class="input-grid" style="grid-template-columns:2fr 1fr 1fr">
      <label>${m.name} (${m.unit})</label>
      <input type="number" min="0" step="0.01" data-material-id="${m.id}" data-field="qty" placeholder="Qty">
      <input type="number" min="0" step="0.01" data-material-id="${m.id}" data-field="cost" placeholder="Cost (N)">
    </div>
  `).join('') || '<p class="empty">No materials configured.</p>';
}

async function loadTodaySales() {
  const date = document.getElementById('saleDate').value;
  updateSalesHeading(date);
  const rows = await API.get(`sales?start=${date}&end=${date}`);
  const tbody = document.querySelector('#recentSales tbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No sales recorded for this date</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.brand_name}</td>
      <td>${r.quantity}</td>
      <td>${fmt(r.quantity * r.price)}</td>
      <td><button class="btn btn-danger btn-sm" data-delete-sale="${r.id}">Delete</button></td>
    </tr>
  `).join('');
}

async function loadDailyCosts() {
  const date = document.getElementById('saleDate').value;
  const rows = await API.get(`daily-costs?start=${date}&end=${date}`);
  if (rows.length) {
    document.getElementById('labourCost').value = rows[0].labour_cost;
    document.getElementById('dieselLiters').value = rows[0].diesel_liters;
  } else {
    document.getElementById('labourCost').value = '';
    document.getElementById('dieselLiters').value = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  renderNav('sales');
  document.getElementById('saleDate').value = todayISO();
  await loadBrands();
  await loadMaterials();
  await loadTodaySales();
  await loadDailyCosts();

  document.getElementById('saleDate').addEventListener('change', () => {
    loadDailyCosts();
    loadTodaySales();
  });

  document.getElementById('saveSales').addEventListener('click', async () => {
    const date = document.getElementById('saleDate').value;
    const entries = [...document.querySelectorAll('.sale-qty')].map(el => ({
      brand_id: Number(el.dataset.brandId),
      quantity: Number(el.value) || 0
    })).filter(e => e.quantity > 0);

    if (!entries.length) return toast('Enter at least one sale quantity');
    await API.post('sales', { date, entries });
    document.querySelectorAll('.sale-qty').forEach(el => el.value = '');
    toast('Sales saved!');
    loadTodaySales();
  });

  document.getElementById('saveCosts').addEventListener('click', async () => {
    const date = document.getElementById('saleDate').value;
    await API.post('daily-costs', {
      date,
      labour_cost: Number(document.getElementById('labourCost').value) || 0,
      diesel_liters: Number(document.getElementById('dieselLiters').value) || 0
    });
    toast('Daily costs saved!');
  });

  document.getElementById('saveMaterials').addEventListener('click', async () => {
    const date = document.getElementById('saleDate').value;
    const entries = materials.map(m => {
      const qtyEl = document.querySelector(`[data-material-id="${m.id}"][data-field="qty"]`);
      const costEl = document.querySelector(`[data-material-id="${m.id}"][data-field="cost"]`);
      return {
        material_id: m.id,
        quantity: Number(qtyEl?.value) || 0,
        total_cost: Number(costEl?.value) || 0
      };
    }).filter(e => e.quantity > 0 || e.total_cost > 0);

    if (!entries.length) return toast('Enter at least one material purchase');
    await API.post('material-purchases', { date, entries });
    toast('Material purchases saved!');
  });

  document.querySelector('#recentSales tbody').addEventListener('click', async e => {
    const id = e.target.dataset.deleteSale;
    if (!id) return;
    await API.del(`sales/${id}`);
    toast('Sale deleted');
    loadTodaySales();
  });
});
