'use client'

import { useMemo, useState } from 'react'
import {
  Eye, TrendingUp, ShoppingCart, Sparkles, Activity,
  ChevronRight, ArrowUpRight, Info,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Source = 'real' | 'demo' | 'modeled'
type Win = 7 | 30 | 90 | 'all'

interface TimelinePoint { date: string; rev: number; l0: number; gmv: number }
interface StepRow { label: string; value: string; blocked?: boolean; sub?: string }
interface Step {
  n: number; icon: typeof Eye; title: string; tag: string
  headline: string; unit?: string; source: Source; plain: string; rows: StepRow[]
}

// ── Data: Mar 1 → May 28 (89 days), weekly oscillation + 2 event spikes ────────
function easeOut(t: number) { return 1 - Math.pow(1 - t, 2.4) }

function makeTimeline(): TimelinePoint[] {
  const start = new Date('2026-03-01')
  const N = 89 // Mar 1 – May 28 inclusive

  // Deterministic noise, [0,1) output
  function det(i: number, seed: number): number {
    const x = Math.sin(i * seed + 1.0) * 43758.5453
    return x - Math.floor(x)
  }

  // Weekly business cycle offset (Sun=0 … Sat=6)
  function weekOsc(date: Date): number {
    return [-3.2, 1.8, 2.4, 3.0, 1.2, -0.8, -4.0][date.getDay()]
  }

  return Array.from({ length: N }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const t = i / (N - 1)
    const wo = weekOsc(d)

    // L0: 52→84 trend + weekly osc + noise + 2 Gaussian event spikes
    // Spike 1 at day 21 (Mar 22) +9 pts; spike 2 at day 49 (Apr 19) +6 pts
    let l0 = 52 + 32 * easeOut(t)
    l0 += wo * 0.65
    l0 += (det(i, 127.1) - 0.5) * 3.2
    l0 += 9 * Math.exp(-((i - 21) ** 2) / 9)
    l0 += 6 * Math.exp(-((i - 49) ** 2) / 7)
    l0 = Math.round(Math.max(44, Math.min(100, l0)))

    // GCI: 30→67 trend, 10-day lag + weekly osc + noise + lagged spike responses
    // Response to spike 1 peaks ~day 32 (Apr 1); spike 2 peaks ~day 60 (Apr 29)
    const tLag = i <= 10 ? 0 : (i - 10) / (N - 11)
    let rev = 30 + 37 * easeOut(tLag)
    rev += wo * 0.38
    rev += (det(i, 211.3) - 0.5) * 2.4
    rev += 6 * Math.exp(-((i - 32) ** 2) / 9)
    rev += 4 * Math.exp(-((i - 60) ** 2) / 7)
    rev = Math.round(Math.max(24, Math.min(100, rev)))

    // GMV: sparse bars from day 25+, density and size grow over time
    // Fewer weekend orders (wo < -1 suppressed)
    let gmv = 0
    if (i >= 25 && wo > -1) {
      const prob = 0.36 + 0.28 * easeOut((i - 25) / (N - 26))
      if (det(i, 89.7) < prob) {
        const base = 60 + 170 * easeOut((i - 25) / (N - 26))
        gmv = Math.round(base * (0.65 + det(i, 173.1) * 0.7))
      }
    }

    return { date: d.toISOString().slice(0, 10), rev, l0, gmv }
  })
}
const TIMELINE = makeTimeline()

// ── Attribution snapshot ────────────────────────────────────────────────────────
const SNAP = { score: 67, delta: 8 }

// ── Journey steps (attribution framing — no fabricated $ in L3) ───────────────
const JOURNEY: Step[] = [
  {
    n: 1, icon: Eye, title: 'Visibility', tag: 'L0 · Foundation',
    headline: '84', unit: '/100', source: 'real',
    plain: 'How often AI engines mention your brand when people ask.',
    rows: [
      { label: 'Mention rate', value: '76%' },
      { label: 'Prompt yield', value: '65%' },
      { label: 'Citation coverage', value: '71%' },
    ],
  },
  {
    n: 2, icon: TrendingUp, title: 'GA4', tag: 'L1 · Referral traffic',
    headline: '2,847', unit: ' sessions', source: 'demo',
    plain: 'Visitors arriving from AI engines, tracked in your GA4 property.',
    rows: [
      { label: 'Share of total traffic', value: '12.3%' },
      { label: 'Avg pages / visit', value: '4.2' },
      { label: 'Conversion rate', value: 'connect GA4', blocked: true },
    ],
  },
  {
    n: 3, icon: ShoppingCart, title: 'Agentic Revenue', tag: 'L2 · Shopify orders',
    headline: '0', unit: ' orders', source: 'demo',
    plain: 'Orders with a verified AI touchpoint, extracted from your Shopify store.',
    rows: [
      { label: 'AI-attributed orders', value: '0', sub: 'read_orders ✅ · awaiting real data' },
      { label: 'AI customer AOV', value: '—' },
      { label: 'New customer ratio', value: '—' },
    ],
  },
  {
    n: 4, icon: Sparkles, title: 'AI-influenced', tag: 'L3 · Dark funnel',
    headline: '~28–45', unit: '%', source: 'modeled',
    plain: 'Estimated share of direct + branded revenue uplift attributable to AI. Cannot be click-traced — modeled only.',
    rows: [
      { label: 'Direct traffic lift', value: 'connect GSC', blocked: true },
      { label: 'Branded search trend', value: 'connect GSC', blocked: true },
      { label: 'Survey multiplier k', value: 'add survey', blocked: true },
    ],
  },
]

