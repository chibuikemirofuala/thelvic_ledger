const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'thelvic2026';
const authTokens = new Set();

app.use(express.json());

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && authTokens.has(token)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/auth/login', (req, res) => {
  if (req.body.password !== AUTH_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  authTokens.add(token);
  res.json({ token });
});

app.get('/api/auth/check', requireAuth, (_req, res) => {
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, 'public')));

function recipeCostPerUnit(brandId) {
  const rows = db.prepare(`
    SELECT r.quantity, m.cost_per_unit
    FROM recipes r
    JOIN materials m ON m.id = r.material_id
    WHERE r.brand_id = ?
  `).all(brandId);
  return rows.reduce((sum, row) => sum + row.quantity * row.cost_per_unit, 0);
}

function materialCostFromProduction(start, end) {
  const rows = db.prepare(`
    SELECT p.date, p.brand_id, p.quantity AS prod_qty, r.quantity AS recipe_qty, m.cost_per_unit
    FROM production p
    JOIN recipes r ON r.brand_id = p.brand_id
    JOIN materials m ON m.id = r.material_id
    WHERE p.date >= ? AND p.date <= ?
  `).all(start, end);
  return rows.reduce((sum, row) => sum + row.prod_qty * row.recipe_qty * row.cost_per_unit, 0);
}

