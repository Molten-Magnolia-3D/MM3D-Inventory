import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BASE_MATERIALS } from "../core/types";
import { useInventory } from "../state";
import { Field, Modal } from "../ui";

export default function FilamentPage() {
  const { inv, refresh } = useInventory();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    material: "PLA",
    colorName: "",
    colorHex: "#d56a2c",
    brand: "",
    barcode: "",
    startingGrams: "1000",
    remainingGrams: "1000",
    costPerKgUsd: "0",
    locationId: "",
    itemId: "",
    notes: "",
  });
  if (!inv) return null;
  const api = inv;
  const spools = api.listSpools();
  const low = api.lowStockFilament();
  const locations = api.listLocations().filter((l) => l.area === "filament");
  const filamentItems = api.listItems({ type: "filament" });

  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      api.createSpool({
        material: draft.material,
        colorName: draft.colorName,
        colorHex: draft.colorHex,
        brand: draft.brand || null,
        barcode: draft.barcode || null,
        startingGrams: Number(draft.startingGrams) || 0,
        remainingGrams: Number(draft.remainingGrams) || 0,
        costPerKgUsd: Number(draft.costPerKgUsd) || 0,
        locationId: draft.locationId || null,
        itemId: draft.itemId || null,
        notes: draft.notes || null,
      });
      setOpen(false);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Filament</h1>
          <p>Each spool is a record with remaining grams. Scan the spool barcode in the top bar to jump to it.</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          New spool
        </button>
      </div>
      {low.length > 0 && (
        <div className="warn-banner">
          {low.length} color{low.length === 1 ? "" : "s"} under the low-stock gram threshold.
        </div>
      )}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Spool</th>
              <th>Barcode</th>
              <th>Remaining</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {spools.map((spool) => (
              <tr key={spool.id} className="clickable">
                <td>
                  <span className="swatch" style={{ background: spool.colorHex ?? "#888" }} />{" "}
                  <Link to={`/filament/${spool.id}`}>
                    {spool.material} {spool.colorName}
                  </Link>
                  <div className="empty" style={{ padding: 0 }}>
                    {spool.brand ?? "—"}
                    {spool.isEmpty ? " · empty" : ""}
                  </div>
                </td>
                <td>{spool.barcode ?? "—"}</td>
                <td className={spool.remainingGrams < 0 ? "neg" : ""}>
                  {spool.remainingGrams}g / {spool.startingGrams}g
                </td>
                <td>{spool.locationId ? api.locationPath(spool.locationId) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {spools.length === 0 && <p className="empty">No spools yet.</p>}
      </div>
      {open && (
        <Modal title="New spool" onClose={() => setOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={submit}>
            <Field label="Material">
              <select value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })}>
                {BASE_MATERIALS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
                <option>OTHER</option>
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Color name">
                <input
                  value={draft.colorName}
                  onChange={(e) => setDraft({ ...draft, colorName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Color">
                <input
                  type="color"
                  value={draft.colorHex}
                  onChange={(e) => setDraft({ ...draft, colorHex: e.target.value })}
                />
              </Field>
              <Field label="Brand">
                <input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
              </Field>
              <Field label="Barcode">
                <input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} />
              </Field>
              <Field label="Starting grams">
                <input
                  value={draft.startingGrams}
                  onChange={(e) => setDraft({ ...draft, startingGrams: e.target.value })}
                />
              </Field>
              <Field label="Remaining grams">
                <input
                  value={draft.remainingGrams}
                  onChange={(e) => setDraft({ ...draft, remainingGrams: e.target.value })}
                />
              </Field>
              <Field label="Cost / kg (USD)">
                <input
                  value={draft.costPerKgUsd}
                  onChange={(e) => setDraft({ ...draft, costPerKgUsd: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <select
                  value={draft.locationId}
                  onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}
                >
                  <option value="">(none)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {api.locationPath(l.id)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Filament SKU (optional)">
              <select value={draft.itemId} onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}>
                <option value="">(none)</option>
                {filamentItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <button className="btn" type="submit">
              Save spool
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function SpoolDetailPage() {
  const { id } = useParams();
  const { inv, refresh } = useInventory();
  const [grams, setGrams] = useState("");
  const [job, setJob] = useState("");
  const [remaining, setRemaining] = useState("");
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!inv || !id) return null;
  const spool = inv.getSpool(id);
  if (!spool) return <p className="empty">Spool not found.</p>;
  const api = inv;
  const current = spool;
  const usage = api.spoolUsage(current.id);

  function logUse(e: FormEvent) {
    e.preventDefault();
    try {
      const result = api.logSpoolUsage({
        spoolId: current.id,
        grams: Number(grams),
        jobName: job,
      });
      setWarn(result.warnings.map((w) => w.message).join(" ") || null);
      setGrams("");
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function setWeight(e: FormEvent) {
    e.preventDefault();
    try {
      const result = api.setSpoolRemaining(current.id, Number(remaining), "Scale reading");
      setWarn(result.warnings.map((w) => w.message).join(" ") || null);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <p>
        <Link to="/filament">Filament</Link>
      </p>
      <div className="page-head">
        <div>
          <h1>
            <span className="swatch" style={{ background: spool.colorHex ?? "#888" }} /> {spool.material}{" "}
            {spool.colorName}
          </h1>
          <p>
            {spool.brand ?? "Unbranded"} · {spool.barcode ?? "no barcode"} ·{" "}
            {spool.locationId ? inv.locationPath(spool.locationId) : "no location"}
          </p>
        </div>
      </div>
      {warn && <div className="warn-banner">{warn}</div>}
      {error && <div className="danger-banner">{error}</div>}
      <div className="grid-stats">
        <div className="stat">
          <span>Remaining</span>
          <strong className={spool.remainingGrams < 0 ? "neg" : ""}>{spool.remainingGrams}g</strong>
        </div>
        <div className="stat">
          <span>Started at</span>
          <strong>{spool.startingGrams}g</strong>
        </div>
        <div className="stat">
          <span>Cost / kg</span>
          <strong>${spool.costPerKgUsd.toFixed(2)}</strong>
        </div>
      </div>
      <div className="split">
        <form className="card" onSubmit={logUse}>
          <h2>Log usage</h2>
          <Field label="Job">
            <input value={job} onChange={(e) => setJob(e.target.value)} placeholder="Canopy batch, customer name…" />
          </Field>
          <Field label="Grams used">
            <input value={grams} onChange={(e) => setGrams(e.target.value)} required />
          </Field>
          <button className="btn" type="submit">
            Subtract grams
          </button>
        </form>
        <form className="card" onSubmit={setWeight}>
          <h2>Set remaining grams</h2>
          <Field label="Scale reading">
            <input value={remaining} onChange={(e) => setRemaining(e.target.value)} placeholder={String(spool.remainingGrams)} />
          </Field>
          <button className="btn secondary" type="submit">
            Update weight
          </button>
        </form>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Usage log</h2>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Job</th>
              <th>Grams</th>
              <th>Before → after</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={u.id}>
                <td>{new Date(u.createdAt).toLocaleString()}</td>
                <td>{u.jobName ?? "—"}</td>
                <td>{u.grams}g</td>
                <td>
                  {u.weightBefore}g → {u.weightAfter}g
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {usage.length === 0 && <p className="empty">No usage yet.</p>}
      </div>
    </div>
  );
}
