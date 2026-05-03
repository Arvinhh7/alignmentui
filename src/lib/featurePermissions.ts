/**
 * Feature Permissions — Single Source of Truth
 *
 * Maps PermissionKeys ↔ paths ↔ display labels for the staff permission system.
 * Used by:
 *   - useFeatureNav (source-side guard for cross-page CTAs)
 *   - FeatureGate   (destination-side guard inside DashboardLayout)
 *   - admin/team    (for the admin to grant permissions)
 *
 * IMPORTANT: this list MUST stay in sync with PERMISSION_KEYS in
 * src/app/dashboard/admin/team/page.tsx.
 */
import type { UserRole, PermissionsMap } from '@/hooks/useAuth'

export type FeatureKey =
  | 'overview'
  | 'geo-monitor'
  | 'agents'
  | 'geo-audit'
  | 'geo-content'
  | 'prompts'
  | 'brand-hub'
  | 'visibility-proxy'
  | 'geo-optimization'
  | 'geo-distribution'
  | 'ga4-attribution'
  | 'ops'

export interface FeatureInfo {
  key: FeatureKey
  /** English display name shown in toasts and restricted-view UI */
  label: string
  /** Base path under /dashboard. featureFromPath() matches this as a prefix. */
  path: string
}

export const FEATURES: Record<FeatureKey, FeatureInfo> = {
  'overview':         { key: 'overview',         label: 'Overview',              path: '/dashboard/overview' },
  'geo-monitor':      { key: 'geo-monitor',      label: 'Answer Engine Insights', path: '/dashboard/geo-monitor' },
  'agents':           { key: 'agents',           label: 'AI Agents',             path: '/dashboard/agents' },
  'geo-audit':        { key: 'geo-audit',        label: 'GEO Audit',             path: '/dashboard/geo-audit' },
  'geo-content':      { key: 'geo-content',      label: 'GEO Content',           path: '/dashboard/geo-content' },
  'prompts':          { key: 'prompts',          label: 'Prompt Library',        path: '/dashboard/prompts' },
  'brand-hub':        { key: 'brand-hub',        label: 'Brand Hub',             path: '/dashboard/brand-hub' },
  'visibility-proxy': { key: 'visibility-proxy', label: 'Visibility Proxy',      path: '/dashboard/visibility-proxy' },
  'geo-optimization': { key: 'geo-optimization', label: 'GEO Optimization',      path: '/dashboard/geo-optimization' },
  'geo-distribution': { key: 'geo-distribution', label: 'GEO Distribution',      path: '/dashboard/geo-distribution' },
  'ga4-attribution':  { key: 'ga4-attribution',  label: 'GA4 Attribution',       path: '/dashboard/ga4-attribution' },
  'ops':              { key: 'ops',              label: 'Managed Service',       path: '/dashboard/ops' },
}

/**
 * Resolve a URL path to its FeatureKey.
 * Uses longest-prefix match so nested routes (e.g. /dashboard/geo-content/articles/123)
 * inherit their parent feature's permission key.
 *
 * Returns null if the path is not under a known feature (e.g. /dashboard/settings,
 * /dashboard/admin/*) — the caller must fall through to children unchanged.
 */
export function featureFromPath(path: string): FeatureKey | null {
  if (!path) return null

  // Special case: bare /dashboard or /dashboard/ → treat as overview
  if (path === '/dashboard' || path === '/dashboard/') return 'overview'

  // Skip admin and settings pages — they have their own role-based gating.
  if (path.startsWith('/dashboard/admin/')) return null
  if (path.startsWith('/dashboard/settings')) return null

  // Longest-prefix match across all features
  let best: { key: FeatureKey; len: number } | null = null
  for (const f of Object.values(FEATURES)) {
    if (path === f.path || path.startsWith(f.path + '/')) {
      if (!best || f.path.length > best.len) {
        best = { key: f.key, len: f.path.length }
      }
    }
  }
  return best?.key ?? null
}

/**
 * Does this user have access to the given feature?
 *
 * - admin / demo  → always true (full internal/demo access)
 * - staff         → must have an explicit permissions[key] === true
 * - user / null   → true (subscription-level gating happens elsewhere
 *                   via useSubscription; this function only guards
 *                   the staff role's per-feature permissions)
 */
export function hasFeatureAccess(
  role: UserRole | null | undefined,
  permissions: PermissionsMap,
  key: FeatureKey,
): boolean {
  if (role === 'admin' || role === 'demo') return true
  if (role === 'staff') return permissions[key] === true
  return true
}
