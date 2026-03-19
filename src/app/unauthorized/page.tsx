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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex flex-col">
      <nav className="px-6 py-4 sm:px-10">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image src="/logo.svg" alt="Alignment AI" width={140} height={46} className="object-contain" priority />
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-lg w-full text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Start Your 14-Day Free Trial
          </h1>

          {user?.email && (
            <p className="text-gray-400 text-sm mb-2">
              Signed in as <span className="font-medium text-gray-600">{user.email}</span>
            </p>
          )}

          <p className="text-gray-500 leading-relaxed mb-6">
            A subscription is required to access the dashboard. Try the Platform free for 14 days — no credit card needed.
          </p>

          {/* Feature list */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 text-left shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What you get</p>
            <ul className="space-y-2.5">
              {TRIAL_HIGHLIGHTS.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex gap-3">
              <Link
                href="/contact"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Talk to Sales
              </Link>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-500 font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-5">
            Looking for Managed Service?{' '}
            <Link href="/contact" className="text-red-500 hover:text-red-600 underline">Contact our team</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
