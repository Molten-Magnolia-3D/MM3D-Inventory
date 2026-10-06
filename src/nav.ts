export const PRIMARY_NAV_HREFS = ["/", "/scan", "/items", "/kits"] as const;

export function navPathname(path: string): string {
  const trimmed = path.trim() || "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isPrimaryNavPath(pathname: string): boolean {
  const path = navPathname(pathname);
  if (path === "/") return true;
  return PRIMARY_NAV_HREFS.filter((href) => href !== "/").some(
    (href) => path === href || path.startsWith(`${href}/`),
  );
}

export function isMoreNavPath(pathname: string): boolean {
  return !isPrimaryNavPath(pathname);
}
