# MM3D Inventory

Windows desktop inventory for **Molten Magnolia 3D** — parts, nested locations, kit recipes, and filament spools. The same app also runs as a phone-friendly web app you can install on a home screen.

## Open on a phone

**Download:** **[Latest release](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/latest)** — `MM3D-Inventory-Phone-*.zip` (and the Windows EXEs).

**Live URL** (after Pages is on): **[https://molten-magnolia-3d.github.io/MM3D-Inventory/](https://molten-magnolia-3d.github.io/MM3D-Inventory/)**

CI also force-pushes the web build to the `gh-pages` branch. If the live URL 404s, this is a one-time GitHub setting the repo owner has to click:

GitHub → **MM3D-Inventory** → **Settings** → **Pages** → **Deploy from a branch** → `gh-pages` / `/ (root)` → Save.

Then install it:

- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** menu → **Install app** or **Add to Home screen**

The phone copy works offline after the first load. It keeps its own local ledger. Turn on cloud sync in Settings if you want it to share data with the shop PC — only one device holds the lock at a time.

If Pages is still publishing, download **MM3D-Inventory-Phone-*.zip** from **[Releases](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/latest)** or the **[Actions](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/actions)** tab (`MM3D-Inventory-Phone` artifact). That zip is the same files the live URL serves; the URL is the easy way to test.

## Download for Windows

Get the latest build from **[Releases](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/latest)**:

- **MM3D-Inventory-Setup-*.exe** — installer (recommended; auto-updates from GitHub Releases on every push)
- **MM3D-Inventory-Portable-*.exe** — no install; double-click to run (does not auto-update)

If the release is still uploading, open the **[Actions](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/actions)** tab, pick the latest **Build MM3D Inventory** run, and download the `MM3D-Inventory-Windows` artifact.

Windows SmartScreen may warn because the app is not code-signed yet. Choose **More info** → **Run anyway**.

Kits are recipes, not finished goods. Selling a kit pulls the shared and unique parts (and any filament grams you pick). There is no “build into stock” step and no unbuild.

This repository is standalone. Filament tracking is inspired by SpoolmeterX, but the code here is new.

## What v1 does

- Email/password login (one owner account)
- Works fully offline; syncs when back online
- One device at a time via a cloud device lock (take over from Settings if a heartbeat is stale)
- Items: parts, products, consumables, filament SKUs
- Simple each-counts; filament also tracks remaining grams
- Nested locations (building → room → shelf → bin → tote)
- Hardware bins vs a separate filament area
- Scan/look up a BIN barcode and see everything in it (barcode + qty)
- Same SKU in multiple bins, with per-bin qty and total
- Movements: receive, adjust, move, use, scrap (warn but allow negative stock)
- USD cost, selling price, rough margin
- CSV import/export plus a shipped template (`templates/mm3d-inventory-template.csv`)
- USB/Bluetooth scanners type into the top search box
- Phone camera scanning for Code 128 and QR labels
- Label PDF sheet (Code 128 + QR, letter 30-up)
- Nested BOMs; “can make” updates when shared stock or filament grams change
- Sell button on a kit: qty + note, pick spool(s) for grams, uses the kit’s saved selling price
- Spool records, usage log, low stock by remaining grams
- Phone/PWA layout with a bottom nav you can install from GitHub Pages

Not in v1: photos, vendor POs, sales orders, Shopify/Etsy, extra reorder-point UI (except filament low-stock).

## Run on this PC (dev)

```bash
npm install
npm test
npm run dev
```

Open http://127.0.0.1:5173 — the UI runs in a browser with the same SQLite engine (saved in IndexedDB). That is handy for trying flows. The Windows app is the real shop-PC product; the GitHub Pages URL is the phone product.

```bash
npm run dev:electron
```

To try the production web build on a phone on the same Wi-Fi:

```bash
npm run build:web
npm run preview:lan
```

Then open `http://<this-pc-ip>:4173` in the phone browser.

## Windows installers

```bash
npm run build
```

`electron-builder` writes NSIS and portable builds under `release/`. CI stamps a new version and publishes a GitHub Release on **every push**, so an installed Setup copy can auto-update. The same run also publishes the phone web app to GitHub Pages.

Installed Setup copies check for a newer GitHub Release after launch and every 15 minutes, download it in the background, and install when you restart (or when you quit). Settings → **Check for updates** does the same on demand. Portable EXEs skip this — use Setup on the shop PC.

## First-time shop setup

1. Create your owner email/password on the login screen.
2. Settings → **Load sample data** if you want the Harrier 231 / 542 example, or **CSV** → download the template and fit your spreadsheet.
3. Optional cloud: create a Firebase project, enable **Email/Password** auth and **Cloud Firestore**, paste the web config JSON in Settings, enable cloud, then Sync.

Local data is always the working copy. If the internet drops, keep selling and counting. When you are online again, Settings → Sync uploads the ledger. Only one device should hold the lock at a time.

## Scan and labels

A USB or Bluetooth wedge scanner should land in the top barcode box and send Enter. On a phone, tap **Camera** and point at a Code 128 bar or QR. BIN codes open the bin contents list. Item, kit, and spool codes open that record.

Labels export a letter-size 3×10 sheet. Each label has a Code 128 bar (what most USB scanners want) and a QR with the same value.

## Security notes

- Do not commit Firebase keys you consider sensitive; paste them in Settings on the shop PC.
- Firestore documents have a size limit. This shop ledger is expected to stay well under that. If a future backup ever fails on size, export CSV as well.
