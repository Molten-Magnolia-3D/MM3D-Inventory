import { useEffect, useState } from "react";
import type { UpdateStatus } from "./core/update";
import { useInventory } from "./state";

export function useUpdateStatus(): UpdateStatus | null {
  const { platform } = useInventory();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    void platform.getUpdateStatus().then((next) => {
      if (!cancelled) setStatus(next);
    });
    const off = platform.onUpdate((next) => {
      if (!cancelled) setStatus(next);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [platform]);
  return status;
}
