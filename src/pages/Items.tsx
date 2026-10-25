import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { useInventory } from "../state";
import { Field, Modal, Money } from "../ui";
import CameraScan from "../CameraScan";
import { cameraScanAvailable, normalizeScannedCode } from "../scan";
import { skuFromName } from "../core/util";
import type { Item, ItemType } from "../core/types";

type Draft = {
  sku: string;
  name: string;
  variant: string;
  type: ItemType;
  barcode: string;
  costUsd: string;
  sellPriceUsd: string;
  notes: string;
};

type QueueEntry = {
  code: string;
  existing: boolean;
};

const emptyDraft = (): Draft => ({
  sku: "",
  name: "",
  variant: "",
  type: "part",
  barcode: "",
  costUsd: "0",
  sellPriceUsd: "0",
  notes: "",
});

function draftFromItem(item: Item): Draft {
  return {
    sku: item.sku,
    name: item.name,
    variant: item.variant ?? "",
    type: item.type,
    barcode: item.barcode ?? "",
    costUsd: String(item.costUsd),
    sellPriceUsd: String(item.sellPriceUsd),
    notes: item.notes ?? "",
  };
}

export default function ItemsPage() {
  const { inv, refresh, platform } = useInventory();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ItemType | "">("");
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [scanCode, setScanCode] = useState("");
  const [editQueue, setEditQueue] = useState<Item[]>([]);
  const [editIndex, setEditIndex] = useState(0);
  const [bulk, setBulk] = useState({
    type: "" as ItemType | "",
    costUsd: "",
    sellPriceUsd: "",
    notes: "",
  });
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const showCamera = cameraScanAvailable(platform.isElectron);
  const items =
    inv?.listItems({
      query: query || undefined,
      type: type || undefined,
    }) ?? [];
  const selectedIds = items.map((item) => item.id).filter((id) => selected[id]);
  const allVisibleSelected = items.length > 0 && selectedIds.length === items.length;
  const queuedEdit = editQueue.length > 0;
  const lastQueuedEdit = queuedEdit && editIndex >= editQueue.length - 1;

  useEffect(() => {
    if (!adding || cameraOpen) return;
    scanRef.current?.focus();
  }, [adding, cameraOpen, queue]);

  if (!inv) return null;
  const api = inv;

  function toggle(id: string, on?: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      const value = on ?? !next[id];
      if (value) next[id] = true;
      else delete next[id];
      return next;
    });
  }

  function toggleAll(on: boolean) {
    if (!on) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.id] = true;
    setSelected(next);
  }

  function closeModals() {
    setAdding(false);
    setCreating(false);
    setEditing(null);
    setBulkOpen(false);
    setConfirmDelete(false);
    setCameraOpen(false);
    setQueue([]);
    setScanCode("");
    setEditQueue([]);
    setEditIndex(0);
    setError(null);
  }

  function enqueueCode(raw: string) {
    const code = normalizeScannedCode(raw);
    if (!code) return;
    setError(null);
    if (queue.some((entry) => entry.code === code)) {
      setError(`Already in the list: ${code}`);
      setScanCode("");
      return;
    }
    const hit = api.lookup(code);
    if (hit.kind === "bin" || hit.kind === "kit" || hit.kind === "spool") {
      setError(`Barcode ${code} is already a ${hit.kind}.`);
      setScanCode("");
      return;
    }
    setQueue((prev) => [...prev, { code, existing: hit.kind === "item" }]);
    setScanCode("");
  }

  function removeQueued(code: string) {
    setQueue((prev) => prev.filter((entry) => entry.code !== code));
  }

  function onScanSubmit(e: FormEvent) {
    e.preventDefault();
    enqueueCode(scanCode);
  }

  function finishQueue() {
    setError(null);
    try {
      const created = api.addItemsFromBarcodes(queue.map((entry) => entry.code));
      setAdding(false);
      setQueue([]);
      setScanCode("");
      refresh();
      if (!created.length) return;
      setEditQueue(created);
      setEditIndex(0);
      setEditing(created[0]!);
      setDraft(draftFromItem(created[0]!));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openNextEdit() {
    const nextIndex = editIndex + 1;
    if (nextIndex >= editQueue.length) {
      closeModals();
      refresh();
      return;
    }
    const next = api.getItem(editQueue[nextIndex]!.id) ?? editQueue[nextIndex]!;
    setEditIndex(nextIndex);
    setEditing(next);
    setDraft(draftFromItem(next));
    setError(null);
    refresh();
  }

  function saveNew(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      api.createItem({
        sku: draft.sku,
        name: draft.name,
        variant: draft.variant || null,
        type: draft.type,
        barcode: draft.barcode || null,
        costUsd: Number(draft.costUsd) || 0,
        sellPriceUsd: Number(draft.sellPriceUsd) || 0,
        notes: draft.notes || null,
      });
      closeModals();
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    try {
      api.updateItem(editing.id, {
        sku: draft.sku,
        name: draft.name,
        variant: draft.variant,
        type: draft.type,
        barcode: draft.barcode || null,
        costUsd: Number(draft.costUsd) || 0,
        sellPriceUsd: Number(draft.sellPriceUsd) || 0,
        notes: draft.notes || null,
      });
      if (queuedEdit && !lastQueuedEdit) {
        openNextEdit();
        return;
      }
      closeModals();
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function saveBulk(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      for (const id of selectedIds) {
        const patch: Parameters<typeof api.updateItem>[1] = {};
        if (bulk.type) patch.type = bulk.type;
        if (bulk.costUsd.trim()) patch.costUsd = Number(bulk.costUsd) || 0;
        if (bulk.sellPriceUsd.trim()) patch.sellPriceUsd = Number(bulk.sellPriceUsd) || 0;
        if (bulk.notes.trim()) patch.notes = bulk.notes;
        if (Object.keys(patch).length) api.updateItem(id, patch);
      }
      closeModals();
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function removeSelected() {
    setError(null);
    try {
      api.deleteItems(selectedIds);
      setSelected({});
      closeModals();
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function assignSelectedFromSku() {
    setError(null);
    try {
      const result = api.assignSkuBarcodes({ itemIds: selectedIds });
      if (!result.assigned) setError("Those items already have barcodes.");
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openEdit(item: Item) {
    setError(null);
    setAdding(false);
    setCreating(false);
    setBulkOpen(false);
    setEditQueue([]);
    setEditIndex(0);
    setEditing(item);
    setDraft(draftFromItem(item));
  }

  function openAdd() {
    setError(null);
    setEditing(null);
    setCreating(false);
    setQueue([]);
    setScanCode("");
    setEditQueue([]);
    setAdding(true);
  }

  function openCreate() {
    setError(null);
    setAdding(false);
    setEditing(null);
    setDraft(emptyDraft());
    setCreating(true);
  }

  function openBulkOrEdit() {
    if (selectedIds.length === 1) {
      const item = items.find((row) => row.id === selectedIds[0]);
      if (item) openEdit(item);
      return;
    }
    setError(null);
    setBulk({ type: "", costUsd: "", sellPriceUsd: "", notes: "" });
    setBulkOpen(true);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Items</h1>
          <p>
            Scan barcodes to add several at once, then edit them in scan order. Parts without a shop barcode can use
            their SKU — select them and assign it here.
          </p>
        </div>
        <button className="btn" onClick={openAdd}>
          Add items
        </button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input placeholder="Filter name, SKU, barcode, or variant" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as ItemType | "")}>
          <option value="">All types</option>
          <option value="part">Parts</option>
          <option value="product">Products</option>
          <option value="consumable">Consumables</option>
          <option value="filament">Filament</option>
        </select>
      </div>
      {selectedIds.length > 0 && (
        <div className="toolbar">
          <span className="count">{selectedIds.length} selected</span>
          <button className="btn secondary" type="button" onClick={openBulkOrEdit}>
            {selectedIds.length === 1 ? "Edit" : "Edit selected"}
          </button>
          <button
            className="btn secondary"
            type="button"
            disabled={!items.some((item) => selected[item.id] && !item.barcode)}
            onClick={assignSelectedFromSku}
          >
            Assign barcode from SKU
          </button>
          <button className="btn danger" type="button" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
          <button className="btn ghost" type="button" onClick={() => setSelected({})}>
            Clear
          </button>
        </div>
      )}
      {error && !adding && !creating && !editing && !bulkOpen && <div className="danger-banner">{error}</div>}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Select all visible items"
                />
              </th>
              <th>SKU</th>
              <th>Name</th>
              <th>Variant</th>
              <th>Type</th>
              <th>On hand</th>
              <th>Cost</th>
              <th>Sell</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                checked={!!selected[item.id]}
                onToggle={(on) => toggle(item.id, on)}
                onEdit={() => openEdit(item)}
              />
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="empty">No items yet. Scan barcodes to add them, or import a CSV.</p>
        )}
      </div>
      {adding && (
        <Modal title="Add items" onClose={closeModals}>
          {error && <div className="danger-banner">{error}</div>}
          <p className="empty" style={{ paddingTop: 0 }}>
            Scan or type a barcode and press Enter. Add as many as you need, then Done — you will edit them in the
            order they were scanned.
          </p>
          <form onSubmit={onScanSubmit}>
            <Field label="Barcode">
              <div className="row">
                <input
                  ref={scanRef}
                  value={scanCode}
                  onChange={(e) => {
                    setScanCode(e.target.value);
                    setError(null);
                  }}
                  placeholder="Scan or type, then Enter"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  enterKeyHint="done"
                  inputMode="text"
                  name="new-item-barcode"
                />
                {showCamera && (
                  <button
                    type="button"
                    className="btn secondary cam-btn"
                    onClick={() => setCameraOpen(true)}
                    aria-label="Scan with camera"
                  >
                    <Camera size={18} />
                    <span className="cam-btn-label">Camera</span>
                  </button>
                )}
              </div>
            </Field>
            <button className="visually-hidden" type="submit">
              Add barcode
            </button>
          </form>
          {queue.length > 0 && (
            <ol className="scan-queue">
              {queue.map((entry, index) => (
                <li key={`${entry.code}:${index}`}>
                  <span>
                    <strong>{index + 1}.</strong> {entry.code}
                    {entry.existing && <span className="badge">already in inventory</span>}
                  </span>
                  <button className="btn ghost" type="button" onClick={() => removeQueued(entry.code)}>
                    Remove
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="row">
            <button className="btn" type="button" disabled={!queue.length} onClick={finishQueue}>
              Done{queue.length ? ` · ${queue.length}` : ""}
            </button>
            <button className="btn ghost" type="button" onClick={openCreate}>
              Add without a barcode
            </button>
          </div>
        </Modal>
      )}
      {cameraOpen && (
        <CameraScan
          onCode={(value) => {
            setCameraOpen(false);
            enqueueCode(value);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
      {creating && (
        <Modal title="New item" onClose={closeModals}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={saveNew}>
            <ItemFields draft={draft} setDraft={setDraft} />
            <button className="btn" type="submit">
              Save item
            </button>
          </form>
        </Modal>
      )}
      {editing && (
        <Modal
          title={
            queuedEdit
              ? `Edit ${editIndex + 1} of ${editQueue.length} · ${editing.sku}`
              : `Edit ${editing.sku}`
          }
          onClose={closeModals}
        >
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={saveEdit}>
            <ItemFields draft={draft} setDraft={setDraft} />
            <div className="row">
              <button className="btn" type="submit">
                {queuedEdit && !lastQueuedEdit ? "Save & next" : "Save changes"}
              </button>
              {queuedEdit && !lastQueuedEdit && (
                <button className="btn secondary" type="button" onClick={openNextEdit}>
                  Skip
                </button>
              )}
              {!queuedEdit && (
                <Link className="btn secondary" to={`/items/${editing.id}`} onClick={closeModals}>
                  Open stock / movements
                </Link>
              )}
            </div>
          </form>
        </Modal>
      )}
      {bulkOpen && (
        <Modal title={`Edit ${selectedIds.length} items`} onClose={closeModals}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={saveBulk}>
            <p className="empty" style={{ paddingTop: 0 }}>
              Blank fields are left as they are. Type applies to every selected SKU.
            </p>
            <div className="form-grid">
              <Field label="Type">
                <select
                  value={bulk.type}
                  onChange={(e) => setBulk({ ...bulk, type: e.target.value as ItemType | "" })}
                >
                  <option value="">Leave unchanged</option>
                  <option value="part">Part</option>
                  <option value="product">Product</option>
                  <option value="consumable">Consumable</option>
                  <option value="filament">Filament</option>
                </select>
              </Field>
              <Field label="Cost (USD)">
                <input
                  value={bulk.costUsd}
                  onChange={(e) => setBulk({ ...bulk, costUsd: e.target.value })}
                  placeholder="Leave unchanged"
                />
              </Field>
              <Field label="Selling price (USD)">
                <input
                  value={bulk.sellPriceUsd}
                  onChange={(e) => setBulk({ ...bulk, sellPriceUsd: e.target.value })}
                  placeholder="Leave unchanged"
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={bulk.notes}
                onChange={(e) => setBulk({ ...bulk, notes: e.target.value })}
                placeholder="Leave unchanged"
              />
            </Field>
            <button className="btn" type="submit">
              Apply to selected
            </button>
          </form>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="Delete items" onClose={() => setConfirmDelete(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <p>
            Delete {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}? Stock on those SKUs is removed. This
            cannot be undone.
          </p>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn danger" type="button" onClick={removeSelected}>
              Delete
            </button>
            <button className="btn ghost" type="button" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ItemFields({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
}) {
  return (
    <>
      <div className="form-grid">
        <Field label="SKU">
          <input
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
            placeholder="Leave blank to generate from the name"
          />
        </Field>
        <Field label="Barcode">
          <div className="row">
            <input
              value={draft.barcode}
              onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
              placeholder="Leave blank to use the SKU"
            />
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  barcode: (draft.sku.trim() || skuFromName(draft.name)).trim(),
                })
              }
            >
              Use SKU
            </button>
          </div>
        </Field>
        <Field label="Name">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        </Field>
        <Field label="Variant">
          <input
            value={draft.variant}
            onChange={(e) => setDraft({ ...draft, variant: e.target.value })}
            placeholder="Squadron, size, color…"
          />
        </Field>
        <Field label="Type">
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as ItemType })}>
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
          <input value={draft.sellPriceUsd} onChange={(e) => setDraft({ ...draft, sellPriceUsd: e.target.value })} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </Field>
    </>
  );
}

function ItemRow({
  item,
  checked,
  onToggle,
  onEdit,
}: {
  item: Item;
  checked: boolean;
  onToggle: (on: boolean) => void;
  onEdit: () => void;
}) {
  const { inv, tick } = useInventory();
  const view = inv?.itemWithStock(item.id);
  void tick;
  if (!view) return null;
  return (
    <tr className="clickable" onClick={onEdit}>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={`Select ${item.sku}`}
        />
      </td>
      <td>
        <Link to={`/items/${item.id}`} onClick={(e) => e.stopPropagation()}>
          {item.sku}
        </Link>
        <div className="empty" style={{ padding: 0 }}>
          {item.barcode || "no barcode"}
        </div>
      </td>
      <td>{item.name}</td>
      <td>{item.variant || "—"}</td>
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
