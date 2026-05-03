/**
 * <FeatureGate> — Destination-side permission guard for staff accounts.
 *
 * Wrapped around <main>'s {children} inside DashboardLayout. For each
 * incoming pathname:
 *   1. Resolves the path to a FeatureKey (longest-prefix match).
 *   2. If staff lacks permission for that feature → renders an
 *      "Access Restricted" view INSTEAD OF children.
 *   3. Otherwise → renders children unchanged.
 *
 * Catches:
 *   - Direct URL paste / browser back-forward
 *   - Stale bookmarks
 *   - Any cross-page CTA we forgot to wrap with <FeatureLink>
 *
 * For non-feature paths (settings, /dashboard/admin/*) this is a no-op —
 * those pages handle their own role-based gating.
 */
'use client'

import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  FEATURES,
  featureFromPath,
  hasFeatureAccess,
} from '@/lib/featurePermissions'

export default function FeatureGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const { role, permissions } = useAuth()
  const featureKey = featureFromPath(pathname)

  // Not a feature page (settings, admin/*, etc.) → fall through unchanged.
  if (!featureKey) return <>{children}</>

  // Has access → render normally.
  if (hasFeatureAccess(role, permissions, featureKey)) return <>{children}</>

  // Staff lacks permission → render restricted view in place of children.
  const feature = FEATURES[featureKey]
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-6">
      <div className="max-w-md w-full bg-surface border border-divider rounded-2xl p-10 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-ink-3" />
        </div>
        <h2 className="text-lg font-bold text-ink mb-2">Access Restricted</h2>
        <p className="text-sm text-ink-2 leading-relaxed mb-6">
          <span className="font-semibold text-ink">{feature.label}</span> is not
          enabled for your account. Please contact your administrator to request
          additional permissions.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              if (window.history.length > 1) window.history.back()
              else window.location.href = '/dashboard'
            }}
            className="px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-xl hover:bg-[#2d2d2c] transition-colors"
          >
            ← Go back
          </button>
          <a
            href="/dashboard/settings"
            className="px-4 py-2 bg-surface-muted text-ink-2 text-sm font-medium rounded-xl hover:bg-surface-warm transition-colors"
          >
            Settings
          </a>
        </div>
      </div>
    </div>
  )
}
