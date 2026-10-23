import { useMemo, useState } from "react";
import { useInventory } from "../state";
import { buildLabelPdf } from "../core/labels";

export default function LabelsPage() {
  const { inv, platform } = useInventory();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = inv?.labelCandidates() ?? [];
  const picked = useMemo(
    () => rows.filter((r) => selected[`${r.kind}:${r.id}`]),
    [rows, selected],
  );
  const allVisibleSelected = rows.length > 0 && picked.length === rows.length;
  if (!inv) return null;

  function toggleAll(on: boolean) {
    if (!on) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const row of rows) next[`${row.kind}:${row.id}`] = true;
    setSelected(next);
  }

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const pdf = await buildLabelPdf(
        picked.map((r) => ({ barcode: r.barcode, title: r.title, subtitle: r.subtitle })),
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
          <p>Letter sheet, 30-up. Code 128 for USB scanners, plus a QR with the same value.</p>
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
          <button className="btn" disabled={!picked.length || busy} onClick={() => void exportPdf()}>
            Export {picked.length} label{picked.length === 1 ? "" : "s"} to PDF
          </button>
        </div>
      </div>
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
                  <td>{row.barcode}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">Give items, bins, kits, or spools a barcode first.</p>}
      </div>
    </div>
  );
}
