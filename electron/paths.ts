import path from "node:path";

/** Resolve a renderer URL pathname to a file inside dist/, or null if it would escape. */
export function fileInDist(urlPathname: string, dir: string): string | null {
  const rel = decodeURIComponent(urlPathname).replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) return null;
  const resolvedDir = path.resolve(dir);
  const filePath = path.resolve(resolvedDir, rel);
  if (filePath !== resolvedDir && !filePath.startsWith(resolvedDir + path.sep)) return null;
  return filePath;
}
