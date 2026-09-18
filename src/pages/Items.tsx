import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useInventory } from "../state";
import { Field, Modal, Money } from "../ui";
import type { Item, ItemType } from "../core/types";

export default function ItemsPage() {
  const { inv, refresh } = useInventory();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ItemType | "">("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    sku: "",
    name: "",
    type: "part" as ItemType,
    barcode: "",
    costUsd: "0",
    sellPriceUsd: "0",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  if (!inv) return null;
  const api = inv;
  const items = api.listItems({
    query: query || undefined,
    type: type || undefined,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      api.createItem({
        sku: draft.sku,
        name: draft.name,
        type: draft.type,
        barcode: draft.barcode || null,
        costUsd: Number(draft.costUsd) || 0,
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
          <h1>Items</h1>
          <p>Parts, products, consumables, and filament SKUs. Counts are each; spools also track grams.</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          New item
        </button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input placeholder="Filter name / SKU / barcode" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as ItemType | "")}>
          <option value="">All types</option>
          <option value="part">Parts</option>
          <option value="product">Products</option>
          <option value="consumable">Consumables</option>
          <option value="filament">Filament</option>
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Type</th>
              <th>On hand</th>
              <th>Cost</th>
              <th>Sell</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="empty">No items yet. Import a CSV or add one by hand.</p>}
      </div>
      {open && (
        <Modal title="New item" onClose={() => setOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-grid">
              <Field label="SKU">
                <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} required />
              </Field>
              <Field label="Barcode">
                <input value={draft.barcode} onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} />
              </Field>
              <Field label="Name">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
              </Field>
              <Field label="Type">
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}
                >
                  <option value="part">Part</option>
                  <option value="product">Product</option>
                  <option value="consumable">Consumable</option>
                  <option value="filament">Filament</option>
                </select>
              </Field>
              <Field label="Cost (USD)">
                <input value={draft.costUsd} onChange={(e) => setDraft({ ...draft, costUsd: e.target.value })} />
              </Field>
              <Field label="Selling price (USD)">
                <input
                  value={draft.sellPriceUsd}
                  onChange={(e) => setDraft({ ...draft, sellPriceUsd: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </Field>
            <button className="btn" type="submit">
              Save item
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  const { inv, tick } = useInventory();
  const view = inv?.itemWithStock(item.id);
  void tick;
  if (!view) return null;
  return (
    <tr className="clickable">
      <td>
        <Link to={`/items/${item.id}`}>{item.sku}</Link>
      </td>
      <td>{item.name}</td>
      <td>
        <span className="badge">{item.type}</span>
      </td>
      <td className={view.totalQty < 0 ? "neg" : ""}>{view.totalQty}</td>
      <td>
        <Money value={item.costUsd} />
      </td>
      <td>
        <Money value={item.sellPriceUsd} />
      </td>
      <td>{view.marginUsd == null ? "—" : <Money value={view.marginUsd} />}</td>
    </tr>
  );
}
