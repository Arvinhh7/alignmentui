'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const INFRA = `${API}/api/v1/infra`
const BRAND_ID = 'shopify-client-02'

// ── Agent terminal animation lines ──────────────────────────────────────────

const AGENT_LINES = [
  { delay: 0,    type: 'system',  text: 'Consumer Agent v2.1 — Shopping Assistant' },
  { delay: 600,  type: 'blank',   text: '' },
  { delay: 900,  type: 'intent',  text: '▸ User request: "Find eco-friendly laundry pods, auto-reorder monthly"' },
  { delay: 1800, type: 'blank',   text: '' },
  { delay: 2100, type: 'call',    text: '→ POST /api/v1/infra/discover' },
  { delay: 2300, type: 'param',   text: '  intent: "eco-friendly laundry subscription products"' },
  { delay: 2500, type: 'param',   text: '  categories: ["eco-products", "home-goods"]' },
  { delay: 3200, type: 'result',  text: '← 200 OK  (0.18s)' },
  { delay: 3400, type: 'data',    text: '  results[0]: Eco Essentials Store' },
  { delay: 3600, type: 'data',    text: '  trust_score: 97%   rank: #1   capabilities: [cart, checkout]' },
  { delay: 4200, type: 'blank',   text: '' },
  { delay: 4500, type: 'call',    text: '→ POST /api/v1/infra/verify' },
  { delay: 4700, type: 'param',   text: '  brand_id: "shopify-client-02"' },
  { delay: 4900, type: 'param',   text: '  caller_agent_id: "consumer-agent-v2.1"' },
  { delay: 5600, type: 'result',  text: '← 200 OK  JWT issued  (0.09s)' },
  { delay: 5800, type: 'data',    text: '  sub: shopify-client-02   iss: alignment-infra' },
  { delay: 6000, type: 'data',    text: '  exp: +1h   scope: agent:read agent:verify' },
  { delay: 6600, type: 'blank',   text: '' },
  { delay: 7000, type: 'decide',  text: '✓ Identity verified. Proceeding with Eco Essentials Store.' },
  { delay: 7600, type: 'decide',  text: '✓ Adding "Natural Laundry Pods" to subscription cart…' },
  { delay: 8200, type: 'success', text: '✓ Order confirmed. Agent Commerce transaction complete.' },
]

// ── Telemetry data (live fetch, fallback to seed) ────────────────────────────

type AgentEntry = { agent: string; calls: number }

type TelemetryData = {
  discovery_calls: number
  conversion_rate: number
  avg_trust_score: number
  selected_count: number
  agent_breakdown: AgentEntry[]
  daily_series: { date: string; calls: number }[]
}

const FALLBACK_TELEMETRY: TelemetryData = {
  discovery_calls: 934,
  conversion_rate: 0.463,
  avg_trust_score: 0.892,
  selected_count: 422,
  agent_breakdown: [
    { agent: 'claude', calls: 282 },
    { agent: 'chatgpt', calls: 238 },
    { agent: 'perplexity', calls: 151 },
    { agent: 'gemini', calls: 108 },
    { agent: 'custom-agent', calls: 103 },
  ],
  daily_series: [],
}

// ── colour helpers ───────────────────────────────────────────────────────────

const AGENT_COLOR: Record<string, string> = {
  claude: '#a78bfa',
  chatgpt: '#34d399',
  perplexity: '#38bdf8',
  gemini: '#818cf8',
  'custom-agent': '#fb923c',
}

function agentColor(name: string) {
  return AGENT_COLOR[name] ?? '#9ca3af'
}

// ── Screen 1: Merchant POV ───────────────────────────────────────────────────

