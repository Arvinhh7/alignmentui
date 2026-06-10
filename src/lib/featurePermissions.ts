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
  | 'explore'
  | 'ai-search'
  | 'shopping'
  | 'geo-monitor'
  | 'analysis'
  | 'geo-audit'
  | 'geo-content'
  | 'ads'
  | 'gci'
  | 'prompts'
  | 'brand-hub'
  | 'visibility-proxy'
  | 'geo-optimization'
  | 'geo-distribution'
  | 'ga4-attribution'
  | 'ops'
  | 'agentic-commerce'
  | 'customers'

export interface FeatureInfo {
  key: FeatureKey
  /** English display name shown in toasts and restricted-view UI */
  label: string
  /** Base path under /dashboard. featureFromPath() matches this as a prefix. */
  path: string
}

export const FEATURES: Record<FeatureKey, FeatureInfo> = {
  'overview':         { key: 'overview',         label: 'Overview',              path: '/dashboard/overview' },
  'explore':          { key: 'explore',          label: 'Explore',               path: '/dashboard/explore' },
  'ai-search':        { key: 'ai-search',        label: 'AI Research',           path: '/dashboard/ai-search' },
  'shopping':         { key: 'shopping',         label: 'Shopping',              path: '/dashboard/shopping' },
  'geo-monitor':      { key: 'geo-monitor',      label: 'Answer Engine Insights', path: '/dashboard/geo-monitor' },
  'analysis':         { key: 'analysis',         label: 'Analysis',              path: '/dashboard/analysis' },
  'geo-audit':        { key: 'geo-audit',        label: 'GEO Audit',             path: '/dashboard/geo-audit' },
  'geo-content':      { key: 'geo-content',      label: 'GEO Content',           path: '/dashboard/geo-content' },
  'ads':              { key: 'ads',              label: 'AI Ads',                path: '/dashboard/ads' },
  'gci':              { key: 'gci',              label: 'GCI',                   path: '/dashboard/gci' },
  'prompts':          { key: 'prompts',          label: 'Prompt Library',        path: '/dashboard/prompts' },
  'brand-hub':        { key: 'brand-hub',        label: 'Brand Hub',             path: '/dashboard/brand-hub' },
  'visibility-proxy': { key: 'visibility-proxy', label: 'Visibility Proxy',      path: '/dashboard/visibility-proxy' },
  'geo-optimization': { key: 'geo-optimization', label: 'GEO Optimization',      path: '/dashboard/geo-optimization' },
  'geo-distribution': { key: 'geo-distribution', label: 'GEO Distribution',      path: '/dashboard/geo-distribution' },
  'ga4-attribution':  { key: 'ga4-attribution',  label: 'GA4 Attribution',       path: '/dashboard/ga4-attribution' },
  'ops':              { key: 'ops',              label: 'Managed Service',       path: '/dashboard/ops' },
  'agentic-commerce': { key: 'agentic-commerce', label: 'Agentic Commerce',      path: '/dashboard/agentic-commerce' },
  'customers':        { key: 'customers',        label: 'Customers',             path: '/dashboard/admin/customers' },
}

export type PlanKey = 'starter' | 'standard' | 'pro' | 'enterprise' | 'growth' | 'trial' | 'admin'

const PLAN_ALIASES: Record<string, PlanKey> = {
  starter: 'starter',
  standard: 'standard',
  growth: 'standard',
  pro: 'pro',
  enterprise: 'enterprise',
  trial: 'trial',
  admin: 'admin',
}

const PLAN_RANK: Record<PlanKey, number> = {
  trial: 0,
  starter: 1,
  standard: 2,
  growth: 2,
  pro: 3,
  enterprise: 4,
  admin: 5,
}

export const LAUNCH_VISIBLE_FEATURES = new Set<FeatureKey>([
  'overview',
  'explore',
  'ai-search',
  'shopping',
  'geo-monitor',
  'analysis',
  'geo-audit',
  'brand-hub',
  'visibility-proxy',
  'ga4-attribution',
  'prompts',
])

export const LAUNCH_HIDDEN_FEATURES = new Set<FeatureKey>([
  'ads',
  'gci',
  'geo-content',
  'geo-distribution',
  'agentic-commerce',
])

const MIN_PLAN_BY_FEATURE: Partial<Record<FeatureKey, PlanKey>> = {
  overview: 'starter',
  explore: 'starter',
  'ai-search': 'starter',
  shopping: 'starter',
  'geo-monitor': 'starter',
  analysis: 'starter',
  'geo-audit': 'starter',
  'brand-hub': 'starter',
  'visibility-proxy': 'starter',
  'ga4-attribution': 'starter',
  prompts: 'starter',
  'geo-optimization': 'standard',
  ops: 'enterprise',
  customers: 'admin',
}

export function normalizePlan(plan: string | null | undefined): PlanKey {
  if (!plan) return 'starter'
  return PLAN_ALIASES[plan.toLowerCase()] ?? 'starter'
}

export function isLaunchHiddenFeature(key: FeatureKey): boolean {
  return LAUNCH_HIDDEN_FEATURES.has(key)
}

export function hasPlanFeatureAccess(
  plan: string | null | undefined,
  key: FeatureKey,
): boolean {
  if (LAUNCH_HIDDEN_FEATURES.has(key)) return false
  const normalized = normalizePlan(plan)
  if (normalized === 'admin') return true
  const minPlan = MIN_PLAN_BY_FEATURE[key] ?? 'starter'
  return PLAN_RANK[normalized] >= PLAN_RANK[minPlan]
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

  // Admin sub-pages that ARE feature-gated (must be checked BEFORE the admin blanket skip below)
  if (path === '/dashboard/admin/customers' || path.startsWith('/dashboard/admin/customers/')) return 'customers'

  // Skip other admin and settings pages — they have their own role-based gating.
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