// ── Score bands ───────────────────────────────────────────────────────────────
const BANDS = [
  { label: 'Dormant',     max: 25,  note: 'AI barely touches revenue yet' },
  { label: 'Emerging',    max: 50,  note: 'AI is starting to influence buyers' },
  { label: 'Converting',  max: 75,  note: 'AI is a working attribution channel' },
  { label: 'Compounding', max: 100, note: 'AI is a self-reinforcing growth driver' },
]
function getBand(score: number) {
  return BANDS.find(b => score <= b.max) ?? BANDS[BANDS.length - 1]
}

// ── Source badge ─────────────────────────────────────────────────────────────
const SRC: Record<Source, { dot: string; label: string; cls: string }> = {
  real:    { dot: '●', label: 'live',      cls: 'bg-sage-bg text-sage' },
  demo:    { dot: '○', label: 'demo data', cls: 'bg-surface-warm text-ink-3' },
  modeled: { dot: '◇', label: 'estimated', cls: 'bg-caution-bg text-caution' },
}
function SourceBadge({ src }: { src: Source }) {
  const c = SRC[src]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.cls}`}>
      {c.dot} {c.label}
    </span>
  )
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function catmull(pts: { x: number; y: number }[], t = 0.18): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i]
    const p2 = pts[Math.min(i + 1, pts.length - 1)], p3 = pts[Math.min(i + 2, pts.length - 1)]
    d += ` C${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`
  }
  return d
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function fmtLabel(s: string, win: Win): string {
  const [, m, d] = s.split('-')
  if (win === 7) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(s).getDay()]
  if (win === 'all') return MONTHS[+m - 1]
  return `${MONTHS[+m - 1]} ${+d}`
}
function labelInterval(n: number): number {
  if (n <= 8) return 1
  if (n <= 30) return 5
  if (n <= 90) return 15
  return 20
}

// ── Dual-axis timeline chart ───────────────────────────────────────────────────
function Timeline({ data, win }: { data: TimelinePoint[]; win: Win }) {
  const W = 820, H = 220, PT = 16, PX_L = 42, PX_R = 52
  const plotW = W - PX_L - PX_R, n = data.length
  const xOf = (i: number) => PX_L + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2)
  const yL = (v: number) => PT + H - (v / 100) * H

  const gmvMax = Math.max(...data.map(d => d.gmv))
  const hasGmv = gmvMax > 0
  const gmvCeil = Math.max(400, Math.ceil(gmvMax / 100) * 100)
  const yR = (v: number) => PT + H - (v / gmvCeil) * H

  const revPts = data.map((d, i) => ({ x: xOf(i), y: yL(d.rev) }))
  const l0Pts  = data.map((d, i) => ({ x: xOf(i), y: yL(d.l0) }))
  const revPath = catmull(revPts), l0Path = catmull(l0Pts)
  const area = `${revPath} L${xOf(n - 1)},${PT + H} L${PX_L},${PT + H} Z`

  const interval = labelInterval(n)
  const labelIdxs: number[] = []
  for (let i = 0; i < n; i += interval) labelIdxs.push(i)
  if (labelIdxs[labelIdxs.length - 1] !== n - 1) labelIdxs.push(n - 1)

  const barW = Math.max(2, Math.min(10, (plotW / Math.max(n, 1)) * 0.68))
  const rightTicks = [0, Math.round(gmvCeil / 2), gmvCeil]

  return (
    <svg viewBox={`0 0 ${W} ${PT + H + 28}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="gci-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1A1A1A" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1A1A1A" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Axis titles */}
      <text x={14} y={PT + H / 2} textAnchor="middle"
        transform={`rotate(-90 14 ${PT + H / 2})`}
        fill="#A39B8D" fontSize="9" fontFamily="system-ui, sans-serif">GCI Score (0–100)</text>
      {hasGmv && (
        <text x={W - 14} y={PT + H / 2} textAnchor="middle"
          transform={`rotate(90 ${W - 14} ${PT + H / 2})`}
          fill="#4A7C59" fontSize="9" fontFamily="system-ui, sans-serif" opacity={0.75}>Order GMV ($)</text>
      )}

      {/* Left grid + ticks */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={PX_L} y1={yL(v)} x2={W - PX_R} y2={yL(v)} stroke="#EDEAE4" strokeWidth="1" />
          <text x={PX_L - 6} y={yL(v) + 3.5} textAnchor="end" fill="#B0A898" fontSize="9" fontFamily="system-ui, sans-serif">{v}</text>
        </g>
      ))}

      {/* Right axis ticks (GMV) */}
      {hasGmv && rightTicks.map(v => (
        <text key={v} x={W - PX_R + 6} y={yR(v) + 3.5} textAnchor="start"
          fill="#4A7C59" fontSize="9" fontFamily="system-ui, sans-serif" opacity={0.7}>${v}</text>
      ))}

      {/* GMV bars — rendered first (behind lines) */}
      {data.map((d, i) => {
        if (!d.gmv) return null
        const bh = (d.gmv / gmvCeil) * H
        return <rect key={i} x={xOf(i) - barW / 2} y={PT + H - bh} width={barW} height={bh} rx={2} fill="#4A7C59" opacity={0.7} />
      })}

      {/* Area fill */}
      <path d={area} fill="url(#gci-grad)" />

      {/* L0 visibility — dashed sage */}
      <path d={l0Path} fill="none" stroke="#4A7C59" strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" />

      {/* GCI score — solid black */}
      <path d={revPath} fill="none" stroke="#1A1A1A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

      {/* End-of-line value labels */}
      {revPts.length > 0 && (
        <text x={revPts[revPts.length - 1].x - 5} y={revPts[revPts.length - 1].y - 7}
          textAnchor="end" fill="#1A1A1A" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif">
          {data[data.length - 1].rev}
        </text>
      )}
      {l0Pts.length > 0 && (
        <text x={l0Pts[l0Pts.length - 1].x - 5} y={l0Pts[l0Pts.length - 1].y - 7}
          textAnchor="end" fill="#4A7C59" fontSize="11" fontWeight="600" fontFamily="system-ui, sans-serif">
          {data[data.length - 1].l0}
        </text>
      )}

      {/* X-axis labels */}
      {labelIdxs.map(i => (
        <text key={i} x={xOf(i)} y={PT + H + 18} textAnchor="middle"
          fill="#B0A898" fontSize="9" fontFamily="system-ui, sans-serif">
          {fmtLabel(data[i].date, win)}
        </text>
      ))}
    </svg>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ step, className = '' }: { step: Step; className?: string }) {
  const Icon = step.icon
  return (
    <div className={`bg-surface border border-divider-light rounded-2xl p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-canvas flex items-center justify-center text-ink-2">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-ink-3">Step {step.n}</div>
            <div className="text-xs font-semibold text-ink leading-tight">{step.title}</div>
          </div>
        </div>
        <SourceBadge src={step.source} />
      </div>

      <div className="text-[10px] text-ink-3">{step.tag}</div>

      <div className="text-3xl font-bold text-ink tracking-tight leading-none">
        {step.headline}
        {step.unit && <span className="text-sm font-normal text-ink-3 ml-0.5">{step.unit}</span>}
      </div>

      <p className="text-[11px] text-ink-3 leading-snug">{step.plain}</p>

      <div className="space-y-2 pt-2 border-t border-divider-light">
        {step.rows.map((r, i) => (
          <div key={i} className="flex items-start justify-between gap-2">
            <span className="text-[11px] text-ink-3 shrink-0">{r.label}</span>
            <span className={`text-[11px] font-medium tabular-nums text-right ${r.blocked ? 'text-ink-3 opacity-40 italic font-normal' : 'text-ink'}`}>
              {r.value}
              {r.sub && <span className="block text-[10px] text-ink-3 font-normal not-italic">{r.sub}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const WIN_OPTS: { key: Win; label: string }[] = [
  { key: 7,     label: '7d'  },
  { key: 30,    label: '30d' },
  { key: 90,    label: '90d' },
  { key: 'all', label: 'All' },
]

export default function GCIPage() {
  const [win, setWin] = useState<Win>('all')
  const data = useMemo(() => win === 'all' ? TIMELINE : TIMELINE.slice(-win), [win])
  const b = getBand(SNAP.score)
  const liveCount = JOURNEY.filter(s => s.source === 'real').length

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Header ── */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center">
              <Activity className="w-5 h-5 text-ink-inv" />
            </div>
            <div>
              <h1 className="heading-dash">GEO Commercialization Index</h1>
              <p className="text-sm text-ink-3">How much of your revenue can be attributed to AI?</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-caution-bg border border-caution/20">
            <Info className="w-3.5 h-3.5 text-caution" />
            <span className="text-xs text-caution font-medium">Demo · {liveCount} of 4 signals live</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-6xl mx-auto">

        {/* ── 1. Verdict ── */}
        <div className="bg-surface border border-divider-light rounded-2xl p-6">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-[260px]">
              <p className="text-[10px] text-ink-3 uppercase tracking-widest mb-3">Attribution confidence · last 30 days</p>
              <p className="text-2xl font-semibold text-ink leading-snug">
                GCI <span className="font-bold">{SNAP.score}</span> — you&apos;re in the{' '}
                <span className="font-bold">{b.label}</span> stage.
              </p>
              <p className="text-sm text-ink-3 mt-2 leading-relaxed max-w-lg">
                {b.note}. Connect the remaining {4 - liveCount} signals to raise confidence and sharpen attribution.
              </p>
              {/* Signal dots */}
              <div className="flex flex-wrap gap-3 mt-4">
                {JOURNEY.map(s => (
                  <div key={s.n} className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-medium ${SRC[s.source].cls} px-1.5 py-0.5 rounded-full`}>
                      {SRC[s.source].dot}
                    </span>
                    <span className="text-xs text-ink-2">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score + band */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="flex items-end gap-1.5">
                <span className="text-6xl font-bold text-ink tracking-tighter leading-none">{SNAP.score}</span>
                <div className="mb-1 flex flex-col gap-0.5">
                  <span className="text-ink-3 text-sm">/100</span>
                  <span className="flex items-center gap-0.5 text-sage text-xs font-semibold">
                    <ArrowUpRight className="w-3 h-3" />+{SNAP.delta}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                {BANDS.map(bd => {
                  const active = bd.label === b.label
                  return (
                    <div key={bd.label} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-1.5 rounded-full ${active ? 'bg-ink' : 'bg-divider-light'}`} />
                      <span className={`text-[8px] font-medium ${active ? 'text-ink' : 'text-ink-3'}`}>{bd.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Journey funnel ── */}
        <div>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-ink">How AI turns into revenue</h2>
            <p className="text-xs text-ink-3 mt-0.5">
              Each step is a separate measurement with different certainty — they can&apos;t be added up.
            </p>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
            {JOURNEY.flatMap((step, i) => {
              const els = [
                <StepCard key={`step-${step.n}`} step={step} className="flex-1" />,
              ]
              if (i < JOURNEY.length - 1) {
                els.push(
                  <div key={`sep-${step.n}`} className="hidden lg:flex items-center justify-center shrink-0 w-5">
                    <ChevronRight className="w-4 h-4 text-ink-3" />
                  </div>,
                )
              }
              return els
            })}
          </div>
        </div>

        {/* ── 3. GCI timeline ── */}
        <div className="bg-surface border border-divider-light rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-ink">GCI score over time</h2>
              <p className="text-xs text-ink-3 mt-1 leading-relaxed max-w-2xl">
                <span className="text-sage font-medium">Visibility</span> (green dashed) leads by ~10 days before{' '}
                <span className="font-semibold">GCI</span> (black) follows — that lag is evidence of a causal link.
                Green bars = Shopify orders with an AI touchpoint.
              </p>
            </div>
            <div className="flex shrink-0 bg-canvas rounded-lg p-0.5">
              {WIN_OPTS.map(opt => (
                <button key={String(opt.key)} onClick={() => setWin(opt.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    win === opt.key ? 'bg-ink text-ink-inv shadow-sm' : 'text-ink-3 hover:text-ink'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Timeline data={data} win={win} />

          <div className="flex flex-wrap items-center gap-5 mt-2 text-[11px] text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-[2.8px] border-[#1A1A1A] rounded" />
              GCI score (left axis)
            </span>
            <span className="flex items-center gap-1.5 text-sage">
              <span className="inline-block w-5 border-t-2 border-dashed border-sage" />
              Visibility — leads (left axis)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-sage opacity-70" />
              AI-traced orders — GMV $ (right axis)
            </span>
          </div>
        </div>

        {/* ── 4. How to read ── */}
        <div className="bg-canvas border border-divider-light rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">How to read GCI</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-ink">Score is climbing ↑</div>
              <p className="text-[11px] text-ink-3 leading-relaxed">AI is becoming a measurable attribution channel. Keep improving the content that gets cited (Step 1 Visibility).</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-ink">Visibility rises but GCI is flat</div>
              <p className="text-[11px] text-ink-3 leading-relaxed">AI sees you but traffic or orders aren&apos;t following. Check which funnel step drops off — that&apos;s the conversion leak.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-ink">To tighten attribution</div>
              <p className="text-[11px] text-ink-3 leading-relaxed">Connect {4 - liveCount} more signals: GA4 (L1), Shopify orders (L2), post-purchase survey (L3). Each pipe raises confidence and narrows the estimate.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
