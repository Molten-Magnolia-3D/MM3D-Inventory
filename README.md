# Molten Magnolia · Homestead

Homestead is a studio for turning **floor planes into multi-story houses**. Draw rooms on a foot grid, stack stories, furnish from a household library, then deliver two things a realtor can sell:

1. A **3D listing** they can orbit, split as a dollhouse, or walk at eye height.
2. A **printable shell** (binary STL) scaled for a desktop 3D printer.

This repository is the product: inventory, editor, and foundry export in one browser app. Nothing leaves the machine unless you download a file.

## What you can do

- Draw rooms on a lot, then raise walls, doors, windows, and cased openings from those plates.
- Add stories. Each floor is its own plate with its own furniture.
- Choose a roof family: gable, hip, shed, parapet flat, gambrel, or mansard. Pitch and overhang are live.
- Place fifty-plus staged objects: sofas, beds, kitchens, baths, stairs, chimneys, trees, cars, and more.
- Save listings in the browser, duplicate them, or move them as JSON.
- Export a thickened architectural STL at 1:100 through 1:500 for FDM printing.

Sample inventory ships with three homes:

| Listing | Stories | Use |
| --- | --- | --- |
| Magnolia Cottage | 1 | Porch bungalow, print-ready ranch |
| Copper Hill Colonial | 2 | Formal first floor, stacked bedrooms |
| Foundry Townhouse | 3 | Garage plate, living plate, sleep plate |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Other commands:

```bash
npm test
npm run build
npm run preview
```

## Studio map

1. **Floor plate** — drag rooms, click walls for doors and windows, place library objects.
2. **Orbit / Dollhouse / Walk / Print preview** — the same house, four cameras.
3. **Stories** — add or remove floors; the 3D view stacks them.
4. **Crate & print** — listing sheet (browser print), project JSON, and STL.

Shortcuts: `1–5` views, `Delete` remove selection, `Esc` back to select, `⌘Z` / `Ctrl+Z` undo.

Internal units are **feet**. The printer export converts to millimeters and thickens walls to the minimum you set (1.6 mm by default) so a 1:200 house does not print paper-thin partitions.

## Notes for the foundry

- Start with **Print preview** to see the resin-colored shell.
- Leave furniture off unless you want blocky placeholders in the print.
- Turn on **Gap stories** when you want plates you can snap apart after printing.
- A 40′ façade at 1:200 is about 61 mm. Use 1:150 for a larger open-house model, 1:300 or 1:500 for a denser street of listings.
