'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'

// ── Solutions dropdown items ───────────────────────────────────────────────────
const SOLUTIONS = [
  { label: 'AI Research', href: '/dashboard/ai-search' },
  { label: 'Explore Market Graph',   href: '/dashboard/explore' },
  { label: 'Shopping Intelligence',  href: '/dashboard/shopping' },
  { label: 'AI Ads Intelligence',    href: '/dashboard/ads' },
  { label: 'Visibility Proxy',       href: '/dashboard/visibility-proxy' },
  { label: 'Agentic Commerce',       href: '/dashboard/agentic-commerce' },
]

const FREE_TOOLS = [
  { label: 'AI Visibility Check', href: '/ai-visibility-check/' },
  { label: 'ROI Calculator',      href: '/roi-simulator/' },
]

// ── Component ─────────────────────────────────────────────────────────────────
// activeHref: the href of the current page, used to highlight the active link.
// Pass undefined on the homepage (no link is active).
export default function PublicNavbar({ activeHref }: { activeHref?: string }) {
  const { t } = useLanguage()

  const navLinks = [
    { label: t.nav.system,     href: '/system/' },
    { label: t.nav.technology, href: '/technology/' },
    { label: t.nav.pricing,    href: '/pricing/' },
    { label: t.nav.docs,       href: '/blog/' },
    { label: t.nav.insights,   href: '/insights/' },
    { label: t.nav.contact,    href: '/contact/' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
            <LogoFull width={140} height={45} />
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
                  item.href === activeHref
                    ? 'text-ink bg-surface-muted'
                    : 'text-ink-2 hover:text-ink hover:bg-surface-warm'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Solutions dropdown */}
            <div className="relative group">
              <button className="px-3 py-2 text-ink-2 hover:text-ink text-sm font-medium transition-colors rounded-lg hover:bg-surface-warm flex items-center gap-1">
                {t.nav.solutions}
                <svg
                  className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:rotate-180"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute top-full right-0 mt-1 w-64 bg-surface rounded-xl shadow-xl border border-divider-light py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {/* Platform modules */}
                {SOLUTIONS.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:bg-surface-warm hover:text-ink transition-colors"
                  >
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}

                {/* Divider */}
                <div className="border-t border-divider-light my-1" />

                {/* Free tools */}
                {FREE_TOOLS.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-2 hover:bg-surface-warm hover:text-ink transition-colors"
                  >
                    <span className="font-semibold">
                      {item.label}{' '}
                      <span className="text-[10px] bg-surface-muted text-ink-2 px-1.5 py-0.5 rounded-full ml-1">
                        Free
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right side: language + CTA */}
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <Link
              href="/login/"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-ink-inv bg-ink rounded-lg hover:bg-[#2d2d2c] transition-all shadow-soft hover:shadow-medium btn-shine"
            >
              {t.nav.getStarted}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
