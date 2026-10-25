import { useMemo, useState } from "react";
import { useInventory } from "../state";
import { buildLabelPdf } from "../core/labels";

export default function LabelsPage() {
  const { inv, platform, refresh } = useInventory();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = inv?.labelCandidates() ?? [];
  const picked = useMemo(
    () => rows.filter((r) => selected[`${r.kind}:${r.id}`]),
    [rows, selected],
  );
  const printable = picked.filter((r) => r.barcode);
  const missingSelected = picked.filter(
    (r) => !r.barcode && (r.kind === "item" || r.kind === "kit"),
  );
  const missingCount = rows.filter((r) => !r.barcode && (r.kind === "item" || r.kind === "kit")).length;
  const allVisibleSelected = rows.length > 0 && picked.length === rows.length;
  if (!inv) return null;
  const api = inv;

  function toggleAll(on: boolean) {
    if (!on) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of rows) next[`${row.kind}:${row.id}`] = true;
    setSelected(next);
  }

  function assignFromSku() {
    setError(null);
    setNotice(null);
    const itemIds = missingSelected.filter((r) => r.kind === "item").map((r) => r.id);
    const kitIds = missingSelected.filter((r) => r.kind === "kit").map((r) => r.id);
    try {
      const result = api.assignSkuBarcodes({ itemIds, kitIds });
      setNotice(
        result.assigned
          ? `Assigned ${result.assigned} barcode${result.assigned === 1 ? "" : "s"} from SKU.`
          : "Those already have barcodes.",
      );
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const pdf = await buildLabelPdf(
        printable.map((r) => ({ barcode: r.barcode, title: r.title, subtitle: r.subtitle })),
      );
      await platform.saveFile("mm3d-labels.pdf", pdf, "application/pdf");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Labels</h1>
          <p>
            Letter sheet, 30-up. Intermediate parts can use their SKU as the barcode — assign it here, then print.
          </p>
        </div>
        <div className="row">
          <button
            className="btn secondary"
            type="button"
            disabled={!rows.length}
            onClick={() => toggleAll(!allVisibleSelected)}
          >
            {allVisibleSelected ? "Clear selection" : "Select all"}
          </button>
          <button
            className="btn secondary"
            type="button"
            disabled={!missingSelected.length}
            onClick={assignFromSku}
          >
            Assign SKU as barcode{missingSelected.length ? ` · ${missingSelected.length}` : ""}
          </button>
          <button className="btn" disabled={!printable.length || busy} onClick={() => void exportPdf()}>
            Export {printable.length} label{printable.length === 1 ? "" : "s"} to PDF
          </button>
        </div>
      </div>
      {missingCount > 0 && (
        <p className="empty" style={{ paddingTop: 0, marginBottom: 12 }}>
          {missingCount} item{missingCount === 1 ? "" : "s"} or kit{missingCount === 1 ? "" : "s"} still need a
          barcode. Select them and use Assign SKU as barcode — shop parts without a Squarespace code still get a
          scannable label.
        </p>
      )}
      {notice && <div className="warn-banner">{notice}</div>}
      {error && <div className="danger-banner">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={!rows.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all labels"
                />
              </th>
              <th>Kind</th>
              <th>Title</th>
              <th>Barcode</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = `${row.kind}:${row.id}`;
              return (
                <tr key={key}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[key]}
                      onChange={(e) => setSelected({ ...selected, [key]: e.target.checked })}
                      aria-label={`Select ${row.title}`}
                    />
                  </td>
                  <td>{row.kind}</td>
                  <td>
                    {row.title}
                    <div className="empty" style={{ padding: 0 }}>
                      {row.subtitle}
                    </div>
                  </td>
                  <td>
                    {row.barcode || <span className="badge">needs barcode</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Add items or bins first, then assign barcodes from SKUs.</p>}
      </div>
    </div>
  );
}
