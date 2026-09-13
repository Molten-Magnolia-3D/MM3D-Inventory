import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useInventory } from "../state";
import { Field, Modal } from "../ui";
import type { Location, LocationArea, LocationNode, LocationType } from "../core/types";

function Tree({
  nodes,
  selected,
  onSelect,
}: {
  nodes: LocationNode[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            className={`tree-item ${selected === node.id ? "on" : ""}`}
            onClick={() => onSelect(node.id)}
          >
            <span>
              {node.name} <span className={`badge ${node.area}`}>{node.area}</span>
            </span>
            <small>{node.type}</small>
          </div>
          {node.children.length > 0 && (
            <div className="tree-children">
              <Tree nodes={node.children} selected={selected} onSelect={onSelect} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LocationsPage() {
  const { inv, refresh } = useInventory();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("bin");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    type: "bin" as LocationType,
    area: "hardware" as LocationArea,
    barcode: "",
    parentId: "",
  });
  if (!inv) return null;
  const api = inv;
  const tree = api.locationTree();
  const selected = selectedId ? inv.getLocation(selectedId) : undefined;
  const contents = selected ? inv.binContents(selected.id) : null;
  const locations = inv.listLocations();

  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const loc = api.createLocation({
        name: draft.name,
        type: draft.type,
        area: draft.area,
        barcode: draft.barcode || null,
        parentId: draft.parentId || null,
      });
      setOpen(false);
      setParams({ bin: loc.id });
      refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Locations</h1>
          <p>Building → room → shelf → bin → tote. Hardware bins stay separate from the filament area.</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          New location
        </button>
      </div>
      <div className="split">
        <div className="card">
          {tree.length === 0 && <p className="empty">No locations yet.</p>}
          <Tree
            nodes={tree}
            selected={selectedId}
            onSelect={(id) => setParams({ bin: id })}
          />
        </div>
        <div className="card">
          {!contents && <p className="empty">Scan a BIN barcode in the top bar, or pick a location.</p>}
          {contents && selected && (
            <BinPanel location={selected} contents={contents} />
          )}
        </div>
      </div>
      {open && (
        <Modal title="New location" onClose={() => setOpen(false)}>
          {error && <div className="danger-banner">{error}</div>}
          <form onSubmit={submit}>
            <Field label="Name">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
            </Field>
            <div className="form-grid">
              <Field label="Type">
                <select
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value as LocationType })}
                >
                  <option>building</option>
                  <option>room</option>
                  <option>shelf</option>
                  <option>bin</option>
                  <option>tote</option>
                  <option>area</option>
                </select>
              </Field>
              <Field label="Area">
                <select
                  value={draft.area}
                  onChange={(e) => setDraft({ ...draft, area: e.target.value as LocationArea })}
                >
                  <option value="hardware">Hardware</option>
                  <option value="filament">Filament</option>
                </select>
              </Field>
            </div>
            <Field label="Parent">
              <select value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}>
                <option value="">(top level)</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {api.locationPath(l.id)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Barcode">
              <input
                value={draft.barcode}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                placeholder="BIN-A1"
              />
            </Field>
            <button className="btn" type="submit">
              Save location
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function BinPanel({
  location,
  contents,
}: {
  location: Location;
  contents: ReturnType<NonNullable<ReturnType<typeof useInventory>["inv"]>["binContents"]>;
}) {
  const path = contents.path;
  return (
    <div>
      <h2>{location.name}</h2>
      <p>
        {path} · {location.type} · <span className={`badge ${location.area}`}>{location.area}</span>
        {location.barcode ? ` · ${location.barcode}` : ""}
      </p>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Barcode</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {contents.items.map((row) => (
            <tr key={row.item.id}>
              <td>
                {row.item.sku} · {row.item.name}
              </td>
              <td>{row.barcode ?? "—"}</td>
              <td className={row.qty < 0 ? "neg" : ""}>{row.qty}</td>
            </tr>
          ))}
          {contents.spools.map((spool) => (
            <tr key={spool.id}>
              <td>
                {spool.material} {spool.colorName} (spool)
              </td>
              <td>{spool.barcode ?? "—"}</td>
              <td>{spool.remainingGrams}g</td>
            </tr>
          ))}
        </tbody>
      </table>
      {contents.items.length === 0 && contents.spools.length === 0 && (
        <p className="empty">Nothing in this location.</p>
      )}
    </div>
  );
}
