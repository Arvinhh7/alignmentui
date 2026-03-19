// GA4 utility — wraps window.gtag for type safety and conditional execution
// NEXT_PUBLIC_GA_MEASUREMENT_ID must be set in environment (e.g. G-XXXXXXXXXX)

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? ''

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

export function pageview(url: string) {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return
  window.gtag('config', GA_ID, { page_path: url })
}

export function gaEvent(action: string, params: Record<string, unknown> = {}) {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', action, params)
}
