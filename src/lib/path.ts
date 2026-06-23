/**
 * Path helpers — trailing-slash-safe route comparison.
 *
 * next.config.js sets `trailingSlash: true`, so `usePathname()` returns paths
 * WITH a trailing slash (e.g. `/dashboard/analysis/`) while route config values
 * (`item.href`, feature paths, map keys) are written WITHOUT one
 * (`/dashboard/analysis`). A bare `pathname === href` therefore never matches,
 * which silently breaks sidebar active-state, tab highlights, route-icon
 * lookups, and the product-tour autostart gate.
 *
 * Normalize both sides through here instead of peppering `/` literals around
 * the codebase — that way flipping `trailingSlash` later can't reintroduce the
 * whole class of bug.
 */

/** Strip a single trailing slash, preserving the root path "/". */
export function normalizePath(p: string | null | undefined): string {
  if (!p) return '/'
  return p.length > 1 ? p.replace(/\/+$/, '') : p
}

/**
 * Is `href` the active route for the current `pathname`? Trailing-slash safe.
 * With `prefix`, also matches nested child routes (e.g. /a/b matches href /a).
 */
export function isActivePath(
  pathname: string | null | undefined,
  href: string,
  opts?: { prefix?: boolean },
): boolean {
  const a = normalizePath(pathname)
  const b = normalizePath(href)
  return opts?.prefix ? a === b || a.startsWith(b + '/') : a === b
}
