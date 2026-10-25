import { useInventory } from "./state";
import { useUpdateStatus } from "./useUpdateStatus";

export function UpdateBanner() {
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
        Update now
      </button>
    </div>
  );
}
