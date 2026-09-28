export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "unavailable"
  | "error";

export interface UpdateStatus {
  version: string;
  packaged: boolean;
  portable: boolean;
  state: UpdateState;
  message: string;
  versionAvailable?: string;
  percent?: number;
}

export function unavailableUpdate(version: string, message: string): UpdateStatus {
  return {
    version,
    packaged: false,
    portable: false,
    state: "unavailable",
    message,
  };
}
