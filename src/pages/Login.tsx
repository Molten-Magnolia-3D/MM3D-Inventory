import { FormEvent, useState } from "react";
import { useInventory } from "../state";
import { Field } from "../ui";

export default function LoginPage() {
  const { inv, refresh, cloudLogin } = useInventory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!inv) return null;
  const api = inv;
  const firstRun = !api.hasAnyUser();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (firstRun) await api.register(email, password);
      else await api.login(email, password);
      try {
        await cloudLogin(email, password, firstRun ? "register" : "login");
      } catch (err) {
        setError((err as Error).message);
      }
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="brand-mark">M</div>
          <div>
            <strong className="brand-type">MM3D Inventory</strong>
            <small>Molten Magnolia 3D</small>
          </div>
        </div>
        <h1>{firstRun ? "Create your owner login" : "Welcome back"}</h1>
        <p className="lede">
          {firstRun
            ? "One email and password for this shop. Data lives on this PC and can sync to your cloud project when you add Firebase in Settings."
            : "Works offline. Syncs when the shop PC is back online."}
        </p>
        {error && <div className="danger-banner">{error}</div>}
        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            autoComplete={firstRun ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        <button className="btn" type="submit" disabled={busy}>
          {firstRun ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
