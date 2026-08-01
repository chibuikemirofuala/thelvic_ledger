# Thelvic Ledger

A lightweight accounting MVP for a bakery — HTML/JS frontend with a SQLite backend.

## Quick Start

```bash
cd ~/Projects/bakery-accounting
npm install
npm start
```

Open **http://localhost:3000**

## Password

**Admin** and **Database** pages are password protected.

| Setting | Value |
|---------|-------|
| Default password | `thelvic2026` |
| Override | Set env var `AUTH_PASSWORD=your-password` before starting the server |

## Pages

| Page | URL | Access |
|------|-----|--------|
| **Admin** | `/` | Password required |
| **Sales** | `/sales.html` | Open |
| **Production** | `/production.html` | Open |
| **Database** | `/database.html` | Password required |
| **Tax** | `/tax.html` | Open (empty) |
| **Expenses** | `/expenses.html` | Open (empty) |

## Currency

All amounts display in **Naira (N)**.

## Data Storage

All data is stored in `bakery.db` (SQLite). Back it up by copying that file.

---

## Go Live Quickly

### Option 1 — Railway (easiest, ~5 min)

1. Push the project to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the repo; Railway auto-detects Node.js
4. Set environment variables:
   - `AUTH_PASSWORD` = your chosen password
   - `PORT` is set automatically by Railway
5. Deploy — Railway gives you a public URL like `https://your-app.up.railway.app`

### Option 2 — Render (free tier)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect repo, set:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** add `AUTH_PASSWORD`
4. Deploy — get a URL like `https://your-app.onrender.com`

> **Note:** Free tiers spin down after inactivity. First visit may take ~30s to wake up.

### Option 3 — Your own VPS (DigitalOcean, Linode, etc.)

```bash
# On the server
git clone <your-repo-url>
cd bakery-accounting
npm install
AUTH_PASSWORD=your-password PORT=3000 node server.js
```

Keep it running with PM2:

```bash
npm install -g pm2
AUTH_PASSWORD=your-password pm2 start server.js --name thelvic-ledger
pm2 save && pm2 startup
```

Point a domain with Nginx reverse proxy, or expose port 3000 directly.

### Option 4 — Local network only (bakery LAN)

Run on a machine on your shop network:

```bash
AUTH_PASSWORD=your-password npm start
```

Other devices on the same Wi‑Fi open `http://<that-computer-ip>:3000`.

---

## Important for Production

1. **Change the password** — set `AUTH_PASSWORD` env var; don't use the default
2. **Back up `bakery.db`** regularly — that's all your data
3. **HTTPS** — Railway/Render provide this automatically; on a VPS use Let's Encrypt via Certbot
