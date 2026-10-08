import { Link } from "react-router-dom";
import { useInventory } from "../state";
import { Money } from "../ui";

export default function HomePage() {
  const { inv } = useInventory();
  if (!inv) return null;
  const dash = inv.dashboard();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Shop floor</h1>
          <p>Kits you can make, filament that’s running low, and the last stock moves.</p>
        </div>
      </div>
      <div className="grid-stats">
        <div className="stat">
          <span>Items</span>
          <strong>{dash.itemCount}</strong>
        </div>
        <div className="stat">
          <span>Kits</span>
          <strong>{dash.kitCount}</strong>
        </div>
        <div className="stat">
          <span>Spools</span>
          <strong>{dash.spoolCount}</strong>
        </div>
        <div className="stat">
          <span>Negative SKUs</span>
          <strong className={dash.negativeCount ? "neg" : ""}>{dash.negativeCount}</strong>
        </div>
      </div>

      {dash.lowFilament.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Filament low stock</h2>
          <p className="empty" style={{ padding: "8px 0" }}>
            Grouped by material and color, using remaining grams.
          </p>
          <table>
            <thead>
              <tr>
                <th>Color</th>
                <th>Grams</th>
                <th>Spools</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dash.lowFilament.map((g) => (
                <tr key={g.sampleSpoolId}>
                  <td>
                    <span className="swatch" style={{ background: g.colorHex ?? "#888" }} />{" "}
                    {g.material} {g.colorName}
                  </td>
                  <td>
                    <span className={`badge ${g.level === "critical" ? "danger" : "warn"}`}>
                      {Math.round(g.totalGrams)}g {g.level}
                    </span>
                  </td>
                  <td>{g.spoolCount}</td>
                  <td>
                    <Link to={`/filament/${g.sampleSpoolId}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="split">
        <div className="card">
          <h2>Can make</h2>
          {dash.kits.length === 0 && <p className="empty">No kits yet.</p>}
          {dash.kits.map((k) => (
            <Link key={k.id} to={`/kits/${k.id}`} className="tree-item">
              <span>{k.name}</span>
              <strong>{k.canMake}</strong>
            </Link>
          ))}
        </div>
        <div className="card">
          <h2>Recent sales</h2>
          {dash.recentSales.length === 0 && <p className="empty">No kit sales yet. Recipes stay recipes — selling a kit pulls the parts.</p>}
          <table>
            <tbody>
              {dash.recentSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.kitName}</td>
                  <td>×{s.qty}</td>
                  <td>
                    <Money value={s.marginUsd} /> margin
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
