let charts = {};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } }
};

function destroyCharts() {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};
}

function renderSummary(s) {
  const cards = [
    { label: 'Total Revenue', value: fmt(s.revenue), cls: 'positive' },
    { label: 'Total Costs', value: fmt(s.total_cost), cls: '' },
    { label: 'Profit / Loss', value: fmt(s.profit), cls: moneyClass(s.profit) },
    { label: 'Profit Margin', value: fmtPct(s.profit_margin_pct), cls: moneyClass(s.profit) }
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(c => `
    <div class="card stat">
      <div class="label">${c.label}</div>
      <div class="value ${c.cls}">${c.value}</div>
    </div>
  `).join('');

  const detail = [
    { label: 'Material Cost', value: fmt(s.material_cost) },
    { label: 'Labour Cost', value: fmt(s.labour_cost) },
    { label: 'Energy Cost', value: fmt(s.energy_cost) }
  ];
  detail.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'card stat';
    el.innerHTML = `<div class="label">${d.label}</div><div class="value">${d.value}</div>`;
    document.getElementById('summaryCards').appendChild(el);
  });
}

async function loadDashboard() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  try {
    const data = await API.get(`dashboard?start=${start}&end=${end}`);
    destroyCharts();
    renderSummary(data.summary);
    renderCharts(data);
    renderMarginTable(data.contribution_margins);
  } catch (err) {
    console.error(err);
    toast('Could not load dashboard. Check your login and try again.');
  }
}

function renderCharts(data) {
  if (typeof Chart === 'undefined') {
    toast('Charts failed to load. Check your internet connection.');
    return;
  }

  const s = data.summary;

  charts.revenueCost = new Chart(document.getElementById('revenueCostChart'), {
    type: 'bar',
    data: {
      labels: ['Revenue', 'Material', 'Labour', 'Energy', 'Profit'],
      datasets: [{
        label: 'Amount (N)',
        data: [s.revenue, s.material_cost, s.labour_cost, s.energy_cost, s.profit],
        backgroundColor: ['#2d7a4f', '#c45c26', '#5b7fa6', '#d4a017', s.profit >= 0 ? '#2d7a4f' : '#b33a3a']
      }]
    },
    options: { ...chartDefaults, plugins: { legend: { display: false } } }
  });

  charts.costBreakdown = new Chart(document.getElementById('costBreakdownChart'), {
    type: 'doughnut',
    data: {
      labels: ['Material', 'Labour', 'Energy'],
      datasets: [{
        data: [s.material_cost, s.labour_cost, s.energy_cost],
        backgroundColor: ['#c45c26', '#5b7fa6', '#d4a017']
      }]
    },
    options: chartDefaults
  });

  const dates = data.time_series.map(r => r.date);
  charts.sales = new Chart(document.getElementById('salesChart'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Revenue',
        data: data.time_series.map(r => r.revenue),
        borderColor: '#2d7a4f',
        backgroundColor: 'rgba(45,122,79,0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { ...chartDefaults, plugins: { legend: { display: false } } }
  });

  charts.prodSales = new Chart(document.getElementById('prodSalesChart'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: [
        {
          label: 'Production',
          data: data.time_series.map(r => r.production),
          borderColor: '#c45c26',
          tension: 0.3
        },
        {
          label: 'Sales (units)',
          data: data.time_series.map(r => r.sales_units),
          borderColor: '#2d7a4f',
          tension: 0.3
        }
      ]
    },
    options: chartDefaults
  });

  const margins = data.contribution_margins;
  charts.margin = new Chart(document.getElementById('marginChart'), {
    type: 'bar',
    data: {
      labels: margins.map(m => m.name),
      datasets: [
        { label: 'Revenue', data: margins.map(m => m.revenue), backgroundColor: '#2d7a4f' },
        { label: 'Contribution Margin', data: margins.map(m => m.contribution_margin), backgroundColor: '#c45c26' }
      ]
    },
    options: chartDefaults
  });
}

function renderMarginTable(margins) {
  const tbody = document.querySelector('#marginTable tbody');
  if (!margins.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No sales data in this range</td></tr>';
    return;
  }
  tbody.innerHTML = margins.map(m => `
    <tr>
      <td><strong>${m.name}</strong></td>
      <td>${fmt(m.revenue)}</td>
      <td>${fmt(m.direct_material)}</td>
      <td>${fmt(m.allocated_labour)}</td>
      <td>${fmt(m.allocated_energy)}</td>
      <td class="${moneyClass(m.contribution_margin)}">${fmt(m.contribution_margin)}</td>
      <td>${fmtPct(m.margin_pct)}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  renderNav('admin');

  document.getElementById('startDate').value = monthStartISO();
  document.getElementById('endDate').value = todayISO();

  document.getElementById('applyRange').addEventListener('click', loadDashboard);

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'today') {
        document.getElementById('startDate').value = todayISO();
        document.getElementById('endDate').value = todayISO();
      } else if (p === 'month') {
        document.getElementById('startDate').value = monthStartISO();
        document.getElementById('endDate').value = todayISO();
      } else {
        document.getElementById('startDate').value = '2020-01-01';
        document.getElementById('endDate').value = todayISO();
      }
      loadDashboard();
    });
  });

  await requireAuth();
  loadDashboard();
});
