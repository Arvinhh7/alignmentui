'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#1d1714] bg-[#090b0e] py-16">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">

        {/* ── Top grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="relative mb-4 h-14 w-40 overflow-hidden">
              <img
                src="/landing/alignment-logo-option-1-refined-crop.png"
                alt="Alignment AI"
                width={188}
                height={148}
                className="absolute left-0 top-1/2 h-14 w-auto max-w-none -translate-y-1/2 object-contain"
              />
            </div>
            <p className="max-w-[280px] text-sm leading-7 text-[#95a0af]">
              Alignment helps teams understand how answer engines represent their brand, products, and supporting evidence.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#a87967]">Product</h4>
            <ul className="space-y-3 text-sm text-[#bcc5d2]">
              <li><Link href="/system/"     className="transition-colors hover:text-white">System</Link></li>
              <li><Link href="/technology/" className="transition-colors hover:text-white">Technology</Link></li>
              <li><Link href="/pricing/"    className="transition-colors hover:text-white">Pricing</Link></li>
            </ul>
          </div>

          {/* Resources column */}
          <div>
            <h4 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#a87967]">Resources</h4>
            <ul className="space-y-3 text-sm text-[#bcc5d2]">
              <li><Link href="/blog/"     className="transition-colors hover:text-white">Blog</Link></li>
              <li><Link href="/insights/" className="transition-colors hover:text-white">Insights</Link></li>
            </ul>
          </div>

          {/* Contact & Legal column */}
          <div>
            <h4 className="mb-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#a87967]">Contact</h4>
            <ul className="space-y-3 text-sm text-[#bcc5d2]">
              <li>
                <a href="mailto:contact@alignmenttech.ai" className="transition-colors hover:text-[#F15A2B]">
                  Send Email
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ──────────────────────────────────────────── */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#1d1714] pt-8 text-sm text-[#6f7886] sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Alignment AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy/" className="transition-colors hover:text-white">Privacy</Link>
            <Link href="/terms/"   className="transition-colors hover:text-white">Terms</Link>
            <Link href="/help/"    className="transition-colors hover:text-white">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
