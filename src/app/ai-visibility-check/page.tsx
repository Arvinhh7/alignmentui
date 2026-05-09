'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { LogoFull } from '@/components/Logo'
import Footer from '@/components/Footer'
import type { AuditResult, AuditCheck } from '@/lib/audit'
import {
  Shield, Layers, FileText, AlertOctagon, Brain,
  CheckCircle, AlertTriangle, XCircle,
  ChevronDown, ChevronUp,
  type LucideIcon,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIT_API = 'https://api.alignmenttech.ai/v1/public/geo-audit'
const LEAD_API  = 'https://api.alignmenttech.ai/api/audit-lead'
// Public plugin key — rate-limited at server (10 req/IP/day), safe to expose in browser
const AUDIT_API_KEY =
  process.env.NEXT_PUBLIC_ALIGNMENT_PUBLIC_API_KEY ||
  'pk_plugin_alignment_v1_c0ebd21b5cc99b1e44fdd498bc3e2d09'

const DIM_LABELS: Record<string, string> = {
  d1: 'AI Discoverability',
  d2: 'Semantic Structure & Format',
  d3: 'Content Citability',
  d4: 'Risk Boundary & Trust',
  d5: 'Reusability & Memory',
}

const LOADING_STEPS = [
  'Scanning AI discoverability…',
  'Checking semantic structure…',
  'Evaluating content citability…',
  'Analyzing risk boundaries…',
  'Computing AI Visibility Score…',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelRingColor(level: string): string {
  if (level === 'Excellent' || level === 'Good') return '#4A7C59'
  if (level === 'Needs Work') return '#B8860B'
  return '#B5453A'
}

function levelTextClass(level: string): string {
  if (level === 'Excellent' || level === 'Good') return 'text-sage'
  if (level === 'Needs Work') return 'text-caution'
  return 'text-red-soft'
}

function levelBgClass(level: string): string {
  if (level === 'Excellent' || level === 'Good') return 'bg-sage-bg text-sage'
  if (level === 'Needs Work') return 'bg-caution-bg text-caution'
  return 'bg-red-soft-bg text-red-soft'
}

function isShopify(stack: Record<string, unknown>): boolean {
  return JSON.stringify(stack).toLowerCase().includes('shopify')
}

// Strip technical RFC references from check names for public-facing display
// e.g. "Link Headers (RFC 8288)" → "Link Headers"
function cleanCheckName(name: string): string {
  return name.replace(/\s*\(RFC\s*\d+\)/gi, '').trim()
}

function checkRowClass(status: string): string {
  if (status === 'pass')    return 'border-divider-light bg-surface'
  if (status === 'warning') return 'border-caution/30 bg-caution-bg/40'
  return 'border-red-soft/30 bg-red-soft-bg/40'
}

function normalizeDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//, '').split('/')[0].split('?')[0]
}

function isValidDomain(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.includes('@')) return false
  const cleaned = normalizeDomain(trimmed)
  if (!cleaned) return false
  try {
    const { hostname } = new URL(`https://${cleaned}`)
    return /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(hostname)
  } catch {
    return false
  }
}

// ── Rate-limit countdown UI ───────────────────────────────────────────────────