function Screen1() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-10">
      {/* Headline */}
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-3">Screen 1 — Merchant</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Your brand.<br />
          <span style={{ color: '#a78bfa' }}>Registered in the Agent Registry.</span>
        </h2>
        <p className="mt-4 text-neutral-400 text-lg max-w-xl mx-auto">
          Any AI agent—Claude, ChatGPT, Gemini—can now discover, verify, and transact with your brand.
        </p>
      </div>

      {/* Brand card */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-neutral-800 p-6"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-xl font-bold text-white">Eco Essentials Store</span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                ✓ VERIFIED
              </span>
            </div>
            <p className="text-neutral-500 text-sm">demo-shopify.myshopify.com</p>
            <p className="text-neutral-600 text-xs mt-0.5">shopify-client-02 · Trust: standard · Issued by alignment-infra</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold" style={{ color: '#a78bfa' }}>934</p>
            <p className="text-xs text-neutral-500">Agent calls · 14d</p>
          </div>
        </div>

        {/* Endpoints */}
        <div className="mb-5">
          <p className="text-xs text-neutral-600 tracking-widest uppercase mb-2">Agent Endpoints</p>
          <div className="flex flex-wrap gap-2">
            {['DISCOVER', 'PRODUCT_FEED', 'CHECKOUT'].map(ep => (
              <span
                key={ep}
                className="text-xs font-mono px-3 py-1 rounded-md"
                style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                {ep}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-neutral-800">
          {[
            { label: 'Discovery Calls', value: '934' },
            { label: 'Conversion Rate', value: '46.3%' },
            { label: 'Avg Trust Score', value: '89.2%' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Screen 2: Agent POV ──────────────────────────────────────────────────────

function Screen2({ active }: { active: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    // Reset and restart every time this screen becomes active
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []
    setVisibleCount(0)

    if (!active) return

    AGENT_LINES.forEach((line, i) => {
      const t = setTimeout(() => setVisibleCount(i + 1), line.delay)
      timerRefs.current.push(t)
    })

    return () => timerRefs.current.forEach(clearTimeout)
  }, [active])

  const lineColor = (type: string) => {
    switch (type) {
      case 'system':  return '#6b7280'
      case 'intent':  return '#e5e7eb'
      case 'call':    return '#38bdf8'
      case 'param':   return '#94a3b8'
      case 'result':  return '#34d399'
      case 'data':    return '#a78bfa'
      case 'decide':  return '#fbbf24'
      case 'success': return '#34d399'
      default:        return 'transparent'
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-3">Screen 2 — Consumer Agent</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          Watch an AI agent<br />
          <span style={{ color: '#38bdf8' }}>find your brand in real-time.</span>
        </h2>
        <p className="mt-4 text-neutral-400 text-lg">
          0.3 seconds. No human. Agent-to-Agent Commerce.
        </p>
      </div>

      {/* Terminal */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-neutral-800 overflow-hidden"
        style={{ background: '#0f1117' }}
      >
        {/* Terminal header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800"
          style={{ background: '#161b22' }}
        >
          <span className="w-3 h-3 rounded-full bg-red-500/70" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <span className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="ml-3 text-xs text-neutral-500 font-mono">consumer-agent v2.1 — agent-commerce session</span>
        </div>

        {/* Terminal body */}
        <div className="p-5 font-mono text-sm leading-relaxed min-h-[300px]">
          {AGENT_LINES.slice(0, visibleCount).map((line, i) => (
            <div key={i} style={{ color: lineColor(line.type), minHeight: line.type === 'blank' ? '0.75rem' : undefined }}>
              {line.text}
              {/* blinking cursor on the last visible line */}
              {i === visibleCount - 1 && visibleCount < AGENT_LINES.length && (
                <span
                  className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse"
                  style={{ background: lineColor(line.type), opacity: 0.8 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Screen 3: Analytics ──────────────────────────────────────────────────────

function Screen3() {
  const [data, setData] = useState<TelemetryData>(FALLBACK_TELEMETRY)

  useEffect(() => {
    fetch(`${INFRA}/telemetry/${BRAND_ID}?days=14`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {/* keep fallback */})
  }, [])

  const breakdown = [...data.agent_breakdown].sort((a, b) => b.calls - a.calls)
  const maxCalls = breakdown[0]?.calls ?? 1

  const kpis = [
    { label: 'Agent Calls', value: data.discovery_calls.toLocaleString(), color: '#a78bfa' },
    { label: 'Conversion', value: `${(data.conversion_rate * 100).toFixed(1)}%`, color: '#34d399' },
    { label: 'Avg Trust Score', value: `${(data.avg_trust_score * 100).toFixed(1)}%`, color: '#38bdf8' },
    { label: 'Selected', value: data.selected_count.toLocaleString(), color: '#fbbf24' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 gap-8">
      <div className="text-center">
        <p className="text-xs tracking-[0.25em] text-neutral-500 uppercase mb-3">Screen 3 — Business Impact</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          2 weeks after registration.<br />
          <span style={{ color: '#34d399' }}>Here&apos;s your Agent Commerce ROI.</span>
        </h2>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-3">
          {kpis.map(k => (
            <div
              key={k.label}
              className="rounded-xl border border-neutral-800 p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Agent breakdown */}
        <div
          className="rounded-xl border border-neutral-800 p-5"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <p className="text-xs text-neutral-600 tracking-widest uppercase mb-4">Agent Breakdown</p>
          <div className="space-y-3">
            {breakdown.map(({ agent, calls }) => (
              <div key={agent} className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full w-28 text-center flex-shrink-0"
                  style={{
                    background: `${agentColor(agent)}22`,
                    color: agentColor(agent),
                    border: `1px solid ${agentColor(agent)}44`,
                  }}
                >
                  {agent}
                </span>
                <div className="flex-1 bg-neutral-900 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(calls / maxCalls) * 100}%`, background: agentColor(agent) }}
                  />
                </div>
                <span className="text-sm text-neutral-400 w-8 text-right">{calls}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Demo Page ───────────────────────────────────────────────────────────

const SCREENS = ['Merchant', 'Agent', 'Analytics']

export default function DemoPage() {
  const [screen, setScreen] = useState(0)

  const prev = useCallback(() => setScreen(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setScreen(s => Math.min(SCREENS.length - 1, s + 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next])

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ background: '#0a0a0a' }}
    >
      {/* Logo + step indicator */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-tight">Alignment AI</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}
          >
            Agentic Commerce
          </span>
        </div>
        <span className="text-xs text-neutral-600 font-mono">
          {screen + 1} / {SCREENS.length}
        </span>
      </div>

      {/* Screens — fade transition */}
      <div className="w-full h-full">
        {[
          <Screen1 key="s1" />,
          <Screen2 key="s2" active={screen === 1} />,
          <Screen3 key="s3" />,
        ].map((s, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: screen === i ? 1 : 0, pointerEvents: screen === i ? 'auto' : 'none' }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Dot indicators + prev/next */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-6 pb-8">
        <button
          onClick={prev}
          disabled={screen === 0}
          className="text-neutral-600 hover:text-white transition-colors disabled:opacity-20 text-xl px-2"
          aria-label="Previous"
        >
          ←
        </button>

        <div className="flex gap-2.5">
          {SCREENS.map((name, i) => (
            <button
              key={i}
              onClick={() => setScreen(i)}
              className="flex flex-col items-center gap-1.5 group"
              aria-label={name}
            >
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width:  screen === i ? 24 : 8,
                  height: 8,
                  background: screen === i ? '#a78bfa' : '#3f3f46',
                }}
              />
              <span className={`text-[10px] font-medium transition-colors ${screen === i ? 'text-neutral-300' : 'text-neutral-700 group-hover:text-neutral-500'}`}>
                {name}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={next}
          disabled={screen === SCREENS.length - 1}
          className="text-neutral-600 hover:text-white transition-colors disabled:opacity-20 text-xl px-2"
          aria-label="Next"
        >
          →
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-5 right-8 text-xs text-neutral-700 font-mono hidden md:block">
        ← → arrow keys to navigate
      </div>
    </div>
  )
}
