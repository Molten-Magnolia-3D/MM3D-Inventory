import { useInventory } from "../state";

export default function MovementsPage() {
  const { inv } = useInventory();
  if (!inv) return null;
  const rows = inv.listMovements(300);
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Movements</h1>
          <p>Receive, adjust, move, use, scrap, and kit sales.</p>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Type</th>
              <th>Item</th>
              <th>Qty</th>
              <th>From</th>
              <th>To</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  <span className="badge">{row.type}</span>
                </td>
                <td>{row.itemSku ?? row.spoolId ?? "—"}</td>
                <td>{row.qty}</td>
                <td>{row.fromLocationId ? inv.locationPath(row.fromLocationId) : "—"}</td>
                <td>{row.toLocationId ? inv.locationPath(row.toLocationId) : "—"}</td>
                <td>{row.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No movements yet.</p>}
      </div>
    </div>
  );
}
