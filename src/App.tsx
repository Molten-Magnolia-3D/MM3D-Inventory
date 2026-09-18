import { FormEvent, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Boxes,
  MapPinned,
  ScanBarcode,
  Layers,
  Flame,
  ArrowLeftRight,
  Tags,
  FileSpreadsheet,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { useInventory } from "./state";
import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import ItemsPage from "./pages/Items";
import ItemDetailPage from "./pages/ItemDetail";
import LocationsPage from "./pages/Locations";
import KitsPage, { KitDetailPage } from "./pages/Kits";
import FilamentPage, { SpoolDetailPage } from "./pages/Filament";
import MovementsPage from "./pages/Movements";
import LabelsPage from "./pages/Labels";
import ImportExportPage from "./pages/ImportExport";
import SettingsPage from "./pages/Settings";
import type { LookupHit } from "./core/types";
import { useUpdateStatus } from "./useUpdateStatus";

const links = [
  { to: "/", label: "Shop floor", icon: LayoutDashboard, end: true },
  { to: "/scan", label: "Scan / lookup", icon: ScanBarcode },
  { to: "/locations", label: "Locations", icon: MapPinned },
  { to: "/items", label: "Items", icon: Boxes },
  { to: "/kits", label: "Kits", icon: Layers },
  { to: "/filament", label: "Filament", icon: Flame },
  { to: "/movements", label: "Movements", icon: ArrowLeftRight },
  { to: "/labels", label: "Labels", icon: Tags },
  { to: "/csv", label: "CSV", icon: FileSpreadsheet },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function App() {
  const { ready, error, inv, user, online, lock } = useInventory();
  if (error && !inv) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Could not open the database</h1>
          <p className="lede">{error}</p>
          <button type="button" className="btn" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="login-screen">
        <div className="login-card">Opening the shop ledger…</div>
      </div>
    );
  }
  if (!user) return <LoginPage />;

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <strong className="brand-type">MM3D Inventory</strong>
            <small>Molten Magnolia 3D</small>
          </div>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? "active" : "")}>
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="rail-foot">
          {online ? "Online" : "Offline — still fully usable"}
          {lock?.holder ? ` · lock on ${lock.hostname}` : ""}
          {inv?.readOnly ? " · read-only" : ""}
          <UpdateFoot />
        </div>
      </aside>
      <div className="main">
        <ScanBar />
        <div className="content">
          {inv?.readOnly && inv.readOnlyReason && <div className="danger-banner">{inv.readOnlyReason}</div>}
          <UpdateBanner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/kits" element={<KitsPage />} />
            <Route path="/kits/:id" element={<KitDetailPage />} />
            <Route path="/filament" element={<FilamentPage />} />
            <Route path="/filament/:id" element={<SpoolDetailPage />} />
            <Route path="/movements" element={<MovementsPage />} />
            <Route path="/labels" element={<LabelsPage />} />
            <Route path="/csv" element={<ImportExportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function UpdateFoot() {
  const status = useUpdateStatus();
  if (!status) return null;
  if (status.state === "downloading") return <div>Downloading {status.percent ?? 0}%</div>;
  if (status.state === "ready") return <div>v{status.versionAvailable} ready</div>;
  return <div>v{status.version}</div>;
}

function UpdateBanner() {
  const { platform } = useInventory();
  const status = useUpdateStatus();
  if (status?.state === "downloading") {
    return <div className="warn-banner">{status.message}</div>;
  }
  if (status?.state !== "ready") return null;
  return (
    <div className="warn-banner row" style={{ alignItems: "center", gap: 12 }}>
      <span>{status.message}</span>
      <button type="button" className="btn" onClick={() => void platform.installUpdate()}>
        Restart to update
      </button>
    </div>
  );
}

function ScanBar() {
  const { inv } = useInventory();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [miss, setMiss] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: LookupHit) {
    if (hit.kind === "bin") nav(`/locations?bin=${hit.location.id}`);
    else if (hit.kind === "item") nav(`/items/${hit.item.id}`);
    else if (hit.kind === "kit") nav(`/kits/${hit.kit.id}`);
    else if (hit.kind === "spool") nav(`/filament/${hit.spool.id}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inv) return;
    const hit = inv.lookup(code);
    if (hit.kind === "none") {
      setMiss(`No barcode match for “${code}”.`);
      nav(`/scan?q=${encodeURIComponent(code)}`);
      return;
    }
    setMiss(null);
    setCode("");
    go(hit);
  }

  return (
    <form className="scan-bar" onSubmit={onSubmit}>
      <div className="scan-wrap">
        <ScanBarcode size={18} />
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setMiss(null);
          }}
          placeholder="Scan or type a barcode, then Enter — bins, SKUs, kits, spools"
          autoComplete="off"
        />
      </div>
      {miss && <span className="badge danger">{miss}</span>}
    </form>
  );
}

function ScanPage() {
  const { inv } = useInventory();
  const [q, setQ] = useState("");
  const nav = useNavigate();
  if (!inv) return null;
  const hits = q.trim() ? inv.search(q) : [];

  function open(hit: LookupHit) {
    if (hit.kind === "bin") nav(`/locations?bin=${hit.location.id}`);
    else if (hit.kind === "item") nav(`/items/${hit.item.id}`);
    else if (hit.kind === "kit") nav(`/kits/${hit.kit.id}`);
    else if (hit.kind === "spool") nav(`/filament/${hit.spool.id}`);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan / lookup</h1>
          <p>USB and Bluetooth scanners type into the top box. This page is for fuzzy search when a code is unknown.</p>
        </div>
      </div>
      <Fieldish value={q} onChange={setQ} />
      <div className="card">
        {hits.length === 0 && <p className="empty">No matches.</p>}
        {hits.map((hit, i) => (
          <div key={i} className="tree-item" onClick={() => open(hit)}>
            <span>
              <strong>{hit.kind}</strong>{" "}
              {hit.kind === "bin"
                ? hit.path
                : hit.kind === "item"
                  ? `${hit.item.sku} · ${hit.item.name}`
                  : hit.kind === "kit"
                    ? hit.kit.name
                    : hit.kind === "spool"
                      ? `${hit.spool.material} ${hit.spool.colorName}`
                      : hit.code}
            </span>
            <small>Open</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function Fieldish({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>Search</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Name, SKU, barcode…" />
    </div>
  );
}
