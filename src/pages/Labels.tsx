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
  if (!inv) return null;

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
        <button className="btn" disabled={!picked.length || busy} onClick={() => void exportPdf()}>
          Export {picked.length} label{picked.length === 1 ? "" : "s"} to PDF
        </button>
      </div>
      {error && <div className="danger-banner">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th></th>
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
