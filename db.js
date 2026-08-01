const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bakery.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'kg',
    cost_per_unit REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand_id INTEGER NOT NULL,
    material_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    UNIQUE(brand_id, material_id)
  );

  CREATE TABLE IF NOT EXISTS energy_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    diesel_cost_per_liter REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    brand_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    brand_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS daily_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    labour_cost REAL NOT NULL DEFAULT 0,
    diesel_liters REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS material_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    material_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );
`);

const energyRow = db.prepare('SELECT id FROM energy_config WHERE id = 1').get();
if (!energyRow) {
  db.prepare('INSERT INTO energy_config (id, diesel_cost_per_liter) VALUES (1, 1.50)').run();
}

const brandCount = db.prepare('SELECT COUNT(*) AS c FROM brands').get().c;
if (brandCount === 0) {
  const insertBrand = db.prepare('INSERT INTO brands (name, price) VALUES (?, ?)');
  insertBrand.run('White Loaf', 3.50);
  insertBrand.run('Whole Wheat', 4.00);
  insertBrand.run('Sourdough', 5.50);
  insertBrand.run('Baguette', 2.75);

  const insertMaterial = db.prepare('INSERT INTO materials (name, unit, cost_per_unit) VALUES (?, ?, ?)');
  insertMaterial.run('Flour', 'kg', 0.80);
  insertMaterial.run('Sugar', 'kg', 1.20);
  insertMaterial.run('Yeast', 'g', 0.02);
  insertMaterial.run('Butter', 'kg', 4.50);
  insertMaterial.run('Salt', 'kg', 0.30);

  const insertRecipe = db.prepare('INSERT INTO recipes (brand_id, material_id, quantity) VALUES (?, ?, ?)');
  // White Loaf (brand 1)
  insertRecipe.run(1, 1, 0.5);
  insertRecipe.run(1, 2, 0.05);
  insertRecipe.run(1, 3, 10);
  insertRecipe.run(1, 5, 0.01);
  // Whole Wheat (brand 2)
  insertRecipe.run(2, 1, 0.55);
  insertRecipe.run(2, 2, 0.04);
  insertRecipe.run(2, 3, 12);
  insertRecipe.run(2, 5, 0.01);
  // Sourdough (brand 3)
  insertRecipe.run(3, 1, 0.6);
  insertRecipe.run(3, 3, 8);
  insertRecipe.run(3, 5, 0.015);
  // Baguette (brand 4)
  insertRecipe.run(4, 1, 0.35);
  insertRecipe.run(4, 3, 6);
  insertRecipe.run(4, 5, 0.008);
}

module.exports = db;
