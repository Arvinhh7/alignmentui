/**
 * <FeatureLink> — Permission-guarded cross-feature link.
 *
 * Drop-in replacement for <a href> when navigating between feature modules.
 * - Renders as a real <a> so right-click "Open in new tab" works (the
 *   destination's FeatureGate would catch the staff there anyway).
 * - Intercepts left-click to run the staff-permission check first.
 * - Falls back to a warning toast if the staff lacks permission.
 *
 * Example:
 *   <FeatureLink feature="geo-distribution" className="...">
 *     <Icon /> Distribute Now
 *   </FeatureLink>
 */
'use client'

import type { ReactNode, MouseEvent } from 'react'
import { useFeatureNav } from '@/hooks/useFeatureNav'
import { FEATURES, type FeatureKey } from '@/lib/featurePermissions'

interface FeatureLinkProps {
  /** Destination feature's permission key */
  feature: FeatureKey
  /** Optional override path (e.g. /dashboard/geo-monitor?from=audit). Defaults to feature's base path. */
  href?: string
  children: ReactNode
  className?: string
  /** Pre-navigation hook (e.g. write to localStorage). Not called when blocked. */
  onPreNav?: () => void
  /** ARIA label for the underlying anchor */
  'aria-label'?: string
}

export default function FeatureLink({
  feature,
  href,
  children,
  className,
  onPreNav,
  'aria-label': ariaLabel,
}: FeatureLinkProps) {
  const { navTo } = useFeatureNav()
  const dest = href ?? FEATURES[feature].path

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let cmd/ctrl/middle-click open in a new tab — destination's
    // FeatureGate will catch staff who lack permission.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
    e.preventDefault()
    navTo(feature, dest, onPreNav)
  }

  return (
    <a href={dest} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </a>
  )
}
