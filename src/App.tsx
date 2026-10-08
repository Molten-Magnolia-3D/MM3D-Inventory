import { FormEvent, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
  MoreHorizontal,
  Camera,
} from "lucide-react";
import { useInventory } from "./state";
import { itemLabel } from "./core/util";
import { isMoreNavPath } from "./nav";
import CameraScan from "./CameraScan";
import { cameraScanAvailable, hitRoute, normalizeScannedCode } from "./scan";
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

const dockLinks = [
  { to: "/", label: "Shop", icon: LayoutDashboard, end: true },
  { to: "/scan", label: "Scan", icon: ScanBarcode },
  { to: "/items", label: "Items", icon: Boxes },
  { to: "/kits", label: "Kits", icon: Layers },
];

const moreLinks = links.filter((link) => isMoreNavPath(link.to));

export default function App() {
  const { ready, error, inv, user, online, lock } = useInventory();
  const [moreOpen, setMoreOpen] = useState(false);

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
        <MobileTop />
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
      <MobileDock moreOpen={moreOpen} onMore={() => setMoreOpen(true)} />
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </div>
  );
}

function MobileTop() {
  const { online, lock, inv } = useInventory();
  return (
    <header className="mobile-top">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <strong className="brand-type">MM3D Inventory</strong>
          <small>
            {online ? "Online" : "Offline"}
            {lock?.holder ? ` · ${lock.hostname}` : ""}
            {inv?.readOnly ? " · read-only" : ""}
          </small>
        </div>
      </div>
    </header>
  );
}

function MobileDock({ moreOpen, onMore }: { moreOpen: boolean; onMore: () => void }) {
  const location = useLocation();
  const moreActive = moreOpen || isMoreNavPath(location.pathname);
  return (
    <nav className="mobile-dock" aria-label="Phone">
      {dockLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <link.icon size={20} />
          {link.label}
        </NavLink>
      ))}
      <button type="button" className={moreActive ? "active" : ""} onClick={onMore} aria-haspopup="dialog">
        <MoreHorizontal size={20} />
        More
      </button>
    </nav>
  );
}

function MoreSheet({ onClose }: { onClose: () => void }) {
  const { online, lock, inv } = useInventory();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-back" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-label="More shop pages"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="spread" style={{ marginBottom: 12 }}>
          <h2>More</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <nav className="sheet-nav">
          {moreLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={onClose}
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="sheet-foot">
          {online ? "Online" : "Offline — still fully usable"}
          {lock?.holder ? ` · lock on ${lock.hostname}` : ""}
          {inv?.readOnly ? " · read-only" : ""}
        </p>
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
  const { inv, platform } = useInventory();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [miss, setMiss] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const showCamera = cameraScanAvailable(platform.isElectron);

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

  function applyCode(raw: string) {
    if (!inv) return;
    const value = normalizeScannedCode(raw);
    if (!value) return;
    setCode(value);
    const hit = inv.lookup(value);
    if (hit.kind === "none") {
      setMiss(`No barcode match for “${value}”.`);
      nav(`/scan?q=${encodeURIComponent(value)}`);
      return;
    }
    setMiss(null);
    setCode("");
    const to = hitRoute(hit);
    if (to) nav(to);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    applyCode(code);
  }

  return (
    <>
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
            placeholder="Scan, type, or use the camera"
            title="Scan or type a barcode, then press Enter. On a phone, use the camera button for Code 128 and QR labels."
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            enterKeyHint="search"
            inputMode="text"
            name="scan"
          />
        </div>
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
        {miss && <span className="badge danger">{miss}</span>}
      </form>
      {cameraOpen && (
        <CameraScan
          onCode={(value) => {
            setCameraOpen(false);
            applyCode(value);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}

function ScanPage() {
  const { inv, platform } = useInventory();
  const [q, setQ] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const nav = useNavigate();
  if (!inv) return null;
  const hits = q.trim() ? inv.search(q) : [];
  const showCamera = cameraScanAvailable(platform.isElectron);

  function open(hit: LookupHit) {
    const to = hitRoute(hit);
    if (to) nav(to);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Scan / lookup</h1>
          <p>
            On a phone, use Camera for Code 128 and QR labels. USB and Bluetooth scanners still type into the top box.
            This page is also for fuzzy search when a code is unknown.
          </p>
        </div>
        {showCamera && (
          <button type="button" className="btn" onClick={() => setCameraOpen(true)}>
            Scan with camera
          </button>
        )}
      </div>
      {cameraOpen && (
        <CameraScan
          onCode={(value) => {
            setCameraOpen(false);
            const hit = inv.lookup(normalizeScannedCode(value));
            const to = hitRoute(hit);
            if (to) nav(to);
            else nav(`/scan?q=${encodeURIComponent(normalizeScannedCode(value))}`);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
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
                  ? `${hit.item.sku} · ${itemLabel(hit.item)}`
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
