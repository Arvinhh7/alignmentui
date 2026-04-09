'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error)
  }, [error])

  // Collect error info synchronously for immediate display
  const message = error.message || 'Unknown error'
  const stack = error.stack || ''
  const digest = error.digest || ''

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-red-soft-bg px-6 py-5 border-b border-divider-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-soft-bg rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-soft" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Page Error</h2>
              <p className="text-sm text-red-soft">Something went wrong loading this page.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error message — shown immediately */}
          <div className="bg-red-soft-bg border border-divider-light rounded-xl p-4">
            <p className="text-xs font-semibold text-red-soft uppercase tracking-wider mb-2">Error Message</p>
            <p className="text-sm font-mono text-red-soft break-all whitespace-pre-wrap">{message}</p>
            {digest && (
              <p className="text-xs text-red-soft mt-2">Digest: {digest}</p>
            )}
          </div>

          {/* Stack trace */}
          {stack && (
            <div className="bg-surface-warm border border-divider-light rounded-xl p-4">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">Stack Trace</p>
              <pre className="text-[10px] font-mono text-ink-2 overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {stack}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard/geo-monitor' }}
              className="flex-1 px-4 py-2.5 border border-divider text-ink-2 text-sm font-medium rounded-xl hover:bg-surface-warm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          <p className="text-xs text-ink-3 text-center">
            If this error persists, please{' '}
            <a href="mailto:contact@alignmenttech.ai" className="text-ink underline underline-offset-2 hover:text-ink-2">
              contact support
            </a>
            {' '}with the error details above.
          </p>
        </div>
      </div>
    </div>
  )
}
