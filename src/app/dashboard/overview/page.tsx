'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import {
  api,
  MonitorScanResult,
  MonitorPrompt,
  CreditBalance,
  AuditResult,
} from '@/lib/api'
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Shield,
  PenTool, MessageSquare, Bot, Zap, ArrowRight,
  Sparkles, AlertTriangle, CheckCircle2,
  RefreshCw, Clock, Target,
  ChevronRight, Eye, BookOpen, Activity,
} from 'lucide-react'
import { OverviewSkeleton } from '@/components/Skeleton'

// ─── Local storage keys (shared with monitor page) ────────────────────────────
const BRAND_CONFIG_KEY = 'alignment_monitor_brand_config'
const SCAN_RESULTS_KEY = 'alignment_monitor_scan_results'
const AUDIT_RESULT_KEY = 'alignment_geo_audit_result'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopicRow {
  topic: string
  intent: string
  rank: number | null
  visibility: boolean
  citationPct: number
  status: 'leader' | 'improve' | 'missing'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalScanResult(): MonitorScanResult | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SCAN_RESULTS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getLocalAuditResult(): AuditResult | null {
  if (typeof window === 'undefined') return null
  try {
    // Geo-audit page saves to 'geo_audit_session' as { url, auditingUrl, auditResult }
    const session = localStorage.getItem('geo_audit_session')
    if (session) {
      const parsed = JSON.parse(session)
      if (parsed?.auditResult) return parsed.auditResult
    }
    // Fallback to legacy key
    const raw = localStorage.getItem(AUDIT_RESULT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function getBrandConfig(): { brandName: string; domain: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BRAND_CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}


function buildTopicRows(scan: MonitorScanResult): TopicRow[] {
  if (!scan.per_prompt_metrics) return []
  return Object.entries(scan.per_prompt_metrics).slice(0, 8).map(([, metrics]) => {
    const visible = metrics.visibility
    const quality = metrics.quality_score ?? 0
    // Derive a simple rank guess from quality
    const rank = visible ? (quality >= 0.8 ? 1 : quality >= 0.5 ? 2 : 3) : null
    const status: TopicRow['status'] = visible && quality >= 0.7
      ? 'leader'
      : visible
      ? 'improve'
      : 'missing'
    return {
      topic: metrics.prompt_template?.replace('{brand}', '').trim() ?? 'Unknown',
      intent: 'info_cognition',
      rank,
      visibility: visible,
      citationPct: Math.round((metrics.quality_score ?? 0) * 100),
      status,
    }
  })
}

const STATUS_STYLES: Record<TopicRow['status'], { dot: string; label: string; bg: string; text: string }> = {
  leader:  { dot: 'bg-emerald-400', label: 'Leader',  bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  improve: { dot: 'bg-amber-400',   label: 'Improve', bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  missing: { dot: 'bg-red-400',     label: 'Missing', bg: 'bg-red-500/10',     text: 'text-red-400' },
}

const INTENT_COLORS: Record<string, string> = {
  info_cognition:    'bg-blue-500/10 text-blue-400',
  solution_explore:  'bg-teal-500/10 text-teal-400',
  comparison_decision: 'bg-purple-500/10 text-purple-400',
  action_choice:     'bg-orange-500/10 text-orange-400',
}

// ─── Share of Voice Bar ────────────────────────────────────────────────────────
const BRAND_COLORS = ['#ef4444','#22c55e','#f59e0b','#3b82f6','#a855f7','#6366f1','#14b8a6','#ec4899']

interface SovEntry { name: string; pct: number; isYou: boolean; color: string }

function SovBarUI({ entries }: { entries: SovEntry[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-bold text-gray-900">Share of Voice</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">AI mentions compared to competitors</p>
        </div>
        <Link href="/dashboard/geo-monitor" className="flex items-center gap-1 text-[12px] text-red-500 font-semibold hover:text-red-600 transition-colors">
          Full analysis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {/* Stacked bar */}
      <div className="flex h-8 rounded-xl overflow-hidden mb-4 gap-px">
        {entries.map(entry => (
          <div
            key={entry.name}
            className="flex items-center justify-center transition-all"
            style={{ width: `${entry.pct}%`, backgroundColor: entry.color, minWidth: entry.pct > 3 ? undefined : '4px' }}
            title={`${entry.name}: ${entry.pct}%`}
          >
            {entry.pct > 8 && <span className="text-[10px] font-bold text-white truncate px-1">{entry.pct}%</span>}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4">
        {entries.map(entry => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className={`text-[11px] ${entry.isYou ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
              {entry.name} {entry.isYou && '(You)'}
            </span>
            <span className="text-[11px] text-gray-400">{entry.pct}%</span>
          </div>
        ))}
      </div>
      {/* Ranking table */}
      <div className="pt-4 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-gray-400 w-4 text-right flex-shrink-0">#{i + 1}</span>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0" style={{ backgroundColor: entry.color }}>
                {entry.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[12px] truncate ${entry.isYou ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {entry.name}{entry.isYou && <span className="ml-1 text-[9px] text-red-500 font-bold">YOU</span>}
                  </span>
                  <span className="text-[11px] font-bold text-gray-600 ml-2 flex-shrink-0">{entry.pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${entry.pct}%`, backgroundColor: entry.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SovBar({ brandName, scan }: { brandName: string; scan: MonitorScanResult }) {
  const normalizedBrand = (brandName || scan.brand_name).toLowerCase().trim()
  const sovMap = scan.share_of_voice ?? {}

  // Use share_of_voice map EXCLUSIVELY — identical source as Answer Engine tab
  // This ensures numbers match across all dashboard panels
  let entries: SovEntry[] = Object.entries(sovMap)
    .map(([name, rawPct], i) => ({
      name,
      pct: Math.round(rawPct as number),
      isYou: name.toLowerCase().trim() === normalizedBrand,
      color: name.toLowerCase().trim() === normalizedBrand
        ? BRAND_COLORS[0]
        : BRAND_COLORS[(i % (BRAND_COLORS.length - 1)) + 1],
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6)

  // Fallback: if share_of_voice map is empty, derive from competitor_comparison
  if (entries.length === 0) {
    const comps = (scan.competitor_comparison ?? [])
      .filter(c => c.name.toLowerCase().trim() !== normalizedBrand)
      .slice(0, 5)
    if (comps.length === 0) return null
    // Use raw visibility_pct — do NOT renormalize (matches Monitor page raw numbers)
    entries = [
      {
        name: brandName || scan.brand_name,
        pct: Math.round(scan.visibility_score),
        isYou: true,
        color: BRAND_COLORS[0],
      },
      ...comps.map((c, i) => ({
        name: c.name,
        pct: Math.round(c.visibility_pct ?? 0),
        isYou: false,
        color: BRAND_COLORS[(i % (BRAND_COLORS.length - 1)) + 1],
      })),
    ].sort((a, b) => b.pct - a.pct)
  }

  if (entries.every(e => e.pct === 0)) return null
  return <SovBarUI entries={entries} />
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, trend, trendLabel, color, icon: Icon,
}: {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-4.5 h-4.5" strokeWidth={2} />
        </div>
        {trend && trendLabel && (
          <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            trend === 'up'      ? 'bg-emerald-50 text-emerald-600'
            : trend === 'down' ? 'bg-red-50 text-red-500'
            : 'bg-gray-100 text-gray-500'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trendLabel}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      <p className="text-[12px] text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  )
}

// ─── Quick Action CTA ─────────────────────────────────────────────────────────
function ActionCard({
  icon: Icon, iconColor, label, description, href, badge,
}: {
  icon: React.ElementType
  iconColor: string
  label: string
  description?: string
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-gray-800">{label}</span>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{badge}</span>
          )}
        </div>
        {description && <p className="text-[11px] text-gray-500 truncate">{description}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
    </Link>
  )
}

// ─── Mini Trend Line (SVG) ────────────────────────────────────────────────────
function TrendLine({ data, color = '#ef4444' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const W = 260, H = 64, PAD = 4
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${W - PAD},${H} L ${PAD},${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#trendGrad)" />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle
        cx={parseFloat(pts[pts.length - 1].split(',')[0])}
        cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r="3" fill={color}
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [scanResult, setScanResult] = useState<MonitorScanResult | null>(null)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [prompts, setPrompts] = useState<MonitorPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [brandName, setBrandName] = useState('')
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [visibilityHistory, setVisibilityHistory] = useState<Array<{ date: string; score: number }>>([])

  // Load data from localStorage + API
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const localScan = getLocalScanResult()
      const localAudit = getLocalAuditResult()
      const brandConfig = getBrandConfig()

      if (localScan) setScanResult(localScan)
      if (localAudit) setAuditResult(localAudit)
      if (brandConfig?.brandName) setBrandName(brandConfig.brandName)

      const [promptsRes, creditsRes] = await Promise.allSettled([
        api.getMonitorPrompts(true),
        user?.id ? api.getCredits(user.id) : Promise.resolve({ data: null }),
      ])

      if (promptsRes.status === 'fulfilled' && promptsRes.value.data) {
        setPrompts(promptsRes.value.data)
      }
      if (creditsRes.status === 'fulfilled' && creditsRes.value.data) {
        setCredits(creditsRes.value.data)
      }

      // Load scan history for trend line
      const targetBrand = brandConfig?.brandName || localScan?.brand_name
      if (targetBrand) {
        const historyRes = await api.getMonitorHistory(targetBrand, '30d')
        if (historyRes.data && historyRes.data.length > 0) {
          const history = historyRes.data
          // Use the latest scan if no local scan cached
          if (!localScan) {
            setScanResult(history[0])
            setLastScanned(history[0].scanned_at)
          }
          // Build trend from history (oldest → newest, last 10 scans max)
          const trend = [...history].reverse().slice(-10).map(s => ({
            date: s.scanned_at,
            // visibility_score is 0-100 (percentage)
            score: Math.round(s.visibility_score),
          }))
          setVisibilityHistory(trend)
        }
      } else if (localScan?.scanned_at) {
        setLastScanned(localScan.scanned_at)
        setVisibilityHistory([{ date: localScan.scanned_at, score: Math.round(localScan.visibility_score) }])
      }
    } catch { /* non-critical */ } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const handler = async () => {
      if (!user?.id) return
      const res = await api.getCredits(user.id)
      if (res.data) setCredits(res.data)
    }
    window.addEventListener('creditsUsed', handler)
    return () => window.removeEventListener('creditsUsed', handler)
  }, [user?.id])

  // Reload when Monitor/Audit complete, or user navigates back to this tab
  useEffect(() => {
    const onUpdate = () => loadData()
    const onVisible = () => { if (document.visibilityState === 'visible') loadData() }
    window.addEventListener('scanCompleted', onUpdate)
    window.addEventListener('auditCompleted', onUpdate)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('scanCompleted', onUpdate)
      window.removeEventListener('auditCompleted', onUpdate)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadData])

  // ── Computed metrics ────────────────────────────────────────────────────────
  const auditScore = auditResult?.overall_score ?? null

  // visibility_score is already 0-100 (percentage). Do NOT multiply by 100.
  const visibilityScore = scanResult ? Math.round(scanResult.visibility_score) : null

  const citationCount = scanResult?.citation_count ?? null

  // Share of Voice: read directly from share_of_voice map (already 0-100)
  const sovPct = scanResult
    ? Math.round(scanResult.share_of_voice?.[brandName] ?? scanResult.share_of_voice?.[scanResult.brand_name] ?? 0)
    : null

  // Trend delta: compare latest vs previous scan
  const trendDelta = visibilityHistory.length >= 2
    ? visibilityHistory[visibilityHistory.length - 1].score - visibilityHistory[visibilityHistory.length - 2].score
    : null

  const topicRows = scanResult ? buildTopicRows(scanResult) : []
  const promptsUsed = prompts.length

  const creditsRemaining = credits?.credits_remaining ?? 0
  const creditsTotal = credits?.credits_total ?? 0

  // ── Format last scanned ─────────────────────────────────────────────────────
  const lastScannedLabel = lastScanned
    ? (() => {
        const diff = Date.now() - new Date(lastScanned).getTime()
        const hours = Math.floor(diff / 3600000)
        if (hours < 1) return 'Just now'
        if (hours < 24) return `${hours}h ago`
        return `${Math.floor(hours / 24)}d ago`
      })()
    : null

  // ── Strongest & weakest audit dimensions ────────────────────────────────────
  const dims = auditResult ? [
    auditResult.ai_accessibility,
    auditResult.semantic_structure,
    auditResult.content_citability,
    auditResult.risk_boundary,
    auditResult.reusability,
  ].filter(Boolean) : []
  const strongestDim = dims.length ? dims.reduce((a, b) => a.score > b.score ? a : b) : null
  const weakestDim = dims.length ? dims.reduce((a, b) => a.score < b.score ? a : b) : null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OverviewSkeleton />
      </div>
    )
  }

  // ── No data state (3-step Getting Started) ──────────────────────────────────
  if (!scanResult && !auditResult) {
    const STEPS = [
      {
        step: 1, done: false,
        icon: BookOpen, iconBg: 'bg-orange-50', iconColor: 'text-orange-600',
        title: 'Set up your Brand Hub',
        desc: 'Add your brand name, domain, and keywords so AI engines know who you are.',
        cta: 'Configure Brand', href: '/dashboard/brand-hub', ctaStyle: 'bg-orange-500 hover:bg-orange-600',
      },
      {
        step: 2, done: false,
        icon: MessageSquare, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
        title: 'Add tracking prompts',
        desc: 'Write discovery queries — the way real users ask AI. These power your visibility scans.',
        cta: 'Manage Prompts', href: '/dashboard/prompts', ctaStyle: 'bg-blue-500 hover:bg-blue-600',
      },
      {
        step: 3, done: false,
        icon: Activity, iconBg: 'bg-red-50', iconColor: 'text-red-600',
        title: 'Run your first AI scan',
        desc: "See where your brand appears across ChatGPT, Perplexity, and Google's AI. Takes ~2 minutes.",
        cta: 'Run First Scan', href: '/dashboard/geo-monitor', ctaStyle: 'bg-red-500 hover:bg-red-600',
      },
    ]

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.overviewTitle}</h1>
            <p className="text-gray-500 mt-1 text-sm">{t.dashboard.overviewSubtitle}</p>
          </div>

          {/* Hero empty state */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-10 text-center mb-8 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)',
            }} />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Welcome to Alignment AI</h2>
              <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
                Track how AI engines like ChatGPT, Perplexity, and Google AI mention your brand.
                Follow the 3 steps below to get started.
              </p>
            </div>
          </div>

          {/* 3-step guide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                {/* Step number */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500">{s.step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-gray-100" />
                  )}
                </div>
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${s.iconBg}`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} strokeWidth={2} />
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 mb-1.5">{s.title}</h3>
                <p className="text-[12px] text-gray-500 leading-relaxed flex-1">{s.desc}</p>
                <Link
                  href={s.href}
                  className={`mt-4 flex items-center justify-center gap-1.5 ${s.ctaStyle} text-white text-[12px] font-bold px-4 py-2.5 rounded-xl transition-colors`}
                >
                  {s.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-blue-900 mb-1">Also try: GEO Audit</p>
                <p className="text-[12px] text-blue-700 leading-relaxed mb-3">
                  Analyze your website's AI-readiness score without running a scan. Identify structured data gaps and citation opportunities.
                </p>
                <Link href="/dashboard/geo-audit" className="text-[12px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Run GEO Audit <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-3">
              <Bot className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-purple-900 mb-1">Explore AI Agents</p>
                <p className="text-[12px] text-purple-700 leading-relaxed mb-3">
                  Automate GEO analysis, generate AI-cited content, and monitor competitor visibility — all from preset agent templates.
                </p>
                <Link href="/dashboard/agents" className="text-[12px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1">
                  Browse Agents <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.overviewTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">{t.dashboard.overviewSubtitle}</p>
              {brandName && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm font-semibold text-gray-700">{brandName}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastScannedLabel && (
              <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Last scan: {lastScannedLabel}</span>
              </div>
            )}
            <Link
              href="/dashboard/geo-monitor"
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold px-3.5 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Scan
            </Link>
          </div>
        </div>

        {/* ── Visibility Score Hero ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT (65%): Big number + trend chart */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Visibility Score</p>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-5xl font-bold text-gray-900 leading-none">
                  {visibilityScore !== null ? `${visibilityScore}%` : '—'}
                </span>
                {trendDelta !== null && (
                  <span className={`flex items-center gap-0.5 text-[14px] font-semibold mb-1.5 ${
                    trendDelta > 0 ? 'text-emerald-500' : trendDelta < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {trendDelta > 0 ? <TrendingUp className="w-4 h-4" /> : trendDelta < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {trendDelta > 0 ? '+' : ''}{trendDelta}%
                  </span>
                )}
              </div>
              <p className="text-[13px] text-gray-500 mb-4">
                {visibilityScore !== null
                  ? visibilityScore >= 50
                    ? 'Your brand is frequently cited by AI engines'
                    : 'Room to grow — optimize content and prompts'
                  : 'Run a scan to measure AI visibility'}
              </p>

              {/* Trend line chart — full width of left panel */}
              <div className="w-full">
                {visibilityHistory.length >= 2 ? (
                  <div className="w-full overflow-hidden">
                    <svg
                      viewBox="0 0 500 80"
                      className="w-full"
                      preserveAspectRatio="none"
                      style={{ height: '80px' }}
                    >
                      <defs>
                        <linearGradient id="trendGradHero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const scores = visibilityHistory.map(h => h.score)
                        const W = 500, H = 80, PAD = 6
                        const min = Math.min(...scores), max = Math.max(...scores)
                        const range = max - min || 1
                        const pts = scores.map((v, i) => {
                          const x = PAD + (i / (scores.length - 1)) * (W - PAD * 2)
                          const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
                          return `${x},${y}`
                        })
                        const pathD = `M ${pts.join(' L ')}`
                        const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${W - PAD},${H} L ${PAD},${H} Z`
                        const lastPt = pts[pts.length - 1].split(',')
                        return (
                          <>
                            <path d={areaD} fill="url(#trendGradHero)" />
                            <path d={pathD} stroke="#ef4444" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx={parseFloat(lastPt[0])} cy={parseFloat(lastPt[1])} r="4" fill="#ef4444" />
                          </>
                        )
                      })()}
                    </svg>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-gray-400">
                        {new Date(visibilityHistory[0].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(visibilityHistory[visibilityHistory.length - 1].date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-16 flex items-center border border-dashed border-gray-200 rounded-xl px-4">
                    <p className="text-[11px] text-gray-400 italic">Run multiple scans to see visibility trend</p>
                  </div>
                )}
              </div>

              {/* Audit score inline hint */}
              <div className="mt-3">
                {auditScore !== null ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] text-gray-600">
                      GEO Audit: <span className="font-bold text-emerald-600">{auditScore}/100</span>
                      {weakestDim && <span className="text-red-500"> · Priority fix: {weakestDim.name}</span>}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="text-[11px] text-gray-600">
                      No audit yet —{' '}
                      <Link href="/dashboard/geo-audit" className="font-semibold text-red-500 hover:text-red-600">run GEO Audit</Link>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-100 self-stretch" />

            {/* RIGHT (35%): Improve Visibility — compact single-column list */}
            <div className="lg:w-[260px] flex-shrink-0">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t.dashboard.improveScore}</h3>
              <div className="flex flex-col gap-0.5">
                <ActionCard
                  icon={Zap}
                  iconColor="bg-red-50 text-red-600"
                  label={t.dashboard.fixIssues}
                  description={weakestDim ? weakestDim.name : 'AI-readiness score'}
                  href="/dashboard/geo-audit"
                />
                <ActionCard
                  icon={PenTool}
                  iconColor="bg-purple-50 text-purple-600"
                  label={t.dashboard.createContent}
                  href="/dashboard/geo-content"
                />
                <ActionCard
                  icon={Bot}
                  iconColor="bg-indigo-50 text-indigo-600"
                  label={t.dashboard.runAgent}
                  href="/dashboard/agents"
                  badge="NEW"
                />
                <ActionCard
                  icon={MessageSquare}
                  iconColor="bg-blue-50 text-blue-600"
                  label={t.dashboard.managePrompts}
                  description={promptsUsed > 0 ? `${promptsUsed} prompts configured` : 'Add prompts'}
                  href="/dashboard/prompts"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Mention Rate"
            value={visibilityScore !== null ? `${visibilityScore}%` : '—'}
            trend={trendDelta !== null ? (trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'neutral') : undefined}
            trendLabel={trendDelta !== null ? `${trendDelta > 0 ? '+' : ''}${trendDelta}%` : undefined}
            icon={Eye}
            color="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            label={t.dashboard.overviewCitations}
            value={citationCount !== null ? citationCount : '—'}
            icon={BookOpen}
            color="bg-blue-50 text-blue-600"
          />
          <KpiCard
            label={t.dashboard.shareOfVoice}
            value={sovPct !== null ? `${sovPct}%` : '—'}
            icon={Target}
            color="bg-purple-50 text-purple-600"
          />
          <KpiCard
            label={t.dashboard.auditScore}
            value={auditScore !== null ? `${auditScore}` : '—'}
            unit={auditScore !== null ? '/100' : undefined}
            icon={Shield}
            color="bg-red-50 text-red-600"
          />
        </div>

        {/* ── Share of Voice (inline competitor) ─────────────────────────────── */}
        {scanResult && (scanResult.competitor_comparison?.length > 0 || Object.keys(scanResult.share_of_voice ?? {}).length > 0) && (
          <SovBar brandName={brandName || scanResult.brand_name} scan={scanResult} />
        )}

        {/* ── Bottom: Topic Table + Credits ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Topic Performance Table (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[15px] font-bold text-gray-900">{t.dashboard.topicPerformance}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Top brands and citation sources by topic</p>
              </div>
              <Link
                href="/dashboard/geo-monitor"
                className="flex items-center gap-1 text-[12px] text-red-500 font-semibold hover:text-red-600 transition-colors"
              >
                {t.dashboard.viewAllTopics}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {topicRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60">
                      <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.dashboard.topicCol}</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.dashboard.rankCol}</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.dashboard.visibilityCol}</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.dashboard.citationCol}</th>
                      <th className="text-center px-3 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t.dashboard.statusCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topicRows.map((row, i) => {
                      const s = STATUS_STYLES[row.status]
                      return (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className="text-[13px] text-gray-800 font-medium line-clamp-1">
                              {row.topic || `Topic ${i + 1}`}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3.5">
                            <span className="text-[13px] font-bold text-gray-700">
                              {row.rank ? `#${row.rank}` : '—'}
                            </span>
                          </td>
                          <td className="text-center px-3 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                              <span className={`text-[12px] font-semibold ${row.visibility ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {row.visibility ? '✓' : '✗'}
                              </span>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3.5">
                            <span className="text-[12px] text-gray-600 font-medium">{row.citationPct}%</span>
                          </td>
                          <td className="text-center px-3 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                              {s.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-[13px] text-gray-500 mb-4">No topic data yet. Run a scan to see performance by topic.</p>
                <Link
                  href="/dashboard/geo-monitor"
                  className="text-[12px] font-semibold text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  Go to Monitor <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Right panel: Credits + Recent Activity */}
          <div className="flex flex-col gap-4">
            {/* Credits card */}
            {credits && creditsTotal > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[13px] font-bold text-gray-900 mb-3">Credits</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-gray-900">{creditsRemaining.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">/ {creditsTotal.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      creditsRemaining / creditsTotal <= 0.2 ? 'bg-red-500' :
                      creditsRemaining / creditsTotal <= 0.5 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${(creditsRemaining / creditsTotal) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">{credits.plan ? `${credits.plan.charAt(0).toUpperCase() + credits.plan.slice(1)} Plan` : ''} · resets monthly</p>
                {credits.plan !== 'enterprise' && (
                  <Link
                    href="/pricing"
                    className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-gray-900 hover:bg-gray-800 text-white text-[12px] font-semibold rounded-xl transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade Plan
                  </Link>
                )}
              </div>
            )}

            {/* Module shortcuts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[13px] font-bold text-gray-900 mb-3">Quick Access</h3>
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Answer Engine Insights', href: '/dashboard/geo-monitor', icon: TrendingUp, color: 'text-emerald-600' },
                  { label: 'GEO Audit', href: '/dashboard/geo-audit', icon: Shield, color: 'text-red-600' },
                  { label: 'Content Creator', href: '/dashboard/geo-content', icon: PenTool, color: 'text-purple-600' },
                  { label: 'AI Agents', href: '/dashboard/agents', icon: Bot, color: 'text-indigo-600', isNew: true },
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors group"
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color}`} strokeWidth={2} />
                    <span className="text-[12px] text-gray-700 font-medium flex-1">{item.label}</span>
                    {(item as { isNew?: boolean }).isNew && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">NEW</span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent scan stats — compact, no dark card */}
            {scanResult && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-[13px] font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Last Scan
                </h3>
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Prompts Tested</p>
                    <p className="text-[18px] font-bold text-gray-900">{scanResult.total_prompts}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Mentions Found</p>
                    <p className="text-[18px] font-bold text-gray-900">{scanResult.mentions_found}</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/geo-monitor"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-gray-50 hover:bg-gray-100 text-[12px] font-semibold text-gray-700 rounded-xl transition-colors"
                >
                  View full report <TrendingUp className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
