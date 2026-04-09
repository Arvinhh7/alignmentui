'use client'

import Link from 'next/link'

interface Props {
  open: boolean
  onClose: () => void
  cost?: number
  remaining?: number
  plan?: string
}

export default function CreditsExhaustedModal({ open, onClose, cost = 0, remaining = 0, plan = '' }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-surface rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-soft-bg flex items-center justify-center">
          <svg className="w-8 h-8 text-red-soft" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-ink mb-2">Credits Exhausted</h2>

        <p className="text-ink-2 text-sm mb-4">
          This operation requires <span className="font-semibold text-red-soft">{cost} credits</span>,
          but you only have <span className="font-semibold">{remaining} credits</span> remaining
          on your <span className="font-semibold capitalize">{plan}</span> plan.
        </p>

        <p className="text-ink-3 text-xs mb-6">
          Upgrade your plan to get more credits and unlock advanced features.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="w-full py-3 bg-ink text-ink-inv rounded-xl font-semibold hover:bg-[#2d2d2c] transition-all shadow-lg"
          >
            Upgrade Now
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-ink-3 hover:text-ink-2 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
