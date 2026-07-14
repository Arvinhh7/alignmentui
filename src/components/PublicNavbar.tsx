'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowRight, ChevronDown } from 'lucide-react'

// ── Solutions dropdown items ───────────────────────────────────────────────────
const SOLUTIONS = [
  { label: 'AI Research', href: '/dashboard/ai-search' },
  { label: 'Explore Market Graph',   href: '/dashboard/explore' },
  { label: 'Shopping Intelligence',  href: '/dashboard/shopping' },
  { label: 'Prompt',                 href: '/dashboard/geo-monitor' },
  { label: 'Analysis',               href: '/dashboard/analysis' },
  { label: 'Agent Audit',            href: '/dashboard/geo-audit' },
  { label: 'Brand Hub',              href: '/dashboard/brand-hub' },
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
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black">
        Skip to main content
      </a>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[#1d1714] bg-[rgba(9,11,14,0.88)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex items-center justify-between py-3">

          {/* Logo */}
          <Link href="/" className="relative block h-11 w-36 overflow-hidden transition-opacity duration-200 hover:opacity-90">
            <img
              src="/landing/alignment-logo-option-1-refined-crop.png"
              alt="Alignment AI"
              width={188}
              height={148}
              className="absolute left-0 top-1/2 h-12 w-auto max-w-none -translate-y-1/2 object-contain"
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className={`relative flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] transition-colors after:absolute after:-bottom-2 after:left-0 after:h-px after:w-full after:origin-left after:bg-[#f15a2b] after:transition-transform after:duration-200 ${
                  item.href === activeHref
                    ? 'text-[#f0d8ca] after:scale-x-100'
                    : 'text-[#727b89] after:scale-x-0 hover:text-[#eef3fb] hover:after:scale-x-100'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {/* Solutions dropdown */}
            <div className="relative group">
              <button
                type="button"
                aria-haspopup="true"
                className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#727b89] transition-colors hover:text-[#f0d8ca]"
              >
                {t.nav.solutions}
                <ChevronDown className="h-3 w-3 opacity-60 transition-transform group-hover:rotate-180" aria-hidden="true" />
              </button>

              <div className="absolute right-0 top-full z-50 mt-4 invisible w-72 border border-[#2a211d] bg-[#0e1218] py-2 opacity-0 shadow-[0_28px_90px_rgba(0,0,0,0.45)] transition-all duration-200 group-hover:visible group-hover:opacity-100">
                {/* Platform modules */}
                {SOLUTIONS.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] text-[#b6bfcc] transition-colors hover:bg-[#15110f] hover:text-[#f0d8ca]"
                  >
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}

                {/* Divider */}
                <div className="my-1 border-t border-[#1d2330]" />

                {/* Free tools */}
                {FREE_TOOLS.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] text-[#b6bfcc] transition-colors hover:bg-[#15110f] hover:text-[#f0d8ca]"
                  >
                    <span className="font-medium">
                      {item.label}{' '}
                      <span className="ml-1 border border-[#3a251d] bg-[#17100d] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#d89a80]">
                        Free
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right side: language + CTA */}
          <div className="flex items-center gap-2.5">
            <LanguageSwitch />
            <Link
              href="/login/"
              className="hidden items-center justify-center gap-1.5 border border-[#3a251d] bg-[#13100f] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#f0d8ca] transition-[background-color,border-color,color] duration-200 hover:border-[#f15a2b]/50 hover:bg-[#18110e] sm:inline-flex"
            >
              {t.nav.getStarted}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      </nav>
    </>
  )
}
