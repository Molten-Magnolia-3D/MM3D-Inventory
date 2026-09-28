/**
 * CI stamps a unique semver on every workflow run so GitHub Releases
 * are always newer than the last Setup install. electron-updater only
 * downloads when the published version is greater than the installed one.
 *
 * Example: package.json 1.0.5 + run 15 → 1.0.15
 */
export function nextReleaseVersion(baseVersion, runNumber) {
  const parts = String(baseVersion ?? "")
    .trim()
    .split(".");
  const major = Number.parseInt(parts[0] ?? "1", 10);
  const minor = Number.parseInt(parts[1] ?? "0", 10);
  const patch = Number.parseInt(parts[2] ?? "0", 10);
  const run = Number.parseInt(String(runNumber ?? ""), 10);
  if (!Number.isFinite(major) || major < 0) throw new Error("Invalid major version.");
  if (!Number.isFinite(minor) || minor < 0) throw new Error("Invalid minor version.");
  if (!Number.isFinite(patch) || patch < 0) throw new Error("Invalid patch version.");
  if (!Number.isFinite(run) || run < 1) {
    throw new Error("GITHUB_RUN_NUMBER is required to stamp a release version.");
  }
  return `${major}.${minor}.${Math.max(patch + 1, run)}`;
}
