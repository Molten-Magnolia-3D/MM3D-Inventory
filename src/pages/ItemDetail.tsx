import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInventory } from "../state";
import { Field, Modal, Money } from "../ui";
import type { MovementType } from "../core/types";

export default function ItemDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { inv, refresh } = useInventory();
  const [move, setMove] = useState<MovementType | null>(null);
  const [qty, setQty] = useState("1");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [warn, setWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!inv || !id) return null;
  const item = inv.itemWithStock(id);
  if (!item) return <p className="empty">Item not found.</p>;
  const locations = inv.listLocations();

  function run(e: FormEvent) {
    e.preventDefault();
    if (!inv || !id || !move) return;
    setError(null);
    try {
      const q = Number(qty);
      let result;
      if (move === "receive") result = inv.receive({ itemId: id, locationId: toId, qty: q, note });
      else if (move === "adjust") result = inv.adjust({ itemId: id, locationId: toId, qty: q, note });
      else if (move === "move")
        result = inv.move({ itemId: id, fromLocationId: fromId, toLocationId: toId, qty: q, note });
      else if (move === "use" || move === "scrap")
        result = inv.useOrScrap(move, { itemId: id, locationId: fromId, qty: q, note });
      else throw new Error("Pick a movement type.");
      if (result.warnings.length) setWarn(result.warnings.map((w) => w.message).join(" "));
      else setWarn(null);
      setMove(null);
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
            <Link to="/items">Items</Link>
          </p>
          <h1>{item.name}</h1>
          <p>
            {item.sku} · barcode {item.barcode ?? "none"} · {item.type}
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setMove("receive")}>
            Receive
          </button>
          <button className="btn secondary" onClick={() => setMove("move")}>
            Move
          </button>
          <button className="btn secondary" onClick={() => setMove("adjust")}>
            Adjust
          </button>
          <button className="btn secondary" onClick={() => setMove("use")}>
            Use
          </button>
          <button className="btn danger" onClick={() => setMove("scrap")}>
            Scrap
          </button>
        </div>
      </div>
      {warn && <div className="warn-banner">{warn}</div>}
      <div className="grid-stats">
        <div className="stat">
          <span>Total on hand</span>
          <strong className={item.totalQty < 0 ? "neg" : ""}>{item.totalQty}</strong>
        </div>
        <div className="stat">
          <span>Cost</span>
          <strong>
            <Money value={item.costUsd} />
          </strong>
        </div>
        <div className="stat">
          <span>Sell</span>
          <strong>
            <Money value={item.sellPriceUsd} />
          </strong>
        </div>
        <div className="stat">
          <span>Margin</span>
          <strong>{item.marginUsd == null ? "—" : <Money value={item.marginUsd} />}</strong>
        </div>
      </div>
      <div className="card">
        <h2>Per-bin quantity</h2>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Barcode</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {item.lots.map((lot) => (
              <tr key={lot.locationId}>
                <td>
                  <Link to={`/locations?bin=${lot.locationId}`}>{lot.locationPath}</Link>
                </td>
                <td>{lot.locationBarcode ?? "—"}</td>
                <td className={lot.qty < 0 ? "neg" : ""}>{lot.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {item.lots.length === 0 && <p className="empty">Not in any bin yet.</p>}
      </div>
      {move && (
        <Modal title={`${move} ${item.sku}`} onClose={() => setMove(null)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={run}>
            {(move === "move" || move === "use" || move === "scrap") && (
              <Field label="From location">
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} required>
                  <option value="">Select</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {inv.locationPath(l.id)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {(move === "receive" || move === "adjust" || move === "move") && (
              <Field label={move === "move" ? "To location" : "Location"}>
                <select value={toId} onChange={(e) => setToId(e.target.value)} required>
                  <option value="">Select</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {inv.locationPath(l.id)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={move === "adjust" ? "New quantity" : "Quantity"}>
              <input value={qty} onChange={(e) => setQty(e.target.value)} required />
            </Field>
            <Field label="Note">
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <p className="empty">Negative stock is allowed. The app will warn you if a bin goes below zero.</p>
            <div className="row">
              <button className="btn" type="submit">
                Save
              </button>
              <button className="btn ghost" type="button" onClick={() => nav("/items")}>
                Back to items
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
