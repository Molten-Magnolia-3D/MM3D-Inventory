# MM3D Inventory

Windows desktop inventory for **Molten Magnolia 3D** — parts, nested locations, kit recipes, and filament spools.

## Download for Windows

Get the latest build from **[Releases](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/latest)**:

- **MM3D-Inventory-Setup-1.0.3.exe** — installer (recommended; auto-updates from GitHub Releases)
- **MM3D-Inventory-Portable-1.0.3.exe** — no install; double-click to run (does not auto-update)

If the release is still uploading, open the **[Actions](https://github.com/Molten-Magnolia-3D/MM3D-Inventory/actions)** tab, pick the latest **Build Windows app** run, and download the `MM3D-Inventory-Windows` artifact.

Windows SmartScreen may warn because the app is not code-signed yet. Choose **More info** → **Run anyway**.

Kits are recipes, not finished goods. Selling a kit pulls the shared and unique parts (and any filament grams you pick). There is no “build into stock” step and no unbuild.

This repository is standalone. Filament tracking is inspired by SpoolmeterX, but the code here is new.

## What v1 does

- Email/password login (one owner account)
- Works fully offline; syncs when back online
- One PC at a time via a cloud device lock (take over from Settings if a heartbeat is stale)
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
- Label PDF sheet (Code 128 + QR, letter 30-up)
- Nested BOMs; “can make” updates when shared stock or filament grams change
- Sell button on a kit: qty + note, pick spool(s) for grams, uses the kit’s saved selling price
- Spool records, usage log, low stock by remaining grams

Not in v1: phone/webcam scanning, photos, vendor POs, sales orders, Shopify/Etsy, extra reorder-point UI (except filament low-stock).

## Run on this PC (dev)

```bash
npm install
npm test
npm run dev
```

Open http://127.0.0.1:5173 — the UI runs in a browser with the same SQLite engine (saved in IndexedDB). That is handy for trying flows. The Windows app is the real product.

```bash
npm run dev:electron
```

## Windows installers

```bash
npm run build
```

`electron-builder` writes NSIS and portable builds under `release/`. CI also builds these on every push so you can download them from GitHub Releases.

Installed Setup copies check for a newer GitHub Release after launch, download it in the background, and install when you restart (or when you quit). Settings → **Check for updates** does the same on demand. Portable EXEs skip this — use Setup on the shop PC.

## First-time shop setup

1. Create your owner email/password on the login screen.
2. Settings → **Load sample data** if you want the Harrier 231 / 542 example, or **CSV** → download the template and fit your spreadsheet.
3. Optional cloud: create a Firebase project, enable **Email/Password** auth and **Cloud Firestore**, paste the web config JSON in Settings, enable cloud, then Sync.

Local data is always the working copy. If the internet drops, keep selling and counting. When you are online again, Settings → Sync uploads the ledger. Only one PC should hold the lock at a time.

## Scan and labels

A USB or Bluetooth wedge scanner should land in the top barcode box and send Enter. BIN codes open the bin contents list. Item, kit, and spool codes open that record.

Labels export a letter-size 3×10 sheet. Each label has a Code 128 bar (what most USB scanners want) and a QR with the same value.

## Security notes

- Do not commit Firebase keys you consider sensitive; paste them in Settings on the shop PC.
- Firestore documents have a size limit. This shop ledger is expected to stay well under that. If a future backup ever fails on size, export CSV as well.
