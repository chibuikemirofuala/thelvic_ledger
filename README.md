# Bakery Books

A lightweight accounting MVP for a bakery — HTML/JS frontend with a SQLite backend.

## Quick Start

```bash
npm install
npm start
```

Open **http://localhost:3000**

## Pages

| Page | Purpose |
|------|---------|
| **Admin** | Dashboard with charts: revenue vs costs, profit, contribution margin by brand |
| **Sales** | Daily sales input, labour costs, diesel usage, optional material purchases |
| **Production** | Daily bread production by brand |
| **Database** | Configure brands/prices, materials, recipes, diesel rate |

## How Costs Work

- **Material cost**: Uses actual material purchases if logged on the Sales page; otherwise estimated from production × recipes.
- **Energy cost**: Diesel liters (Sales page) × diesel rate (Database page).
- **Labour cost**: Entered daily on the Sales page.
- **Profit** = Revenue − Material − Labour − Energy
- **Contribution margin per brand** = Brand revenue − direct material − allocated labour/energy

## Data Storage

All data is stored in `bakery.db` (SQLite) in the project root. Back it up by copying that file.

## Sample Data

On first run, the app seeds 4 bread brands, 5 materials, and sample recipes so you can explore immediately.
