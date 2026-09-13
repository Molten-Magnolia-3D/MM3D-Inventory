import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInventory } from "../state";
import { Field, Modal, Money } from "../ui";
import type { FilamentPick } from "../core/types";

export default function KitsPage() {
  const { inv, refresh } = useInventory();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ sku: "", name: "", barcode: "", sellPriceUsd: "0", notes: "" });
  if (!inv) return null;
  const api = inv;
  const kits = api.listKitViews();

  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      api.createKit({
        sku: draft.sku,
        name: draft.name,
        barcode: draft.barcode || null,
        sellPriceUsd: Number(draft.sellPriceUsd) || 0,
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
          <h1>Kits</h1>
          <p>Recipes, not finished goods. Selling a kit pulls shared and unique parts — there is no build-into-stock step.</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          New kit
        </button>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Kit</th>
              <th>Can make</th>
              <th>Sell price</th>
              <th>Est. cost</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {kits.map((kit) => (
              <tr key={kit.id} className="clickable">
                <td>
                  <Link to={`/kits/${kit.id}`}>{kit.name}</Link>
                  <div className="empty" style={{ padding: 0 }}>
                    {kit.sku}
                  </div>
                </td>
                <td>
                  <strong>{kit.canMake}</strong>
                </td>
                <td>
                  <Money value={kit.sellPriceUsd} />
                </td>
                <td>
                  <Money value={kit.estimatedCostUsd} />
                </td>
                <td>
                  <Money value={kit.marginUsd} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {kits.length === 0 && <p className="empty">No kits yet.</p>}
      </div>
      {open && (
        <Modal title="New kit recipe" onClose={() => setOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="SKU">
                <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} required />
              </Field>
              <Field label="Barcode">
                <input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} />
              </Field>
            </div>
            <Field label="Name">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </Field>
            <Field label="Selling price (USD)">
              <input
                value={draft.sellPriceUsd}
                onChange={(e) => setDraft({ ...draft, sellPriceUsd: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
            <button className="btn" type="submit">
              Save kit
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

export function KitDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { inv, refresh } = useInventory();
  const [sellOpen, setSellOpen] = useState(false);
  const [lineOpen, setLineOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [picks, setPicks] = useState<FilamentPick[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState({
    componentItemId: "",
    nestedKitId: "",
    qty: "1",
    filamentGrams: "",
    filamentMaterial: "",
  });
  const kit = inv && id ? inv.kitView(id) : undefined;
  const previewMargin =
    (kit?.sellPriceUsd ?? 0) * (Number(qty) || 1) - (kit?.estimatedCostUsd ?? 0) * (Number(qty) || 1);
  if (!inv || !id) return null;
  if (!kit) return <p className="empty">Kit not found.</p>;
  const api = inv;
  const current = kit;
  const items = api.listItems();
  const kits = api.listKits().filter((k) => k.id !== current.id);
  const spools = api.listSpools(false);
  const neededGrams = current.leaves.reduce((s, l) => s + l.filamentGrams * Number(qty || 1), 0);

  function addLine(e: FormEvent) {
    e.preventDefault();
    try {
      api.addBomLine(current.id, {
        componentItemId: line.componentItemId || null,
        nestedKitId: line.nestedKitId || null,
        qty: Number(line.qty) || 1,
        filamentGrams: line.filamentGrams ? Number(line.filamentGrams) : null,
        filamentMaterial: line.filamentMaterial || null,
        notes: null,
      });
      setLineOpen(false);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function sell(e: FormEvent) {
    e.preventDefault();
    try {
      const result = api.sellKit({
        kitId: current.id,
        qty: Number(qty) || 1,
        note,
        filament: picks.filter((p) => p.grams > 0),
      });
      setWarn(result.warnings.map((w) => w.message).join(" ") || null);
      setSellOpen(false);
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p>
            <Link to="/kits">Kits</Link>
          </p>
          <h1>{kit.name}</h1>
          <p>
            {kit.sku} · can make <strong>{kit.canMake}</strong> from current on-hand
          </p>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => setLineOpen(true)}>
            Add BOM line
          </button>
          <button className="btn" onClick={() => {
            setPicks(api.autoAllocateFilament(current.leaves, Number(qty) || 1));
            setSellOpen(true);
          }}>
            Sell
          </button>
        </div>
      </div>
      {warn && <div className="warn-banner">{warn}</div>}
      <div className="grid-stats">
        <div className="stat">
          <span>Sell price</span>
          <strong>
            <Money value={kit.sellPriceUsd} />
          </strong>
        </div>
        <div className="stat">
          <span>Est. cost</span>
          <strong>
            <Money value={kit.estimatedCostUsd} />
          </strong>
        </div>
        <div className="stat">
          <span>Margin</span>
          <strong>
            <Money value={kit.marginUsd} />
          </strong>
        </div>
      </div>
      <div className="card">
        <h2>Recipe</h2>
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Qty</th>
              <th>Filament</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {kit.bom.map((b) => {
              const item = b.componentItemId ? api.getItem(b.componentItemId) : undefined;
              const nested = b.nestedKitId ? api.getKit(b.nestedKitId) : undefined;
              return (
                <tr key={b.id}>
                  <td>
                    {item ? `${item.sku} · ${item.name}` : nested ? `Nested kit ${nested.name}` : "Filament only"}
                  </td>
                  <td>{b.qty}</td>
                  <td>
                    {b.filamentGrams
                      ? `${b.filamentGrams}g ${b.filamentMaterial ?? ""}`.trim()
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="btn ghost"
                      onClick={() => {
                        api.removeBomLine(b.id);
                        refresh();
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3 style={{ marginTop: 18 }}>Flattened parts (including nested kits)</h3>
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th>Qty / kit</th>
              <th>Filament / kit</th>
            </tr>
          </thead>
          <tbody>
            {kit.leaves.map((leaf, i) => (
              <tr key={i}>
                <td>{leaf.itemSku ? `${leaf.itemSku} · ${leaf.itemName}` : "Filament"}</td>
                <td>{leaf.qty || "—"}</td>
                <td>
                  {leaf.filamentGrams
                    ? `${leaf.filamentGrams}g ${leaf.filamentMaterial ?? ""}`.trim()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lineOpen && (
        <Modal title="Add BOM line" onClose={() => setLineOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={addLine}>
            <Field label="Part">
              <select
                value={line.componentItemId}
                onChange={(e) => setLine({ ...line, componentItemId: e.target.value })}
              >
                <option value="">(none)</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Or nested kit">
              <select
                value={line.nestedKitId}
                onChange={(e) => setLine({ ...line, nestedKitId: e.target.value })}
              >
                <option value="">(none)</option>
                {kits.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qty">
              <input value={line.qty} onChange={(e) => setLine({ ...line, qty: e.target.value })} />
            </Field>
            <div className="form-grid">
              <Field label="Filament grams (printed part)">
                <input
                  value={line.filamentGrams}
                  onChange={(e) => setLine({ ...line, filamentGrams: e.target.value })}
                />
              </Field>
              <Field label="Filament material">
                <input
                  value={line.filamentMaterial}
                  onChange={(e) => setLine({ ...line, filamentMaterial: e.target.value })}
                  placeholder="PLA"
                />
              </Field>
            </div>
            <button className="btn" type="submit">
              Add line
            </button>
          </form>
        </Modal>
      )}
      {sellOpen && (
        <Modal title={`Sell ${kit.name}`} onClose={() => setSellOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={sell}>
            <Field label="Quantity">
              <input value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label="Note">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order #, show, etc." />
            </Field>
            <p>
              Uses the kit selling price. Rough margin for this sale: <Money value={previewMargin} />
            </p>
            {neededGrams > 0 && (
              <div>
                <h3>Pick filament ({neededGrams}g needed)</h3>
                {spools.map((spool) => {
                  const current = picks.find((p) => p.spoolId === spool.id)?.grams ?? 0;
                  return (
                    <Field key={spool.id} label={`${spool.material} ${spool.colorName} · ${spool.remainingGrams}g left`}>
                      <input
                        value={current || ""}
                        onChange={(e) => {
                          const grams = Number(e.target.value) || 0;
                          setPicks((prev) => {
                            const next = prev.filter((p) => p.spoolId !== spool.id);
                            if (grams > 0) next.push({ spoolId: spool.id, grams });
                            return next;
                          });
                        }}
                        placeholder="grams from this spool"
                      />
                    </Field>
                  );
                })}
              </div>
            )}
            <p className="empty">
              Shared parts come out of current bins. If a bin would go negative, you will get a warning and the sale still posts.
            </p>
            <div className="row">
              <button className="btn" type="submit">
                Confirm sale
              </button>
              <button className="btn ghost" type="button" onClick={() => nav("/kits")}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
