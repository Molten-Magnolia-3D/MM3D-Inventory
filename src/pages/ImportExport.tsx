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
      setResult(
        `Imported ${Object.entries(imported.created)
          .map(([k, n]) => `${n} ${k}`)
          .join(", ")}.${imported.errors.length ? ` ${imported.errors.length} row errors.` : ""}`,
      );
      if (imported.errors.length) setError(imported.errors.join("\n"));
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
            Download the template and fit your spreadsheet to those columns. Sections: locations, items, stock, kits, bom, spools.
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
            <code>section</code> tells the importer which table the row belongs to.
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
