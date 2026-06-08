'use client'

import Link from 'next/link'
import { LogoFull } from '@/components/Logo'

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-divider-light py-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Top grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <LogoFull width={160} height={53} />
            </div>
            <p className="text-ink-3 text-sm leading-relaxed">
              Build the operating layer for AI discovery, recommendation, and agentic commerce.
            </p>
          </div>

          {/* Product column */}
          <div>
            <h4 className="font-semibold text-ink mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-ink-2">
              <li><Link href="/system/"     className="hover:text-ink transition-colors">System</Link></li>
              <li><Link href="/technology/" className="hover:text-ink transition-colors">Technology</Link></li>
              <li><Link href="/pricing/"    className="hover:text-ink transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Resources column */}
          <div>
            <h4 className="font-semibold text-ink mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-ink-2">
              <li><Link href="/blog/"     className="hover:text-ink transition-colors">Blog</Link></li>
              <li><Link href="/insights/" className="hover:text-ink transition-colors">Insights</Link></li>
            </ul>
          </div>

          {/* Contact & Legal column */}
          <div>
            <h4 className="font-semibold text-ink mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-ink-2">
              <li>
                <a href="mailto:contact@alignmenttech.ai" className="hover:text-ink transition-colors">
                  Send Email
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ──────────────────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-divider-light flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-ink-3">
          <span>&copy; {new Date().getFullYear()} Alignment AI. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy/" className="hover:text-ink transition-colors">Privacy</Link>
            <Link href="/terms/"   className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/help/"    className="hover:text-ink transition-colors">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
