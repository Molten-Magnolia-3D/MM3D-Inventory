import { useState } from "react";
import { TEMPLATE_CSV, exportCsv, importCsv } from "../core/csv";
import { useInventory } from "../state";

export default function ImportExportPage() {
  const { inv, platform, refresh } = useInventory();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!inv) return null;
  const api = inv;

  async function downloadTemplate() {
    await platform.saveFile("mm3d-inventory-template.csv", TEMPLATE_CSV, "text/csv");
  }

  async function downloadExport() {
    await platform.saveFile("mm3d-inventory-export.csv", exportCsv(api), "text/csv");
  }

  async function importFile() {
    setError(null);
    const file = await platform.openFile();
    if (!file) return;
    try {
      const text = new TextDecoder().decode(file.data);
      const imported = importCsv(api, text);
      const total = Object.values(imported.created).reduce((sum, n) => sum + n, 0);
      setResult(
        `Imported ${Object.entries(imported.created)
          .map(([k, n]) => `${n} ${k}`)
          .join(", ")}.${imported.errors.length ? ` ${imported.errors.length} row errors.` : ""}`,
      );
      if (imported.errors.length) setError(imported.errors.join("\n"));
      else if (!total) setError("Nothing imported from that file.");
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>CSV import / export</h1>
          <p>
            Import the MM3D template, or a Squarespace product export (Products → Export all). Each Squarespace SKU
            becomes an item: the product title is the name, and squadron / size / color choices land in Variant.
            Orders CSVs are skipped on purpose.
          </p>
        </div>
      </div>
      {result && <div className="warn-banner">{result}</div>}
      {error && <pre className="danger-banner">{error}</pre>}
      <div className="row">
        <button className="btn" onClick={() => void downloadTemplate()}>
          Download CSV template
        </button>
        <button className="btn secondary" onClick={() => void importFile()}>
          Import CSV
        </button>
        <button className="btn secondary" onClick={() => void downloadExport()}>
          Export everything
        </button>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <h2>Column notes</h2>
        <ul>
          <li>
            <code>section</code> tells the MM3D template which table the row belongs to.
          </li>
          <li>
            A Squarespace product CSV is mapped automatically. The Title stays as the item name. Option columns
            (Squadron, Size, Color, …) go in <code>variant</code>. Follow-up rows with a blank Title inherit the
            product name. Stock lands in <code>Imported / Squarespace</code>.
          </li>
          <li>
            Location <code>path</code> uses slashes: <code>Workshop / Hardware room / Bin A1</code>.
          </li>
          <li>Stock rows need a SKU plus a location path or location barcode.</li>
          <li>BOM rows need <code>kit_sku</code>, a component or nested kit, and <code>qty</code>.</li>
        </ul>
      </div>
    </div>
  );
}
