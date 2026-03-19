'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const SCROLL_KEY_PREFIX = 'scroll_pos_'

/**
 * Saves and restores window scroll position per route using sessionStorage.
 * Place this hook in the shared dashboard layout so all modules benefit.
 *
 * Behaviour:
 *   - When navigating away, saves the current window.scrollY for the old path.
 *   - When arriving at a new path, restores the saved position if one exists.
 *   - If no saved position exists (first visit), stays at top (0).
 */
export function useScrollRestoration() {
  const pathname = usePathname()
  const prevPathnameRef = useRef<string>(pathname)

  useEffect(() => {
    const prevPathname = prevPathnameRef.current

    // Route has changed
    if (prevPathname !== pathname) {
      // 1. Persist scroll position of the page we're leaving
      try {
        sessionStorage.setItem(
          `${SCROLL_KEY_PREFIX}${prevPathname}`,
          String(window.scrollY),
        )
      } catch {
        // sessionStorage not available (private mode, etc.) — fail silently
      }

      // 2. Restore scroll position for the page we're arriving at
      try {
        const raw = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${pathname}`)
        const savedY = raw !== null ? parseInt(raw, 10) : 0

        // Double-rAF: first rAF lets React commit the new DOM, second rAF fires
        // after any other scroll handlers (including Next.js router scroll).
        // scroll={false} on <Link> also prevents Next.js from overriding us.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior })
          })
        })
      } catch {
        window.scrollTo(0, 0)
      }

      prevPathnameRef.current = pathname
    }
  }, [pathname])
}