function RateLimitBanner({ countdown }: { countdown: string }) {
  return (
    <div className="mt-4 w-full max-w-xl mx-auto rounded-2xl border border-caution/30 bg-caution-bg overflow-hidden">
      {/* Top row — quota info + countdown */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-caution flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-caution">
            Today&#39;s limit of <strong>10 free audits</strong> reached
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-caution tabular-nums">
          {countdown}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-caution/20" />

      {/* CTA row — marketing hook */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-2 leading-snug">
          Need to audit <strong>right now</strong>? Get unlimited access instantly.
        </p>
        <a
          href="/contact/"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-ink text-ink-inv text-sm font-bold rounded-xl hover:bg-[#2d2d2c] transition-all shadow-sm ring-2 ring-ink/10 hover:ring-ink/20"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          contact@alignmenttech.ai
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score, level }: { score: number; level: string }) {
  const color = levelRingColor(level)
  // score is 0-100 (percentage-based from API)
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#EDE3D0" strokeWidth="2.8" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray={`${score} 100`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-ink leading-none">{score}</span>
        <span className="text-xs text-ink-3 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle    className="w-4 h-4 text-sage      flex-shrink-0" />
  if (status === 'warning') return <AlertTriangle  className="w-4 h-4 text-caution   flex-shrink-0" />
  return                           <XCircle        className="w-4 h-4 text-red-soft  flex-shrink-0" />
}

function CheckAccordion({ dimId, checks }: { dimId: string; checks: AuditCheck[] }) {
  const [open, setOpen] = useState(false)
  const cfg = DIMENSION_CONFIG[dimId] ?? DIMENSION_CONFIG.d1
  const { Icon, prefix, iconBg, iconText, border } = cfg

  const passes   = checks.filter(c => c.status === 'pass').length
  const warnings = checks.filter(c => c.status === 'warning').length
  const fails    = checks.filter(c => c.status === 'fail').length

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden transition-all hover:shadow-md ${open ? border + ' shadow-md' : 'border-divider-light'}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} ${iconText}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <span className="text-xs text-ink-3 font-mono">{prefix}</span>
                {DIM_LABELS[dimId] ?? dimId}
              </h4>
              <span className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors flex-shrink-0">
                {open ? 'Hide' : 'View'} {checks.length} checks
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              {passes > 0 && (
                <span className="flex items-center gap-1 text-sage">
                  <CheckCircle className="w-3 h-3" />{passes} pass
                </span>
              )}
              {warnings > 0 && (
                <span className="flex items-center gap-1 text-caution">
                  <AlertTriangle className="w-3 h-3" />{warnings} warning
                </span>
              )}
              {fails > 0 && (
                <span className="flex items-center gap-1 text-red-soft">
                  <XCircle className="w-3 h-3" />{fails} issue
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-divider-light">
          <div className="space-y-1.5 pt-3">
            {checks.map(check => (
              <div
                key={check.id}
                className={`rounded-lg border flex items-center gap-3 px-3 py-2.5 ${checkRowClass(check.status)}`}
              >
                <StatusIcon status={check.status} />
                <span className="text-sm text-ink-2">{check.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// D1 shows first 5 checks, D2–D5 show first 3; remaining blurred in L1
const DIM_VISIBLE_COUNT: Record<string, number> = { d1: 5 }
const DIM_VISIBLE_DEFAULT = 3

// Dimension icon / color config — mirrors dashboard DIMENSION_MAP
const DIMENSION_CONFIG: Record<string, {
  Icon: LucideIcon; prefix: string
  iconBg: string; iconText: string; border: string
}> = {
  d1: { Icon: Shield,       prefix: 'D1', iconBg: 'bg-surface-warm', iconText: 'text-ink-2',   border: 'border-divider-light' },
  d2: { Icon: Layers,       prefix: 'D2', iconBg: 'bg-surface-warm', iconText: 'text-ink-2',   border: 'border-divider-light' },
  d3: { Icon: FileText,     prefix: 'D3', iconBg: 'bg-surface-warm', iconText: 'text-ink-2',   border: 'border-divider-light' },
  d4: { Icon: AlertOctagon, prefix: 'D4', iconBg: 'bg-red-soft-bg',  iconText: 'text-red-soft', border: 'border-red-soft/30'  },
  d5: { Icon: Brain,        prefix: 'D5', iconBg: 'bg-sage-bg',      iconText: 'text-sage',    border: 'border-sage/30'      },
}

function DimensionPanel({
  dim,
  checks,
  locked,
}: {
  dim: { id: string; name: string; score: number; level: string }
  checks: AuditCheck[]
  locked: boolean  // true = L1 (blur overflow), false = L2 (show all)
}) {
  const [open, setOpen] = useState(true)

  const cfg = DIMENSION_CONFIG[dim.id] ?? DIMENSION_CONFIG.d1
  const { Icon, prefix, iconBg, iconText, border } = cfg

  const visibleCount = DIM_VISIBLE_COUNT[dim.id] ?? DIM_VISIBLE_DEFAULT
  const visible = checks.slice(0, visibleCount)
  const hidden  = locked ? checks.slice(visibleCount) : []
  const total   = visible.length + hidden.length

  const passCount    = checks.filter(c => c.status === 'pass').length
  const warningCount = checks.filter(c => c.status === 'warning').length
  const failCount    = checks.filter(c => c.status === 'fail').length

  const getBarColor = (s: number) => {
    if (s >= 85) return 'bg-sage'
    if (s >= 65) return 'bg-ink-2'
    if (s >= 45) return 'bg-caution'
    return 'bg-red-soft'
  }

  const statusColor = dim.level === 'Excellent' || dim.level === 'Good'
    ? 'bg-sage-bg text-sage'
    : dim.level === 'Needs Work'
    ? 'bg-caution-bg text-caution'
    : 'bg-red-soft-bg text-red-soft'

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden transition-all hover:shadow-md ${open ? border + ' shadow-md' : 'border-divider-light'}`}>
      {/* ── Header (collapsible) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} ${iconText}`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <span className="text-xs text-ink-3 font-mono">{prefix}</span>
                {DIM_LABELS[dim.id] ?? dim.name}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{dim.level}</span>
                <span className="text-2xl font-bold font-mono text-ink">{dim.score}</span>
              </div>
            </div>

            {/* Score bar */}
            <div className="w-full h-1.5 bg-surface-warm rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBarColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-2 text-xs text-ink-3">
              <span className="flex items-center gap-3">
                {passCount > 0 && (
                  <span className="flex items-center gap-1 text-sage">
                    <CheckCircle className="w-3 h-3" />{passCount} pass
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="flex items-center gap-1 text-caution">
                    <AlertTriangle className="w-3 h-3" />{warningCount} warning
                  </span>
                )}
                {failCount > 0 && (
                  <span className="flex items-center gap-1 text-red-soft">
                    <XCircle className="w-3 h-3" />{failCount} issue
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1 hover:text-ink transition-colors">
                {open ? 'Hide' : 'View'} {total} checks
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* ── Check items ── */}
      {open && (
        <div className="px-5 pb-4 border-t border-divider-light">
          {checks.length === 0 ? (
            <p className="py-4 text-sm text-ink-3 italic">No checks available</p>
          ) : (
            <>
              <div className="space-y-1.5 pt-3">
                {visible.map(check => (
                  <div
                    key={check.id}
                    className={`rounded-lg border flex items-center gap-3 px-3 py-2.5 ${checkRowClass(check.status)}`}
                  >
                    <StatusIcon status={check.status} />
                    <span className="text-sm text-ink-2 leading-snug">{cleanCheckName(check.name)}</span>
                  </div>
                ))}
              </div>

              {hidden.length > 0 && (
                <div className="relative mt-1.5">
                  <div className="space-y-1.5 select-none pointer-events-none">
                    {hidden.map(check => (
                      <div
                        key={check.id}
                        className={`rounded-lg border flex items-center gap-3 px-3 py-2.5 blur-sm ${checkRowClass(check.status)}`}
                      >
                        <StatusIcon status={check.status} />
                        <span className="text-sm text-ink-2">{cleanCheckName(check.name)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-ink-2 bg-surface/90 px-3 py-1.5 rounded-full border border-divider-light shadow-sm">
                      🔒 {hidden.length} more — unlock below
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page phases ───────────────────────────────────────────────────────────────

function InputSection({
  domain, setDomain, onSubmit, error, rateLimitCountdown,
}: {
  domain: string
  setDomain: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  error: string | null
  rateLimitCountdown: string | null
}) {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-canvas" />
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-[#4A7C59]/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#B8860B]/[0.04] rounded-full blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur border border-divider-light/50 rounded-full shadow-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-sage animate-blink" />
            <span className="text-sm text-ink-2 font-medium">Free AI Visibility Check</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-ink leading-[1.08] tracking-tight mb-6">
            Is your website<br />
            <span className="relative">
              visible to AI?
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sage/40 rounded-full" />
            </span>
          </h1>

          <p className="text-lg md:text-xl text-ink-2 max-w-2xl mx-auto leading-relaxed mb-10">
            Get your AI Visibility Score in 30 seconds. See exactly where
            ChatGPT, Perplexity, and Claude are missing your brand — and how to fix it.
          </p>

          {/* Input form */}
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="yourstore.myshopify.com"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-divider bg-surface text-ink placeholder-ink-3 focus:outline-none focus:ring-2 focus:ring-ink/10 transition-all text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all shadow-sm hover:shadow-md text-sm flex-shrink-0"
            >
              Analyze
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </form>

          {rateLimitCountdown ? (
            <RateLimitBanner countdown={rateLimitCountdown} />
          ) : error ? (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-red-soft-bg border border-red-soft/20 rounded-lg text-sm text-red-soft">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          ) : null}

          <p className="mt-5 text-xs text-ink-3 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              No sign-up required
            </span>
            <span>·</span>
            <span>Rate-limited · 10 checks/day</span>
          </p>
        </div>
      </section>

      {/* Trust / preview strip */}
      <section className="pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: '🔍', label: '30 checks', sub: 'Across 5 dimensions' },
              { icon: '⚡', label: '30 seconds', sub: 'Real-time analysis' },
              { icon: '🎯', label: 'Fix guide', sub: 'Platform-specific CTAs' },
            ].map(item => (
              <div key={item.label} className="bg-surface rounded-2xl border border-divider-light p-5 text-center shadow-sm">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-ink text-sm">{item.label}</div>
                <div className="text-xs text-ink-3 mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function LoadingSection({ step, domain }: { step: number; domain: string }) {
  return (
    <section className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-divider-light" />
          <div className="absolute inset-0 rounded-full border-2 border-t-ink animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-ink mb-1">Analyzing {domain}</h2>
        <p className="text-ink-3 text-sm mb-8">This takes about 15–30 seconds</p>

        <div className="space-y-3 text-left">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i <= step ? 'opacity-100' : 'opacity-30'}`}>
              {i < step ? (
                <span className="w-5 h-5 rounded-full bg-sage-bg flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : i === step ? (
                <span className="w-5 h-5 rounded-full border-2 border-t-ink animate-spin flex-shrink-0" />
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-divider-light flex-shrink-0" />
              )}
              <span className={`text-sm ${i <= step ? 'text-ink-2' : 'text-ink-3'}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ResultSection({
  result, phase, email, setEmail, emailError, submittingEmail, onUnlock, onReset,
}: {
  result: AuditResult
  phase: 'l1' | 'l2'
  email: string
  setEmail: (v: string) => void
  emailError: string | null
  submittingEmail: boolean
  onUnlock: (e: React.FormEvent) => void
  onReset: () => void
}) {
  const shopify = isShopify(result.detected_stack)

  return (
    <div className="animate-fade-in">
      {/* Result header */}
      <div className="bg-surface border-b border-divider-light">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onReset}
              className="text-ink-3 hover:text-ink transition-colors flex items-center gap-1.5 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New check
            </button>
            <span className="text-divider">/</span>
            <span className="text-sm font-medium text-ink">{result.domain}</span>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelBgClass(result.level)}`}>
            {result.level}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Score + 5D ── */}
        {phase === 'l1' ? (
          /* L1: insight cards + score ring + audit stats + DimensionPanels */
          <div className="space-y-4">
            {/* Strongest / Priority to Fix — mirrors dashboard top */}
            {(() => {
              const sorted = [...result.dimensions].sort((a, b) => b.score - a.score)
              const strongest = sorted[0]
              const weakest   = sorted[sorted.length - 1]
              const allChecks = Object.values(result.checks_by_dimension).flat()
              const passedCt  = allChecks.filter(c => c.status === 'pass').length
              const warnCt    = allChecks.filter(c => c.status === 'warning').length
              const failCt    = allChecks.filter(c => c.status === 'fail').length
              return (
                <>
                  {/* Insight row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-sage-bg to-surface-warm rounded-xl border border-sage/30 p-5">
                      <p className="text-xs font-semibold text-sage uppercase tracking-wider mb-3">Strongest Dimension</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink text-sm">{DIM_LABELS[strongest.id] ?? strongest.name}</span>
                        <span className="text-2xl font-bold font-mono text-sage">{strongest.score}</span>
                      </div>
                      <p className="text-xs text-sage mt-1.5 opacity-75">Your best-performing area for AI visibility.</p>
                    </div>
                    <div className="bg-surface-warm rounded-xl border border-divider-light p-5">
                      <p className="text-xs font-semibold text-red-soft uppercase tracking-wider mb-3">Priority to Fix</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink text-sm">{DIM_LABELS[weakest.id] ?? weakest.name}</span>
                        <span className="text-2xl font-bold font-mono text-red-soft">{weakest.score}</span>
                      </div>
                      <p className="text-xs text-red-soft mt-1.5 opacity-75">Improving this will have the biggest impact.</p>
                    </div>
                  </div>

                  {/* Score ring + audit summary side-by-side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-surface rounded-2xl border border-divider-light p-6 text-center shadow-sm">
                      <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">AI Visibility Score</p>
                      <ScoreRing score={result.overall_score} level={result.level} />
                      <p className={`text-sm font-semibold mt-4 ${levelTextClass(result.level)}`}>{result.level}</p>
                      <p className="text-xs text-ink-3 mt-1">AI Visibility Score</p>
                    </div>
                    <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-sm flex flex-col justify-center gap-3">
                      <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Audit Summary</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-sage-bg rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-sage">{passedCt}</div>
                          <div className="text-xs text-sage mt-0.5">Passed</div>
                        </div>
                        <div className="bg-caution-bg rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-caution">{warnCt}</div>
                          <div className="text-xs text-caution mt-0.5">Warnings</div>
                        </div>
                        <div className="bg-red-soft-bg rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-red-soft">{failCt}</div>
                          <div className="text-xs text-red-soft mt-0.5">Critical Issues</div>
                        </div>
                        <div className="bg-surface-muted rounded-xl p-3 text-center">
                          <div className="text-xl font-bold text-ink">{allChecks.length}</div>
                          <div className="text-xs text-ink-3 mt-0.5">Checks Performed</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* 5D Dimension Panels */}
            {result.dimensions.map(dim => (
              <DimensionPanel
                key={dim.id}
                dim={dim}
                checks={result.checks_by_dimension[dim.id] ?? []}
                locked={true}
              />
            ))}
          </div>
        ) : (
          /* L2: original compact layout — score ring + small cards grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="bg-surface rounded-2xl border border-divider-light p-6 text-center shadow-sm">
              <p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">AI Visibility Score</p>
              <ScoreRing score={result.overall_score} level={result.level} />
              <p className={`text-sm font-semibold mt-4 ${levelTextClass(result.level)}`}>{result.level}</p>
              <p className="text-xs text-ink-3 mt-1">AI Visibility Score</p>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.dimensions.map(dim => (
                <div key={dim.id} className="bg-surface rounded-xl border border-divider-light p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-ink-2">{DIM_LABELS[dim.id] ?? dim.name}</span>
                    <span className={`text-xs font-bold ${levelTextClass(dim.level)}`}>{dim.score}</span>
                  </div>
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${dim.score}%`, backgroundColor: levelRingColor(dim.level) }}
                    />
                  </div>
                  <p className={`text-xs mt-1.5 ${levelTextClass(dim.level)}`}>{dim.level}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pain metrics (L1) ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Missing agent card fields', value: result.pain_metrics.missing_agent_card_fields },
            { label: 'AI-readable content', value: `${result.pain_metrics.ai_readable_pct}%` },
            { label: 'Est. monthly lost mentions', value: String(result.pain_metrics.estimated_monthly_lost_mentions) },
          ].map(m => (
            <div key={m.label} className="bg-surface rounded-xl border border-divider-light p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-ink mb-1">{m.value}</div>
              <div className="text-xs text-ink-3 leading-tight">{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── Top issues ── */}
        <div className="bg-surface rounded-2xl border border-divider-light p-6 shadow-sm">
          <h3 className="font-semibold text-ink mb-4">Critical Issues Detected</h3>
          <div className="space-y-3">
            {result.top_issues.slice(0, 3).map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-canvas rounded-xl border border-divider-light/50">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${
                  issue.severity === 'critical' ? 'bg-red-soft-bg' : 'bg-caution-bg'
                }`}>
                  <svg className={`w-3 h-3 ${issue.severity === 'critical' ? 'text-red-soft' : 'text-caution'}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium">{issue.title}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{DIM_LABELS[issue.dimension] ?? issue.dimension} · {issue.severity}</p>
                </div>
              </div>
            ))}

            {/* Blurred locked items */}
            {result.top_issues.length > 3 && phase === 'l1' && (
              <div className="relative">
                <div className="space-y-3 select-none pointer-events-none">
                  {result.top_issues.slice(3).map((issue, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-canvas rounded-xl border border-divider-light/50 blur-sm">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-caution-bg flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-ink font-medium">{issue.title}</p>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-ink-2 bg-surface/90 px-3 py-1.5 rounded-full border border-divider-light shadow-sm">
                    🔒 {result.top_issues.length - 3} more issues — unlock below
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Email gate (L1 only) ── */}
        {phase === 'l1' && (
          <div className="bg-ink rounded-2xl p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-ink-inv/80 font-medium mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Full 30-check report
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Unlock your complete fix guide</h3>
            <p className="text-ink-inv/70 text-sm mb-6 max-w-sm mx-auto">
              Get the full 30-check breakdown with step-by-step fixes for each issue.
              Free — takes 5 seconds.
            </p>
            <form onSubmit={onUnlock} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                required
              />
              <button
                type="submit"
                disabled={submittingEmail}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-ink hover:bg-ink-inv font-semibold rounded-xl transition-all text-sm disabled:opacity-60 flex-shrink-0"
              >
                {submittingEmail ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Unlock'}
              </button>
            </form>
            {emailError && <p className="mt-2 text-xs text-red-300">{emailError}</p>}
            <p className="text-xs text-white/40 mt-3">No spam. Unsubscribe anytime.</p>
          </div>
        )}

        {/* ── L2: Full 30-check report ── */}
        {phase === 'l2' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-6 h-6 rounded-full bg-sage-bg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h3 className="font-semibold text-ink">Full 30-Check Breakdown</h3>
            </div>

            {Object.entries(result.checks_by_dimension).map(([dimId, checks]) =>
              checks.length > 0 ? (
                <CheckAccordion key={dimId} dimId={dimId} checks={checks} />
              ) : null
            )}

            {/* Shopify CTA */}
            {shopify ? (
              <div className="mt-8 bg-ink rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <span className="inline-block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Shopify Store Detected</span>
                  <h3 className="text-xl font-bold text-white mb-2">Fix these issues automatically</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Alignment GEO for Shopify injects structured data, robots.txt rules, and AI agent signals
                    directly into your store — no coding required.
                  </p>
                </div>
                <div className="flex flex-col gap-3 flex-shrink-0">
                  <a
                    href={result.next_steps.primary_cta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-xl hover:bg-ink-inv transition-all text-sm"
                  >
                    {result.next_steps.primary_cta.label}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <Link
                    href="/pricing/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all text-sm border border-white/20"
                  >
                    View all plans
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 bg-ink rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">Start fixing your AI visibility</h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Alignment GEO Platform gives you automated fixes, monthly rescans, and competitor tracking
                    across 58 AI platforms.
                  </p>
                </div>
                <a
                  href={result.next_steps.primary_cta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink font-semibold rounded-xl hover:bg-ink-inv transition-all text-sm flex-shrink-0"
                >
                  {result.next_steps.primary_cta.label}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            )}

            {/* Full report link */}
            <p className="text-center text-sm text-ink-3 pt-2">
              Want evidence text + auto-fix code?{' '}
              <a
                href={result.full_report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-4 hover:text-ink-2 transition-colors"
              >
                Open full dashboard report →
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page entry ────────────────────────────────────────────────────────────────

const RL_KEY = 'audit_rate_limit_reset'

export default function AIVisibilityCheckPage() {
  const [phase, setPhase] = useState<'input' | 'loading' | 'l1' | 'l2'>('input')
  const [domain, setDomain]               = useState('')
  const [result, setResult]               = useState<AuditResult | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [loadingStep, setLoadingStep]     = useState(0)
  const [email, setEmail]                 = useState('')
  const [emailError, setEmailError]       = useState<string | null>(null)
  const [submittingEmail, setSubmittingEmail] = useState(false)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [countdown, setCountdown]           = useState('')
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore rate-limit state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(RL_KEY)
    if (stored) {
      const resetAt = Number(stored)
      if (resetAt > Date.now()) {
        setRateLimitReset(resetAt)
      } else {
        localStorage.removeItem(RL_KEY)
      }
    }
  }, [])

  // Live countdown ticker
  useEffect(() => {
    if (!rateLimitReset) return
    const tick = () => {
      const remaining = rateLimitReset - Date.now()
      if (remaining <= 0) {
        setRateLimitReset(null)
        setCountdown('')
        localStorage.removeItem(RL_KEY)
        return
      }
      const h = Math.floor(remaining / 3_600_000)
      const m = Math.floor((remaining % 3_600_000) / 60_000)
      const s = Math.floor((remaining % 60_000) / 1_000)
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [rateLimitReset])

  useEffect(() => {
    if (phase === 'loading') {
      setLoadingStep(0)
      stepTimerRef.current = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
      }, 1500)
    }
    return () => { if (stepTimerRef.current) clearInterval(stepTimerRef.current) }
  }, [phase])

  async function runAudit(e: React.FormEvent) {
    e.preventDefault()

    // Cat.1 — client-side URL validation (no API call)
    if (!isValidDomain(domain)) {
      setError('Please enter a valid website URL — like apple.com or yourstore.myshopify.com')
      return
    }

    // Cat.2 — already rate limited (localStorage countdown still active)
    if (rateLimitReset && rateLimitReset > Date.now()) return

    const raw = normalizeDomain(domain)
    setError(null)
    setPhase('loading')

    try {
      const resp = await fetch(AUDIT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': AUDIT_API_KEY },
        body: JSON.stringify({ domain: raw }),
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({})) as Record<string, unknown>
        setPhase('input')

        if (resp.status === 429) {
          // Cat.2 — rate limit: parse retry_after and start countdown
          const retryAfter = (body.detail as Record<string, unknown>)?.retry_after
          const seconds = typeof retryAfter === 'number' ? retryAfter : 86400
          const resetAt = Date.now() + seconds * 1000
          localStorage.setItem(RL_KEY, String(resetAt))
          setRateLimitReset(resetAt)
        } else {
          // Cat.3 — server-side error (422, 5xx, anything else)
          setError(
            'Our servers ran into an issue. Please try again in a moment — or contact contact@alignmenttech.ai if this keeps happening.'
          )
        }
        return
      }

      const data = (await resp.json()) as AuditResult
      setResult(data)
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
      setPhase('l1')
    } catch {
      // Cat.4 — network error (fetch failed entirely)
      setError('Network error — please check your connection and try again.')
      setPhase('input')
    }
  }

  async function unlockReport(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      return
    }
    setEmailError(null)
    setSubmittingEmail(true)

    // Fire-and-forget lead capture — don't block the redirect
    fetch(LEAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, domain: result?.domain ?? '' }),
    }).catch(() => {})

    // Redirect to sign-up — user gets a real account and can access the full
    // dashboard report at /dashboard/geo-audit after registration.
    const params = new URLSearchParams({
      signup: 'true',
      email: email,
      from: 'audit',
    })
    if (result?.domain) params.set('domain', result.domain)
    window.location.href = `/login?${params.toString()}`
  }

  function reset() {
    setResult(null)
    setDomain('')
    setEmail('')
    setError(null)
    setEmailError(null)
    setPhase('input')
    // preserve rate-limit state across resets — intentional
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Shared nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-divider-light/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <LogoFull width={140} height={45} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/pricing/"
              className="hidden sm:inline-flex text-sm font-medium text-ink-2 hover:text-ink transition-colors px-3 py-2"
            >
              Pricing
            </Link>
            <Link
              href="/login/"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-ink-inv bg-ink hover:bg-[#2d2d2c] rounded-lg transition-all shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {phase === 'input' && (
          <InputSection
            domain={domain}
            setDomain={setDomain}
            onSubmit={runAudit}
            error={error}
            rateLimitCountdown={rateLimitReset ? countdown : null}
          />
        )}

        {phase === 'loading' && (
          <LoadingSection step={loadingStep} domain={normalizeDomain(domain)} />
        )}

        {(phase === 'l1' || phase === 'l2') && result && (
          <ResultSection
            result={result}
            phase={phase}
            email={email}
            setEmail={setEmail}
            emailError={emailError}
            submittingEmail={submittingEmail}
            onUnlock={unlockReport}
            onReset={reset}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