function materialCostFromPurchases(start, end) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(total_cost), 0) AS total
    FROM material_purchases
    WHERE date >= ? AND date <= ?
  `).get(start, end);
  return row.total;
}

function getEnergyConfig() {
  return db.prepare('SELECT diesel_cost_per_liter FROM energy_config WHERE id = 1').get();
}

// --- Brands ---
app.get('/api/brands', (_req, res) => {
  const brands = db.prepare('SELECT * FROM brands ORDER BY name').all();
  res.json(brands.map(b => ({ ...b, unit_cost: recipeCostPerUnit(b.id) })));
});

app.post('/api/brands', requireAuth, (req, res) => {
  const { name, price } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = db.prepare('INSERT INTO brands (name, price) VALUES (?, ?)').run(name, price || 0);
    res.json({ id: result.lastInsertRowid, name, price: price || 0 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/brands/:id', requireAuth, (req, res) => {
  const { name, price } = req.body;
  db.prepare('UPDATE brands SET name = ?, price = ? WHERE id = ?').run(name, price, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/brands/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM brands WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Materials ---
app.get('/api/materials', (_req, res) => {
  res.json(db.prepare('SELECT * FROM materials ORDER BY name').all());
});

app.post('/api/materials', requireAuth, (req, res) => {
  const { name, unit, cost_per_unit } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = db.prepare('INSERT INTO materials (name, unit, cost_per_unit) VALUES (?, ?, ?)')
      .run(name, unit || 'kg', cost_per_unit || 0);
    res.json({ id: result.lastInsertRowid, name, unit: unit || 'kg', cost_per_unit: cost_per_unit || 0 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/materials/:id', requireAuth, (req, res) => {
  const { name, unit, cost_per_unit } = req.body;
  db.prepare('UPDATE materials SET name = ?, unit = ?, cost_per_unit = ? WHERE id = ?')
    .run(name, unit, cost_per_unit, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/materials/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Recipes ---
app.get('/api/recipes', requireAuth, (_req, res) => {
  const rows = db.prepare(`
    SELECT r.*, b.name AS brand_name, m.name AS material_name, m.unit
    FROM recipes r
    JOIN brands b ON b.id = r.brand_id
    JOIN materials m ON m.id = r.material_id
    ORDER BY b.name, m.name
  `).all();
  res.json(rows);
});

app.post('/api/recipes', requireAuth, (req, res) => {
  const { brand_id, material_id, quantity } = req.body;
  try {
    const result = db.prepare('INSERT INTO recipes (brand_id, material_id, quantity) VALUES (?, ?, ?)')
      .run(brand_id, material_id, quantity || 0);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/recipes/:id', requireAuth, (req, res) => {
  const { quantity } = req.body;
  db.prepare('UPDATE recipes SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/recipes/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Energy config ---
app.get('/api/energy-config', requireAuth, (_req, res) => {
  res.json(getEnergyConfig());
});

app.put('/api/energy-config', requireAuth, (req, res) => {
  const { diesel_cost_per_liter } = req.body;
  db.prepare('UPDATE energy_config SET diesel_cost_per_liter = ? WHERE id = 1').run(diesel_cost_per_liter || 0);
  res.json({ ok: true });
});

// --- Sales ---
app.get('/api/sales', (req, res) => {
  const { start, end } = req.query;
  let rows;
  if (start && end) {
    rows = db.prepare(`
      SELECT s.*, b.name AS brand_name, b.price
      FROM sales s JOIN brands b ON b.id = s.brand_id
      WHERE s.date >= ? AND s.date <= ?
      ORDER BY s.date DESC, b.name
    `).all(start, end);
  } else {
    rows = db.prepare(`
      SELECT s.*, b.name AS brand_name, b.price
      FROM sales s JOIN brands b ON b.id = s.brand_id
      ORDER BY s.date DESC, b.name
    `).all();
  }
  res.json(rows);
});

app.post('/api/sales', (req, res) => {
  const { date, entries } = req.body;
  if (!date || !entries) return res.status(400).json({ error: 'Date and entries required' });
  const insert = db.prepare('INSERT INTO sales (date, brand_id, quantity) VALUES (?, ?, ?)');
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (e.quantity > 0) insert.run(date, e.brand_id, e.quantity);
    }
  });
  tx();
  res.json({ ok: true });
});

app.delete('/api/sales/:id', (req, res) => {
  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Production ---
app.get('/api/production', (req, res) => {
  const { start, end } = req.query;
  let rows;
  if (start && end) {
    rows = db.prepare(`
      SELECT p.*, b.name AS brand_name
      FROM production p JOIN brands b ON b.id = p.brand_id
      WHERE p.date >= ? AND p.date <= ?
      ORDER BY p.date DESC, b.name
    `).all(start, end);
  } else {
    rows = db.prepare(`
      SELECT p.*, b.name AS brand_name
      FROM production p JOIN brands b ON b.id = p.brand_id
      ORDER BY p.date DESC, b.name
    `).all();
  }
  res.json(rows);
});

app.post('/api/production', (req, res) => {
  const { date, entries } = req.body;
  if (!date || !entries) return res.status(400).json({ error: 'Date and entries required' });
  const insert = db.prepare('INSERT INTO production (date, brand_id, quantity) VALUES (?, ?, ?)');
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (e.quantity > 0) insert.run(date, e.brand_id, e.quantity);
    }
  });
  tx();
  res.json({ ok: true });
});

app.delete('/api/production/:id', (req, res) => {
  db.prepare('DELETE FROM production WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Daily costs (labour + diesel) ---
app.get('/api/daily-costs', (req, res) => {
  const { start, end } = req.query;
  let rows;
  if (start && end) {
    rows = db.prepare('SELECT * FROM daily_costs WHERE date >= ? AND date <= ? ORDER BY date DESC').all(start, end);
  } else {
    rows = db.prepare('SELECT * FROM daily_costs ORDER BY date DESC').all();
  }
  res.json(rows);
});

app.post('/api/daily-costs', (req, res) => {
  const { date, labour_cost, diesel_liters } = req.body;
  db.prepare(`
    INSERT INTO daily_costs (date, labour_cost, diesel_liters)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET labour_cost = excluded.labour_cost, diesel_liters = excluded.diesel_liters
  `).run(date, labour_cost || 0, diesel_liters || 0);
  res.json({ ok: true });
});

// --- Material purchases ---
app.get('/api/material-purchases', (req, res) => {
  const { start, end } = req.query;
  let rows;
  if (start && end) {
    rows = db.prepare(`
      SELECT mp.*, m.name AS material_name, m.unit
      FROM material_purchases mp JOIN materials m ON m.id = mp.material_id
      WHERE mp.date >= ? AND mp.date <= ?
      ORDER BY mp.date DESC
    `).all(start, end);
  } else {
    rows = db.prepare(`
      SELECT mp.*, m.name AS material_name, m.unit
      FROM material_purchases mp JOIN materials m ON m.id = mp.material_id
      ORDER BY mp.date DESC
    `).all();
  }
  res.json(rows);
});

app.post('/api/material-purchases', (req, res) => {
  const { date, entries } = req.body;
  const insert = db.prepare('INSERT INTO material_purchases (date, material_id, quantity, total_cost) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (e.quantity > 0 || e.total_cost > 0) {
        insert.run(date, e.material_id, e.quantity || 0, e.total_cost || 0);
      }
    }
  });
  tx();
  res.json({ ok: true });
});

app.delete('/api/material-purchases/:id', (req, res) => {
  db.prepare('DELETE FROM material_purchases WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Dashboard ---
app.get('/api/dashboard', requireAuth, (req, res) => {
  const { start, end, groupBy } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end required' });

  const energy = getEnergyConfig();
  const dieselRate = energy.diesel_cost_per_liter;

  const salesByDate = db.prepare(`
    SELECT s.date, SUM(s.quantity * b.price) AS revenue, SUM(s.quantity) AS units
    FROM sales s JOIN brands b ON b.id = s.brand_id
    WHERE s.date >= ? AND s.date <= ?
    GROUP BY s.date ORDER BY s.date
  `).all(start, end);

  const productionByDate = db.prepare(`
    SELECT p.date, SUM(p.quantity) AS units
    FROM production p
    WHERE p.date >= ? AND p.date <= ?
    GROUP BY p.date ORDER BY p.date
  `).all(start, end);

  const dailyCosts = db.prepare(`
    SELECT * FROM daily_costs WHERE date >= ? AND date <= ? ORDER BY date
  `).all(start, end);

  const purchaseCost = materialCostFromPurchases(start, end);
  const recipeCost = materialCostFromProduction(start, end);
  const materialCost = purchaseCost > 0 ? purchaseCost : recipeCost;

  const totalRevenue = salesByDate.reduce((s, r) => s + r.revenue, 0);
  const totalLabour = dailyCosts.reduce((s, r) => s + r.labour_cost, 0);
  const totalEnergy = dailyCosts.reduce((s, r) => s + r.diesel_liters * dieselRate, 0);
  const totalCosts = materialCost + totalLabour + totalEnergy;
  const profit = totalRevenue - totalCosts;

  // Per-brand contribution margin
  const brandSales = db.prepare(`
    SELECT b.id, b.name, SUM(s.quantity * b.price) AS revenue, SUM(s.quantity) AS units_sold
    FROM sales s JOIN brands b ON b.id = s.brand_id
    WHERE s.date >= ? AND s.date <= ?
    GROUP BY b.id ORDER BY b.name
  `).all(start, end);

  const brandProduction = db.prepare(`
    SELECT p.brand_id, SUM(p.quantity) AS units_produced
    FROM production p
    WHERE p.date >= ? AND p.date <= ?
    GROUP BY p.brand_id
  `).all(start, end);
  const prodMap = Object.fromEntries(brandProduction.map(r => [r.brand_id, r.units_produced]));

  const totalUnitsSold = brandSales.reduce((s, b) => s + b.units_sold, 0);

  const contributionMargins = brandSales.map(b => {
    const unitsProduced = prodMap[b.id] || 0;
    const directMaterial = unitsProduced * recipeCostPerUnit(b.id);
    const shareLabour = totalUnitsSold > 0 ? (b.units_sold / totalUnitsSold) * totalLabour : 0;
    const shareEnergy = totalUnitsSold > 0 ? (b.units_sold / totalUnitsSold) * totalEnergy : 0;
    const variableCost = directMaterial + shareLabour + shareEnergy;
    return {
      brand_id: b.id,
      name: b.name,
      revenue: b.revenue,
      units_sold: b.units_sold,
      direct_material: directMaterial,
      allocated_labour: shareLabour,
      allocated_energy: shareEnergy,
      contribution_margin: b.revenue - variableCost,
      margin_pct: b.revenue > 0 ? ((b.revenue - variableCost) / b.revenue) * 100 : 0
    };
  });

  // Time series for charts
  const dates = [...new Set([
    ...salesByDate.map(r => r.date),
    ...productionByDate.map(r => r.date),
    ...dailyCosts.map(r => r.date)
  ])].sort();

  const costMap = Object.fromEntries(dailyCosts.map(r => [r.date, r]));
  const salesMap = Object.fromEntries(salesByDate.map(r => [r.date, r]));
  const prodMap2 = Object.fromEntries(productionByDate.map(r => [r.date, r]));

  const timeSeries = dates.map(date => {
    const rev = salesMap[date]?.revenue || 0;
    const dc = costMap[date];
    const lab = dc?.labour_cost || 0;
    const eng = (dc?.diesel_liters || 0) * dieselRate;
    return {
      date,
      revenue: rev,
      sales_units: salesMap[date]?.units || 0,
      production: prodMap2[date]?.units || 0,
      labour: lab,
      energy: eng
    };
  });

  res.json({
    summary: {
      revenue: totalRevenue,
      material_cost: materialCost,
      labour_cost: totalLabour,
      energy_cost: totalEnergy,
      total_cost: totalCosts,
      profit,
      profit_margin_pct: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
      material_source: purchaseCost > 0 ? 'purchases' : 'recipes'
    },
    contribution_margins: contributionMargins,
    time_series: timeSeries,
    sales_by_date: salesByDate,
    production_by_date: productionByDate
  });
});

app.listen(PORT, () => {
  console.log(`Bakery accounting running at http://localhost:${PORT}`);
});
