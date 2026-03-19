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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 px-6 py-5 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Page Error</h2>
              <p className="text-sm text-red-600">Something went wrong loading this page.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Error message — shown immediately */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Error Message</p>
            <p className="text-sm font-mono text-red-800 break-all whitespace-pre-wrap">{message}</p>
            {digest && (
              <p className="text-xs text-red-400 mt-2">Digest: {digest}</p>
            )}
          </div>

          {/* Stack trace */}
          {stack && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stack Trace</p>
              <pre className="text-[10px] font-mono text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                {stack}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard/geo-monitor' }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            If this error persists, please{' '}
            <a href="mailto:contact@alignmenttech.ai" className="text-red-600 hover:underline">
              contact support
            </a>
            {' '}with the error details above.
          </p>
        </div>
      </div>
    </div>
  )
}
