/**
 * useFeatureNav — Permission-guarded cross-feature navigation.
 *
 * Use this hook in any page where a CTA links to a different feature module.
 * It checks staff permissions BEFORE navigating; if the destination feature
 * is not enabled for the staff account it shows a warning toast and stays
 * on the current page.
 *
 * Example:
 *   const { navTo, canAccess } = useFeatureNav()
 *   <button onClick={() => navTo('geo-content', '/dashboard/geo-content/articles')}>
 *     Create Content
 *   </button>
 */
import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/Toast'
import { FEATURES, hasFeatureAccess, type FeatureKey } from '@/lib/featurePermissions'

export function useFeatureNav() {
  const { role, permissions } = useAuth()
  const { toast } = useToast()

  /** Returns true iff the current user can access the given feature. */
  const canAccess = useCallback(
    (key: FeatureKey) => hasFeatureAccess(role, permissions, key),
    [role, permissions],
  )

  /**
   * Navigate to a feature page.
   * @param key      Destination feature's permission key
   * @param href     Optional override path (e.g. with query params); defaults to FEATURES[key].path
   * @param preFn    Optional callback to run BEFORE navigation (e.g. localStorage write).
   *                 Not called when navigation is blocked by missing permission.
   */
  const navTo = useCallback(
    (key: FeatureKey, href?: string, preFn?: () => void) => {
      if (!canAccess(key)) {
        toast.warning(
          'Additional permission required',
          `Access to ${FEATURES[key].label} is not enabled for your account. Please contact your administrator.`,
        )
        return
      }
      preFn?.()
      window.location.href = href ?? FEATURES[key].path
    },
    [canAccess, toast],
  )

  return { navTo, canAccess }
}
