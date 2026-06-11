'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { ArrowRight, LogOut, Sparkles, CheckCircle2, MessageSquare } from 'lucide-react'

const TRIAL_HIGHLIGHTS = [
  'GEO Audit — see exactly how AI platforms perceive you',
  'Brand monitoring across 20+ AI channels',
  'Content & Distribution optimization tools',
  '100M+ source proprietary index',
]

export default function UnauthorizedPage() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <nav className="px-6 py-4 sm:px-10">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="Alignment AI" width={140} height={46} className="object-contain" priority />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-ink rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-ink mb-3">
            Start Your 14-Day Free Trial
          </h1>

          {user?.email && (
            <p className="text-ink-3 text-sm mb-2">
              Signed in as <span className="font-medium text-ink-2">{user.email}</span>
            </p>
          )}

          <p className="text-ink-3 leading-relaxed mb-6">
            A subscription is required to access the dashboard. Try the Platform free for 7 days — no credit card needed.
          </p>

          {/* Feature list */}
          <div className="bg-surface border border-divider-light rounded-2xl p-5 mb-6 text-left shadow-sm">
            <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3">What you get</p>
            <ul className="space-y-2.5">
              {TRIAL_HIGHLIGHTS.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="w-full inline-flex items-center justify-center gap-2 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex gap-3">
              <Link
                href="/contact"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface-warm border border-divider text-ink-2 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Talk to Sales
              </Link>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 bg-surface hover:bg-surface-warm border border-divider text-ink-3 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          <p className="text-xs text-ink-3 mt-5">
            Looking for Managed Service?{' '}
            <Link href="/contact" className="text-red-soft hover:text-red-soft underline">Contact our team</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
