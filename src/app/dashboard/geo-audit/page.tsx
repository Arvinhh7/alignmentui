'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useFeatureNav } from '@/hooks/useFeatureNav'
import type { FeatureKey } from '@/lib/featurePermissions'
import {
  api, AuditResult, DimensionScore, ZoneCheck, ZoneBreakdown, notifyCreditUsed,
  fixApi, FixPlan, FixResult, FixZone, GenerateFixRequest, RollbackResult,
  connectionsApi, WebsiteConnection,
} from '@/lib/api'
import {
  Search, Globe, Shield, Layers, FileText, AlertOctagon, Brain,
  CheckCircle, AlertTriangle, XCircle, ArrowRight, ArrowDown,
  Loader2, Sparkles, TrendingUp, TrendingDown, Clock, ExternalLink,
  RotateCcw, X, History, Zap, Target, Award, Download, Share2,
  Eye, BookOpen, ShieldCheck, AlertCircle, RefreshCw, BarChart3,
  Lock, Wrench, FileCode, ChevronDown, ChevronUp, Building2,
  Wand2, Copy, CheckCheck, Terminal, AlertCircle as AlertCircleIcon,
  MinusCircle,
} from 'lucide-react'

// ─── URL Validation ─────────────────────────────────────
function isValidUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProtocol)
    const host = url.hostname
    if (!host.includes('.')) return false
    const parts = host.split('.')
    if (parts.length < 2 || parts[parts.length - 1].length < 2) return false
    if (parts.some(p => !p)) return false
    return true
  } catch {
    return false
  }
}

// ─── Recent URLs (localStorage) ─────────────────────────
const RECENT_URLS_KEY = 'geo_audit_recent_urls'
const MAX_RECENT_URLS = 8

function getRecentUrls(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_URLS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function addRecentUrl(url: string) {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentUrls()
    const normalized = url.replace(/\/$/, '').toLowerCase()
    const updated = [normalized, ...recent.filter(u => u !== normalized)].slice(0, MAX_RECENT_URLS)
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

function removeRecentUrl(url: string) {
  if (typeof window === 'undefined') return
  try {
    const recent = getRecentUrls()
    const updated = recent.filter(u => u !== url)
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

// ─── Audit → Optimization Handoff ──────────────────────
export interface AuditOptContext {
  url: string
  timestamp: string
  green_fail: number
  yellow_fail: number
  red_fail: number
  fix_effort_hours_low: number
  fix_effort_hours_high: number
  failing_checks: Array<{
    id: string
    name: string
    zone: 'green' | 'yellow' | 'red'
    status: string
    detail: string
    fix_suggestion: string | null | undefined
    fix_type: string
    evidence_basis?: string
    standard_ref?: string | null
  }>
}

const AUDIT_OPT_CONTEXT_KEY = 'audit_to_opt_context'

const PAID_AUDIT_PLANS = new Set(['starter', 'standard', 'pro', 'enterprise', 'growth', 'admin'])

function hasPaidAuditPlan(plan: string | null) {
  return Boolean(plan && PAID_AUDIT_PLANS.has(plan))
}

function isAuditTrialPlan(plan: string | null) {
  return !plan || plan === 'trial'
}
const AUDIT_OPT_TTL_MS = 60 * 60 * 1000 // 1 hour

function storeAuditContext(url: string, breakdown: ZoneBreakdown) {
  if (typeof window === 'undefined') return
  try {
    const allChecks = [
      ...breakdown.red_checks,
      ...breakdown.yellow_checks,
      ...breakdown.green_checks,
    ]
    const failingChecks = allChecks.filter(c => c.status !== 'pass' && c.status !== 'optional')
    const ctx: AuditOptContext = {
      url,
      timestamp: new Date().toISOString(),
      green_fail: breakdown.green_fail,
      yellow_fail: breakdown.yellow_fail,
      red_fail: breakdown.red_fail,
      fix_effort_hours_low: breakdown.fix_effort_hours_low,
      fix_effort_hours_high: breakdown.fix_effort_hours_high,
      failing_checks: failingChecks.map(c => ({
        id: c.id,
        name: c.name,
        zone: c.zone,
        status: c.status,
        detail: c.detail,
        fix_suggestion: c.fix_suggestion,
        fix_type: c.fix_type,
        evidence_basis: c.evidence_basis,
        standard_ref: c.standard_ref,
      })),
    }
    localStorage.setItem(AUDIT_OPT_CONTEXT_KEY, JSON.stringify(ctx))
  } catch { /* ignore */ }
}

function buildOptUrl(auditUrl: string) {
  return `/dashboard/geo-optimization?url=${encodeURIComponent(auditUrl)}&from_audit=1`
}

// ─── Score Benchmark ────────────────────────────────────
function getScoreBenchmark(score: number): { percentile: number; label: string; color: string } {
  if (score >= 90) return { percentile: 95, label: 'Top 5%', color: 'text-sage' }
  if (score >= 80) return { percentile: 85, label: 'Top 15%', color: 'text-sage' }
  if (score >= 70) return { percentile: 70, label: 'Top 30%', color: 'text-ink-2' }
  if (score >= 60) return { percentile: 50, label: 'Top 50%', color: 'text-ink-2' }
  if (score >= 45) return { percentile: 35, label: 'Top 65%', color: 'text-caution' }
  if (score >= 30) return { percentile: 20, label: 'Bottom 35%', color: 'text-caution' }
  return { percentile: 10, label: 'Bottom 15%', color: 'text-red-soft' }
}

// ─── Score Ring Component ──────────────────────────────
function ScoreRing({ score, size = 180, strokeWidth = 12, animate = true }: {
  score: number; size?: number; strokeWidth?: number; animate?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 85) return { stroke: '#4A7C59', text: 'text-sage', glow: 'shadow-sage/20' }
    if (s >= 65) return { stroke: '#000000', text: 'text-ink', glow: 'shadow-ink/10' }
    if (s >= 45) return { stroke: '#B8860B', text: 'text-caution', glow: 'shadow-caution/20' }
    return { stroke: '#B5453A', text: 'text-red-soft', glow: 'shadow-red-soft/20' }
  }

  const color = getColor(score)
  const benchmark = getScoreBenchmark(score)

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#C8BFB0" strokeWidth={strokeWidth} fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? offset : circumference}
            strokeLinecap="round"
            className="transition-all duration-1500 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color.stroke}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold font-mono ${color.text}`}>{score}</span>
          <span className="text-ink-3 text-sm">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-xs font-semibold ${benchmark.color} bg-canvas px-3 py-1 rounded-full`}>
        {benchmark.label} of websites
      </span>
    </div>
  )
}

// ─── Radar Chart (Pentagon) ────────────────────────────
function RadarChart({ scores, size = 220 }: { scores: number[]; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38
  const labels = ['Discoverability', 'Structure & Format', 'Citability', 'Risk & Trust', 'Memory']

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    const r = (value / 100) * maxR
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const getLabelPoint = (index: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2
    const r = maxR + 24
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gridLevels = [25, 50, 75, 100]

  const getPolygon = (value: number) =>
    Array.from({ length: 5 }, (_, i) => getPoint(i, value))
      .map(p => `${p.x},${p.y}`)
      .join(' ')

  const dataPolygon = scores.map((s, i) => getPoint(i, s))
    .map(p => `${p.x},${p.y}`)
    .join(' ')

  const getScoreColor = (s: number) => {
    if (s >= 85) return '#4A7C59'
    if (s >= 65) return '#000000'
    if (s >= 45) return '#B8860B'
    return '#B5453A'
  }

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={getPolygon(level)}
          fill="none"
          stroke="#C8BFB0"
          strokeWidth="1"
          opacity={0.6}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#C8BFB0" strokeWidth="1" opacity={0.5} />
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill="rgba(25, 25, 24, 0.08)"
        stroke="#000000"
        strokeWidth="2"
        className="transition-all duration-1000"
      />

      {/* Data points */}
      {scores.map((s, i) => {
        const p = getPoint(i, s)
        return (
          <circle
            key={i} cx={p.x} cy={p.y} r={4}
            fill={getScoreColor(s)} stroke="white" strokeWidth="2"
            className="transition-all duration-1000"
          />
        )
      })}

      {/* Labels */}
      {labels.map((label, i) => {
        const p = getLabelPoint(i)
        return (
          <text
            key={i} x={p.x} y={p.y}
            textAnchor="middle" dominantBaseline="middle"
            className="text-[10px] fill-ink-3 font-medium"
          >
            {label}
          </text>
        )
      })}

      {/* Score values next to dots */}
      {scores.map((s, i) => {
        const p = getPoint(i, s)
        const offset = s > 50 ? -14 : 14
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
        return (
          <text
            key={`val-${i}`}
            x={p.x + Math.cos(angle) * offset}
            y={p.y + Math.sin(angle) * offset}
            textAnchor="middle" dominantBaseline="middle"
            className="text-[11px] font-bold font-mono"
            fill={getScoreColor(s)}
          >
            {s}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Scanning Progress Panel ────────────────────────────
const SCAN_STEPS = [
  { icon: Shield, label: 'AI Discoverability', desc: 'Checking llms.txt, agent.json & AI access...' },
  { icon: Layers, label: 'Semantic Structure & Format', desc: 'Analyzing headings, paragraphs & sections...' },
  { icon: FileText, label: 'Content Citability', desc: 'Evaluating fact units & objectivity...' },
  { icon: AlertOctagon, label: 'Risk Boundary & Trust', desc: 'Reviewing claims & safety signals...' },
  { icon: Brain, label: 'Reusability & Memory', desc: 'Assessing FAQ, definitions & memory signals...' },
]

function ScanProgressPanel({ url }: { url: string }) {
  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    // Step animation: advance every 2s
    const stepTimer = setInterval(() => {
      setActiveStep(prev => (prev < 4 ? prev + 1 : prev))
    }, 2200)
    // Elapsed timer
    const elapsedTimer = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
    return () => { clearInterval(stepTimer); clearInterval(elapsedTimer) }
  }, [])

  const progress = Math.min(((activeStep + 1) / 5) * 90 + elapsed * 2, 95)

  return (
    <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-surface-warm w-full">
        <div
          className="h-full bg-gradient-to-r from-ink to-ink/60 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ink/5 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-ink animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink">Analyzing your website...</h3>
              <p className="text-sm text-ink-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-ink">{Math.round(progress)}%</p>
            <p className="text-xs text-ink-3">{elapsed}s elapsed</p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {SCAN_STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = i === activeStep
            const isDone = i < activeStep
            const isPending = i > activeStep

            return (
              <div
                key={i}
                className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${
                  isDone
                    ? 'border-sage/30 bg-sage-bg'
                    : isActive
                    ? 'border-ink/20 bg-ink/[0.03] shadow-md shadow-ink/5'
                    : 'border-divider-light bg-canvas opacity-50'
                }`}
              >
                {/* Step number badge */}
                <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? 'bg-sage text-ink-inv'
                    : isActive
                    ? 'bg-ink text-ink-inv'
                    : 'bg-surface-muted text-ink-3'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>

                <div className="flex flex-col items-center text-center gap-2 pt-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDone
                      ? 'bg-sage-bg text-sage'
                      : isActive
                      ? 'bg-ink/5 text-ink'
                      : 'bg-surface-warm text-ink-3'
                  }`}>
                    {isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isDone ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <p className={`text-xs font-semibold ${
                    isDone ? 'text-sage' : isActive ? 'text-ink' : 'text-ink-3'
                  }`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-ink-3 animate-pulse">{step.desc}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Skeleton preview */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-canvas rounded-xl p-6 flex flex-col items-center animate-pulse">
            <div className="w-24 h-24 rounded-full bg-surface-muted mb-3" />
            <div className="w-20 h-4 bg-surface-muted rounded" />
          </div>
          <div className="bg-canvas rounded-xl p-6 space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-3 bg-surface-muted rounded" />
                <div className="flex-1 h-2 bg-surface-muted rounded-full" />
                <div className="w-6 h-3 bg-surface-muted rounded" />
              </div>
            ))}
          </div>
          <div className="bg-canvas rounded-xl p-6 space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 bg-surface-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Quick Insight Card ──────────────────────────────────
function InsightCards({ result }: { result: AuditResult }) {
  const dimEntries: { key: string; label: string; icon: React.ReactNode; score: number }[] = [
    { key: 'ai_accessibility', label: 'AI Discoverability', icon: <Shield className="w-5 h-5" />, score: result.ai_accessibility.score },
    { key: 'semantic_structure', label: 'Semantic Structure & Format', icon: <Layers className="w-5 h-5" />, score: result.semantic_structure.score },
    { key: 'content_citability', label: 'Content Citability', icon: <FileText className="w-5 h-5" />, score: result.content_citability.score },
    { key: 'risk_boundary', label: 'Risk Boundary & Trust', icon: <AlertOctagon className="w-5 h-5" />, score: result.risk_boundary.score },
    { key: 'reusability', label: 'Reusability & Memory', icon: <Brain className="w-5 h-5" />, score: result.reusability.score },
  ]

  const sorted = [...dimEntries].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strongest */}
      <div className="bg-gradient-to-br from-sage-bg to-surface-warm rounded-xl border border-sage/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-sage-bg rounded-lg flex items-center justify-center text-sage">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-sage uppercase tracking-wider">Strongest Dimension</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sage">{strongest.icon}</span>
            <span className="font-semibold text-ink">{strongest.label}</span>
          </div>
          <span className="text-2xl font-bold font-mono text-sage">{strongest.score}</span>
        </div>
        <p className="text-xs text-sage mt-2 opacity-75">
          This is your best-performing area for AI visibility.
        </p>
      </div>

      {/* Weakest */}
      <div className="bg-surface-warm rounded-xl border border-divider-light p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-soft-bg rounded-lg flex items-center justify-center text-red-soft">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-soft uppercase tracking-wider">Priority to Fix</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-soft">{weakest.icon}</span>
            <span className="font-semibold text-ink">{weakest.label}</span>
          </div>
          <span className="text-2xl font-bold font-mono text-red-soft">{weakest.score}</span>
        </div>
        <p className="text-xs text-red-soft mt-2 opacity-75">
          Improving this dimension will have the biggest impact on your score.
        </p>
      </div>
    </div>
  )
}

// ─── Dimension Card ────────────────────────────────────
function DimensionCard({ dimension, icon, label, index, t }: {
  dimension: DimensionScore
  icon: React.ReactNode
  label: string
  index: number
  t: ReturnType<typeof useLanguage>['t']
}) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig: Record<string, { bg: string; text: string; label: string; border: string }> = {
    excellent: { bg: 'bg-sage-bg', text: 'text-sage', label: t.dashboard.excellent, border: 'border-sage/30' },
    good: { bg: 'bg-surface-warm', text: 'text-ink-2', label: t.dashboard.good, border: 'border-divider' },
    needs_work: { bg: 'bg-caution-bg', text: 'text-caution', label: t.dashboard.needsWork, border: 'border-caution/30' },
    poor: { bg: 'bg-red-soft-bg', text: 'text-red-soft', label: t.dashboard.poor, border: 'border-red-soft/30' },
  }

  const status = statusConfig[dimension.status] || statusConfig.poor

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-sage'
    if (score >= 65) return 'bg-ink-2'
    if (score >= 45) return 'bg-caution'
    return 'bg-red-soft'
  }

  const passedCount = dimension.details.filter(d => d.startsWith('✅')).length
  const warningCount = dimension.details.filter(d => d.startsWith('⚠️')).length
  const issueCount = dimension.details.filter(d => d.startsWith('❌')).length

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden hover:shadow-md transition-all ${expanded ? `${status.border} shadow-md` : 'border-divider-light'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.bg} ${status.text}`}>
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <span className="text-xs text-ink-3 font-mono">D{index}</span>
                {label}
              </h4>
              <p className="text-xs text-ink-3 mt-0.5">{dimension.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className="text-2xl font-bold font-mono text-ink">{dimension.score}</span>
          </div>
        </div>

        {/* Score Bar */}
        <div className="w-full h-2 bg-surface-warm rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getBarColor(dimension.score)}`}
            style={{ width: `${dimension.score}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-ink-3">
          <span className="flex items-center gap-3">
            {passedCount > 0 && <span className="flex items-center gap-1 text-sage"><CheckCircle className="w-3 h-3" />{passedCount}</span>}
            {warningCount > 0 && <span className="flex items-center gap-1 text-caution"><AlertTriangle className="w-3 h-3" />{warningCount}</span>}
            {issueCount > 0 && <span className="flex items-center gap-1 text-red-soft"><XCircle className="w-3 h-3" />{issueCount}</span>}
          </span>
          <span className="flex items-center gap-1 text-ink-3 hover:text-ink transition-colors">
            {expanded ? 'Hide' : 'View'} details
            <ArrowRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-divider-light pt-4 space-y-4">
          {/* Findings */}
          <div>
            <h5 className="text-sm font-medium text-ink-2 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {t.dashboard.findings}
            </h5>
            <div className="space-y-1.5">
              {dimension.details.map((detail, i) => (
                <div key={i} className={`text-sm py-1.5 px-3 rounded-lg flex items-start gap-2 ${
                  detail.startsWith('✅') ? 'bg-sage-bg text-sage' :
                  detail.startsWith('⚠️') ? 'bg-caution-bg text-caution' :
                  detail.startsWith('❌') ? 'bg-red-soft-bg text-red-soft' :
                  detail.startsWith('◽') ? 'bg-canvas/60 text-ink-3' : 'text-ink-2'
                }`}>
                  <span className="flex-shrink-0 mt-0.5">
                    {detail.startsWith('✅') ? <CheckCircle className="w-4 h-4 text-sage" /> :
                     detail.startsWith('⚠️') ? <AlertTriangle className="w-4 h-4 text-caution" /> :
                     detail.startsWith('❌') ? <XCircle className="w-4 h-4 text-red-soft" /> :
                     detail.startsWith('◽') ? <MinusCircle className="w-4 h-4 text-ink-3" /> : null}
                  </span>
                  <span>{detail.replace(/^[✅⚠️❌◽]\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {dimension.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-ink-2 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-ink-2" />
                {t.dashboard.recommendations}
              </h5>
              <div className="space-y-2">
                {dimension.recommendations.map((rec, i) => (
                  <div key={i} className="text-sm bg-ink/[0.03] border border-ink/10 rounded-lg p-3 text-ink-2">
                    <span className="font-medium text-ink mr-1">→</span> {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Stats Summary Card ────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-surface rounded-xl border border-divider-light p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-ink font-mono">{value}</p>
        <p className="text-xs text-ink-3">{label}</p>
      </div>
    </div>
  )
}

// ─── Zone Check Row ─────────────────────────────────────
// ─── Fix Pipeline Panel (Phase 4) ────────────────────────
function FixPanel({
  check,
  siteUrl,
  userId,
}: {
  check: ZoneCheck
  siteUrl: string
  userId: string
}) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<FixPlan | null>(null)
  const [applyResult, setApplyResult] = useState<FixResult | null>(null)
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null)
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [connections, setConnections] = useState<WebsiteConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [loadingConnections, setLoadingConnections] = useState(false)

  const isRed = check.zone === 'red'
  const isYellow = check.zone === 'yellow'
  const isGreen = check.zone === 'green'

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setPlan(null)
    setApplyResult(null)
    setApproved(false)
    try {
      const req: GenerateFixRequest = {
        check_id: check.id,
        check_name: check.name,
        zone: check.zone as FixZone,
        site_url: siteUrl,
        detail: check.detail,
        evidence_basis: check.evidence_basis ?? '',
        standard_ref: check.standard_ref ?? undefined,
        fix_type: check.fix_type,
        user_id: userId,
      }
      const result = await fixApi.generatePlan(req)
      setPlan(result)
      // Load matching connections if this fix requires platform access
      if (result.requires_connection) {
        const platform =
          result.apply_method === 'shopify_asset' ? 'shopify'
          : result.apply_method === 'github_commit' ? 'github'
          : null
        if (platform) {
          setLoadingConnections(true)
          try {
            const all = await connectionsApi.list(userId)
            const matching = all.filter(c => c.platform === platform && c.status === 'connected')
            setConnections(matching)
            if (matching.length === 1) setSelectedConnectionId(matching[0].id)
          } catch { /* fail silently — user can still copy code manually */ } finally {
            setLoadingConnections(false)
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fix generation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!plan?.fix_code) return
    navigator.clipboard.writeText(plan.fix_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRollback = async () => {
    if (!plan) return
    setRollingBack(true)
    setShowRollbackConfirm(false)
    setError(null)
    try {
      const result = await fixApi.rollback(plan.id, userId)
      setRollbackResult(result)
      if (result.success) {
        setApplyResult(null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rollback failed')
    } finally {
      setRollingBack(false)
    }
  }

  const handleApply = async () => {
    if (!plan) return
    if (isYellow && !approved) return
    setApplying(true)
    setError(null)
    try {
      const result = await fixApi.applyFix({
        plan_id: plan.id,
        user_id: userId,
        approved: approved,
        connection_id: selectedConnectionId ?? undefined,
      })
      setApplyResult(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Apply failed')
    } finally {
      setApplying(false)
    }
  }

  const btnLabel = isRed ? 'View Engineer Guide' : isYellow ? 'Generate Draft' : 'Generate Fix'
  const btnColor = isRed
    ? 'bg-red-soft-bg hover:bg-red-soft-bg text-red-soft border border-red-soft/30'
    : isYellow
    ? 'bg-caution-bg hover:bg-caution-bg text-caution border border-caution/30'
    : 'bg-sage-bg hover:bg-sage-bg text-sage border border-sage/30'

  return (
    <div className="mt-2">
      {/* Trigger button — only show when no plan yet */}
      {!plan && !loading && (
        <button
          onClick={handleGenerate}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${btnColor}`}
        >
          {isRed ? <Terminal className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
          {btnLabel}
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-ink-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Claude is generating the fix…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1.5 p-2 bg-red-soft-bg border border-red-soft/30 rounded text-xs text-red-soft flex items-start gap-1.5">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Plan display */}
      {plan && !applyResult && (
        <div className={`mt-2 rounded-xl border overflow-hidden ${
          isRed ? 'border-red-soft/30 bg-red-soft-bg/60' :
          isYellow ? 'border-caution/30 bg-caution-bg/60' :
          'border-sage/30 bg-sage-bg/60'
        }`}>
          {/* Plan header */}
          <div className="px-3 py-2.5 flex items-start justify-between gap-2">
            <div>
              <p className={`text-xs font-semibold ${
                isRed ? 'text-red-soft' : isYellow ? 'text-caution' : 'text-sage'
              }`}>
                {isRed ? '⛔ Engineer Guide' : isYellow ? '✏️ AI Draft' : '✅ Auto-fix'} — {plan.fix_title}
              </p>
              <p className="text-[11px] text-ink-2 mt-0.5 leading-relaxed">{plan.fix_description}</p>
              {plan.model_used && (
                <p className="text-[10px] text-ink-3 mt-1 font-mono">via {plan.model_used} · ~{plan.estimated_minutes}min</p>
              )}
            </div>
            <button
              onClick={() => { setPlan(null); setError(null) }}
              className="text-ink-3 hover:text-ink-2 flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Code block */}
          {plan.fix_code && (
            <div className="mx-3 mb-3">
              <div className="relative">
                <pre className={`text-[11px] font-mono rounded-lg p-3 overflow-x-auto border max-h-52 whitespace-pre-wrap break-all ${
                  isRed ? 'bg-red-soft-bg border-red-soft/30 text-red-soft' :
                  isYellow ? 'bg-caution-bg border-caution/30 text-caution' :
                  'bg-sage-bg border-sage/30 text-sage'
                }`}>
                  {plan.fix_code}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-1 bg-surface/80 hover:bg-surface border border-divider-light rounded-md text-ink-2 transition-all"
                >
                  {copied ? <CheckCheck className="w-3 h-3 text-sage" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Engineer guide */}
          {plan.engineer_guide && (
            <div className="mx-3 mb-3">
              <div className="bg-surface/70 border border-red-soft/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                <pre className="text-[11px] text-ink-2 whitespace-pre-wrap leading-relaxed font-sans">
                  {plan.engineer_guide}
                </pre>
              </div>
            </div>
          )}

          {/* Risk note */}
          {plan.risk_note && (
            <div className="mx-3 mb-3 flex items-start gap-1.5 p-2 bg-caution-bg border border-caution/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-caution flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-caution leading-relaxed">{plan.risk_note}</p>
            </div>
          )}

          {/* Apply steps summary */}
          {plan.apply_steps.length > 0 && !isRed && (
            <div className="mx-3 mb-3">
              <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1.5">How to apply</p>
              <ol className="space-y-1">
                {plan.apply_steps.map(step => (
                  <li key={step.step_number} className="flex gap-2 text-[11px] text-ink-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${
                      isYellow ? 'bg-caution-bg text-caution' : 'bg-sage-bg text-sage'
                    }`}>{step.step_number}</span>
                    <span><span className="font-medium">{step.title}:</span> {step.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Yellow zone approval checkbox */}
          {isYellow && (
            <div className="mx-3 mb-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={e => setApproved(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 accent-[#000000]"
                />
                <span className="text-[11px] text-caution leading-relaxed">
                  I have reviewed this draft and confirm it is accurate and appropriate for my website.
                </span>
              </label>
            </div>
          )}

          {/* Connection Selector — shown when fix requires Shopify / GitHub access */}
          {plan.requires_connection && !isRed && (
            <div className="mx-3 mb-3">
              <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1.5">
                Apply via connection
              </p>
              {loadingConnections ? (
                <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading connections…
                </div>
              ) : connections.length === 0 ? (
                <div className="flex items-start gap-2 p-2 bg-caution-bg border border-caution/30 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-caution flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-caution leading-relaxed">
                    No {plan.apply_method === 'shopify_asset' ? 'Shopify' : 'GitHub'} connection found.{' '}
                    <a href="/dashboard/connections" className="underline font-medium">
                      Connect your store
                    </a>
                    {' '}to enable one-click apply. You can still copy the code and apply manually.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedConnectionId ?? ''}
                  onChange={e => setSelectedConnectionId(e.target.value || null)}
                  className="w-full text-[11px] border border-divider-light rounded-lg px-2.5 py-1.5 bg-surface text-ink-2 focus:outline-none focus:border-ink"
                >
                  <option value="">— No connection (copy code manually) —</option>
                  {connections.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.platform === 'shopify' ? '🛍️' : c.platform === 'github' ? '🐙' : '🔗'}{' '}
                      {c.display_name || c.site_url}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Action row */}
          {!isRed && (
            <div className="px-3 pb-3 flex items-center gap-2">
              {plan.fix_code && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface border border-divider-light hover:border-divider text-ink-2 rounded-lg font-medium transition-all"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              )}
              {(isGreen || (isYellow && approved)) && (
                <button
                  onClick={handleApply}
                  disabled={applying || (isYellow && !approved)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                    isYellow
                      ? 'bg-caution hover:bg-caution/90 text-ink-inv disabled:opacity-30'
                      : 'bg-sage hover:bg-[#3D6B4E] text-ink-inv disabled:opacity-30'
                  }`}
                >
                  {applying
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5" />
                      {selectedConnectionId
                        ? (isYellow ? 'Apply with Approval' : 'Apply Now')
                        : 'Apply (manual)'
                      }
                    </>
                  }
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Apply result */}
      {applyResult && !rollbackResult && (
        <div className={`mt-2 rounded-xl border overflow-hidden text-xs ${
          applyResult.success
            ? 'bg-sage-bg border-sage/30'
            : 'bg-red-soft-bg border-red-soft/30'
        }`}>
          <div className={`flex items-start gap-1.5 p-3 ${
            applyResult.success ? 'text-sage' : 'text-red-soft'
          }`}>
            {applyResult.success
              ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{applyResult.success ? 'Fix Applied' : 'Apply Failed'}</p>
              <p className="mt-0.5 leading-relaxed break-words">{applyResult.message}</p>
              {applyResult.success && (
                <p className="mt-1 text-[10px] opacity-70">Re-run the full audit to verify resolution.</p>
              )}
            </div>
          </div>

          {/* Rollback row — only when apply succeeded and rollback is available */}
          {applyResult.success && applyResult.rollback_available && (
            <div className="border-t border-sage/30 bg-surface/60 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-3">Changed your mind? Restore the previous state.</p>
              {!showRollbackConfirm ? (
                <button
                  onClick={() => setShowRollbackConfirm(true)}
                  disabled={rollingBack}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-surface border border-divider hover:border-red-soft/30 hover:text-red-soft text-ink-2 rounded-lg font-medium transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Rollback Fix
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-red-soft font-medium">Confirm rollback?</span>
                  <button
                    onClick={handleRollback}
                    disabled={rollingBack}
                    className="text-[11px] px-2.5 py-1 bg-ink hover:bg-[#2d2d2c] text-ink-inv rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {rollingBack
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Restoring…</>
                      : 'Yes, rollback'
                    }
                  </button>
                  <button
                    onClick={() => setShowRollbackConfirm(false)}
                    className="text-[11px] px-2.5 py-1 border border-divider-light text-ink-3 rounded-lg hover:bg-surface-warm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual apply — no rollback, but remind user how to undo */}
          {applyResult.success && !applyResult.rollback_available && (
            <div className="border-t border-sage/30 bg-surface/60 px-3 py-2">
              <p className="text-[11px] text-ink-3">
                To undo: manually remove the code or file that was applied.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rollback result */}
      {rollbackResult && (
        <div className={`mt-2 p-3 rounded-xl border text-xs ${
          rollbackResult.success
            ? 'bg-caution-bg border-caution/30 text-caution'
            : 'bg-red-soft-bg border-red-soft/30 text-red-soft'
        }`}>
          <div className="flex items-start gap-1.5">
            {rollbackResult.success
              ? <RotateCcw className="w-4 h-4 flex-shrink-0 mt-0.5 text-caution" />
              : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className="font-semibold">{rollbackResult.success ? 'Rollback Complete' : 'Rollback Failed'}</p>
              <p className="mt-0.5 leading-relaxed">{rollbackResult.message}</p>
              {rollbackResult.success && (
                <p className="mt-1 text-[10px] opacity-70">
                  The site has been restored to its previous state. Re-run the audit to confirm.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 95 ? 'text-sage bg-sage-bg' :
                score >= 85 ? 'text-ink-2 bg-surface-warm' :
                              'text-caution bg-caution-bg'
  const label = score >= 95 ? 'Deterministic' :
                score >= 85 ? 'Regex-based' :
                              'Heuristic'
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${color}`} title={label}>
      🔬 {score}%
    </span>
  )
}

function ZoneCheckRow({
  check,
  isLocked,
  userId,
  siteUrl,
  showZoneBadge,
}: {
  check: ZoneCheck
  isLocked?: boolean
  userId?: string
  siteUrl?: string
  showZoneBadge?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showEvidence, setShowEvidence] = useState(false)
  const [showFixPanel, setShowFixPanel] = useState(false)

  const statusIcon = check.status === 'pass'
    ? <CheckCircle className="w-4 h-4 text-sage flex-shrink-0" />
    : check.status === 'optional'
    ? <MinusCircle className="w-4 h-4 text-ink-3 flex-shrink-0" />
    : check.status === 'warning'
    ? <AlertTriangle className="w-4 h-4 text-caution flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-red-soft flex-shrink-0" />

  const fixTypeBadge: Record<string, { label: string; cls: string }> = {
    auto: { label: 'Auto-fix', cls: 'bg-sage-bg text-sage' },
    ai_draft: { label: 'AI Draft', cls: 'bg-surface-warm text-ink-2' },
    manual_required: { label: 'Manual', cls: 'bg-surface-warm text-ink-2' },
  }
  const badge = fixTypeBadge[check.fix_type] || fixTypeBadge.manual_required
  const isExpandable = !!(check.fix_suggestion || check.evidence_basis || check.standard_ref || check.status !== 'pass')

  if (isLocked) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-canvas opacity-60 select-none">
        <Lock className="w-4 h-4 text-ink-3 flex-shrink-0" />
        <span className="flex-1 text-sm text-ink-3 blur-[3px]">████████████████████</span>
        <span className="text-xs text-ink-3">Upgrade to view</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      check.status === 'pass' ? 'border-divider-light bg-surface' :
      check.status === 'optional' ? 'border-divider-light bg-canvas/60' :
      check.status === 'warning' ? 'border-caution/30 bg-caution-bg/40' :
      'border-red-soft/30 bg-red-soft-bg/40'
    }`}>
      <button
        onClick={() => isExpandable && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${isExpandable ? 'cursor-pointer hover:bg-surface-warm/80' : 'cursor-default'}`}
      >
        {statusIcon}
        <span className="flex-1 text-sm text-ink-2 min-w-0">
          <span className="font-mono text-[10px] text-ink-3 mr-1.5">{check.id}</span>
          {check.name}
        </span>
        {check.confidence_score != null && (
          <ConfidenceBadge score={check.confidence_score} />
        )}
        {showZoneBadge && (
          <ZoneDifficultyBadge zone={check.zone as 'green' | 'yellow' | 'red'} />
        )}
        {!showZoneBadge && check.fix_available && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        )}
        {isExpandable && (
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-ink-3 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-divider-light space-y-2">
          <p className="text-xs text-ink-2 leading-relaxed">{check.detail}</p>

          {/* Evidence section */}
          {check.evidence_basis && (
            <div>
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="text-[10px] text-ink-3 hover:text-ink-2 flex items-center gap-1"
              >
                {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                View evidence
              </button>
              {showEvidence && (
                <div className="mt-1 p-2 bg-canvas border border-divider rounded text-[11px] font-mono text-ink-2 break-all leading-relaxed">
                  {check.evidence_basis}
                  {check.standard_ref && (
                    <div className="mt-1.5 pt-1.5 border-t border-divider font-sans text-[10px] text-ink-3 not-italic">
                      📋 Standard: {check.standard_ref}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fix suggestion */}
          {check.fix_suggestion && (
            <div className={`p-2.5 rounded-lg text-xs ${
              check.zone === 'red' ? 'bg-red-soft-bg border border-red-soft/30 text-red-soft' :
              check.zone === 'yellow' ? 'bg-surface-warm border border-divider text-ink-2' :
              'bg-sage-bg border border-sage/30 text-sage'
            }`}>
              <span className="font-medium">Fix: </span>{check.fix_suggestion}
            </div>
          )}

          {/* Fix Pipeline (Phase 4) — show for failing checks only (optional/bonus checks excluded) */}
          {check.status !== 'pass' && check.status !== 'optional' && userId && siteUrl && (
            <div className="pt-1">
              {!showFixPanel ? (
                <button
                  onClick={() => setShowFixPanel(true)}
                  className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                    check.zone === 'red'
                      ? 'bg-red-soft-bg hover:bg-red-soft-bg text-red-soft border border-red-soft/30'
                      : check.zone === 'yellow'
                      ? 'bg-caution-bg hover:bg-caution-bg text-caution border border-caution/30'
                      : 'bg-sage-bg hover:bg-sage-bg text-sage border border-sage/30'
                  }`}
                >
                  {check.zone === 'red'
                    ? <><Terminal className="w-3 h-3" /> View Engineer Guide</>
                    : check.zone === 'yellow'
                    ? <><Wand2 className="w-3 h-3" /> Generate Draft Fix</>
                    : <><Wand2 className="w-3 h-3" /> Generate Auto-Fix</>
                  }
                </button>
              ) : (
                <FixPanel check={check} siteUrl={siteUrl} userId={userId} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Zone Panel ──────────────────────────────────────────
function ZonePanel({
  zone, checks, passCount, failCount, isLocked, lockedCount, userId, siteUrl,
}: {
  zone: 'green' | 'yellow' | 'red'
  checks: ZoneCheck[]
  passCount: number
  failCount: number
  isLocked?: boolean
  lockedCount?: number
  userId?: string
  siteUrl?: string
}) {
  const [open, setOpen] = useState(!isLocked)

  const config = {
    green: {
      label: 'Green Zone',
      sublabel: 'Auto-detectable · AI can fix',
      headerBg: 'bg-sage-bg border-sage/30',
      iconBg: 'bg-sage-bg',
      iconColor: 'text-sage',
      badge: 'bg-sage-bg text-sage',
      icon: <Zap className="w-4 h-4" />,
    },
    yellow: {
      label: 'Yellow Zone',
      sublabel: 'AI-detectable · Engineer review required',
      headerBg: 'bg-caution-bg border-caution/30',
      iconBg: 'bg-caution-bg',
      iconColor: 'text-caution',
      badge: 'bg-caution-bg text-caution',
      icon: <Wrench className="w-4 h-4" />,
    },
    red: {
      label: 'Red Zone',
      sublabel: 'Manual operation only · High risk',
      headerBg: 'bg-red-soft-bg border-red-soft/30',
      iconBg: 'bg-red-soft-bg',
      iconColor: 'text-red-soft',
      badge: 'bg-red-soft-bg text-red-soft',
      icon: <AlertOctagon className="w-4 h-4" />,
    },
  }[zone]

  return (
    <div className={`rounded-xl border overflow-hidden ${config.headerBg}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconBg} ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-ink">{config.label}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
              {checks.length} checks
            </span>
          </div>
          <p className="text-xs text-ink-3 mt-0.5">{config.sublabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-sage font-medium">
              <CheckCircle className="w-3.5 h-3.5" />{passCount} pass
            </span>
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-soft font-medium">
                <XCircle className="w-3.5 h-3.5" />{failCount} fix
              </span>
            )}
          </div>
          {isLocked ? <Lock className="w-4 h-4 text-ink-3" /> : (
            open ? <ChevronUp className="w-4 h-4 text-ink-3" /> : <ChevronDown className="w-4 h-4 text-ink-3" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 bg-surface border-t border-divider-light space-y-1.5">
          {checks.map((check, i) => (
            <ZoneCheckRow
              key={check.id}
              check={check}
              isLocked={isLocked && i >= (checks.length - (lockedCount || 0))}
              userId={userId}
              siteUrl={siteUrl}
            />
          ))}
          {isLocked && (lockedCount || 0) > 0 && (
            <div className="mt-2 p-3 bg-canvas rounded-lg border border-divider-light text-center">
              <Lock className="w-4 h-4 text-ink-3 mx-auto mb-1" />
              <p className="text-xs text-ink-3">
                <span className="font-semibold">{lockedCount} more checks</span> hidden — upgrade to view full details
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Fix Effort Estimator + Layer 1 CTA ────────────────
type NavToFeatureFn = (key: FeatureKey, href?: string, preFn?: () => void) => void

function Layer1CTA({ breakdown, isAdmin, auditUrl, onNavToFeature }: {
  breakdown: ZoneBreakdown
  isAdmin: boolean
  auditUrl: string
  onNavToFeature: NavToFeatureFn
}) {
  const totalFail = breakdown.green_fail + breakdown.yellow_fail + breakdown.red_fail

  const handleFixClick = () => {
    onNavToFeature('geo-optimization', buildOptUrl(auditUrl), () => {
      storeAuditContext(auditUrl, breakdown)
    })
  }

  if (isAdmin) {
    return (
      <div className="bg-ink rounded-2xl p-6 text-ink-inv">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage" />
            <span className="text-sm font-semibold text-sage">Internal — Full Access</span>
          </div>
          {totalFail > 0 && (
            <button
              onClick={handleFixClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-caution hover:bg-caution/90 text-ink-inv text-sm font-bold rounded-xl transition-all"
            >
              <Zap className="w-4 h-4" />
              Fix These Issues →
            </button>
          )}
        </div>
        <p className="text-sm text-white/80">
          You have full Layer 1 access. All {34} checks, fix suggestions, and zone details are visible.
          Use the Fix Engine data above to build delivery workflows.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-sage">{breakdown.green_fail}</p>
            <p className="text-xs text-white/60 mt-0.5">Green issues</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-caution">{breakdown.yellow_fail}</p>
            <p className="text-xs text-white/60 mt-0.5">Yellow issues</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-soft">{breakdown.red_fail}</p>
            <p className="text-xs text-white/60 mt-0.5">Red issues</p>
          </div>
        </div>
      </div>
    )
  }

  if (totalFail === 0) return null

  return (
    <div className="bg-ink rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-caution" />
          <span className="text-xs font-bold text-caution uppercase tracking-wider">Layer 1 · AI Visibility Infrastructure</span>
        </div>
        <h3 className="text-xl font-bold text-white">One-time fix, long-term gain</h3>
        <p className="text-sm text-white/60 mt-1">
          Your site has {totalFail} issues across {breakdown.green_fail} green, {breakdown.yellow_fail} yellow, and {breakdown.red_fail} red zone checks.
        </p>
      </div>

      <div className="px-6 py-4 border-b border-white/10">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-caution" />
            <p className="text-xs text-white/60 font-medium">Alignment Experts</p>
          </div>
          <p className="text-2xl font-bold text-caution">6–8 weeks</p>
          <p className="text-xs text-white/40 mt-1">Full-stack delivery · QA included</p>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/80">
            Wrong fixes may trigger <span className="text-red-soft font-semibold">Google penalties or site crashes</span>.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-shrink-0">
          <button
            onClick={handleFixClick}
            className="px-5 py-2.5 bg-sage hover:bg-[#3D6B4E] text-ink-inv font-semibold rounded-xl transition-all text-sm whitespace-nowrap text-center flex items-center gap-2 justify-center"
          >
            <Zap className="w-4 h-4" />
            Fix Issues Now →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Zone Breakdown Section ──────────────────────────────
function ZoneBreakdownSection({
  breakdown,
  isAdmin,
  plan,
  userId,
  siteUrl,
}: {
  breakdown: ZoneBreakdown
  isAdmin: boolean
  plan: string | null
  userId?: string
  siteUrl?: string
}) {
  // Gating logic:
  // admin or any paid plan: all zones visible
  // trial/no plan: green first 10, rest locked
  const isFullAccess = isAdmin || hasPaidAuditPlan(plan)
  const isTrial = !isAdmin && isAuditTrialPlan(plan)

  const greenLocked = isTrial ? Math.max(0, breakdown.green_checks.length - 10) : 0
  const yellowLocked = isTrial ? breakdown.yellow_checks.length : 0
  const redLocked = isTrial ? breakdown.red_checks.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink flex items-center gap-2">
          <FileCode className="w-5 h-5 text-ink-2" />
          Layer 1 — AI Visibility Infrastructure Audit
          <span className="text-xs bg-ink/5 text-ink-2 px-2 py-0.5 rounded-full font-medium">
            {breakdown.green_checks.length + breakdown.yellow_checks.length + breakdown.red_checks.length} checks
          </span>
        </h3>
        {!isFullAccess && (
          <span className="text-xs text-ink-3 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Subscribe to unlock all zones
          </span>
        )}
      </div>

      <ZonePanel
        zone="green"
        checks={breakdown.green_checks}
        passCount={breakdown.green_pass}
        failCount={breakdown.green_fail}
        isLocked={false}
        lockedCount={greenLocked}
        userId={userId}
        siteUrl={siteUrl}
      />

      <ZonePanel
        zone="yellow"
        checks={isFullAccess ? breakdown.yellow_checks : breakdown.yellow_checks.slice(0, 3)}
        passCount={breakdown.yellow_pass}
        failCount={breakdown.yellow_fail}
        isLocked={yellowLocked > 0}
        lockedCount={yellowLocked > 0 ? breakdown.yellow_checks.length - 3 : 0}
        userId={userId}
        siteUrl={siteUrl}
      />

      <ZonePanel
        zone="red"
        checks={isFullAccess ? breakdown.red_checks : breakdown.red_checks.slice(0, 1)}
        passCount={breakdown.red_pass}
        failCount={breakdown.red_fail}
        isLocked={redLocked > 0}
        lockedCount={redLocked > 0 ? breakdown.red_checks.length - 1 : 0}
        userId={userId}
        siteUrl={siteUrl}
      />
    </div>
  )
}

// ─── Dimension → Zone-check mapping (check IDs encode dimension) ────────────
const DIMENSION_MAP = [
  {
    key: 'ai_accessibility' as const, prefix: 'D1',
    Icon: Shield, label: 'AI Discoverability',
    colorSet: {
      iconBg: 'bg-surface-warm', iconText: 'text-ink-2',
      bar: 'bg-ink-2', badge: 'bg-surface-warm text-ink-2',
      border: 'border-divider-light',
    },
  },
  {
    key: 'semantic_structure' as const, prefix: 'D2',
    Icon: Layers, label: 'Semantic Structure & Format',
    colorSet: {
      iconBg: 'bg-surface-warm', iconText: 'text-ink-2',
      bar: 'bg-ink-2', badge: 'bg-surface-warm text-ink-2',
      border: 'border-divider-light',
    },
  },
  {
    key: 'content_citability' as const, prefix: 'D3',
    Icon: FileText, label: 'Content Citability',
    colorSet: {
      iconBg: 'bg-surface-warm', iconText: 'text-ink-2',
      bar: 'bg-ink-2', badge: 'bg-surface-warm text-ink-2',
      border: 'border-divider-light',
    },
  },
  {
    key: 'risk_boundary' as const, prefix: 'D4',
    Icon: AlertOctagon, label: 'Risk Boundary & Trust',
    colorSet: {
      iconBg: 'bg-red-soft-bg', iconText: 'text-red-soft',
      bar: 'bg-red-soft', badge: 'bg-red-soft-bg text-red-soft',
      border: 'border-red-soft/30',
    },
  },
  {
    key: 'reusability' as const, prefix: 'D5',
    Icon: Brain, label: 'Reusability & Memory',
    colorSet: {
      iconBg: 'bg-sage-bg', iconText: 'text-sage',
      bar: 'bg-sage', badge: 'bg-sage-bg text-sage',
      border: 'border-sage/30',
    },
  },
]

// ─── Zone Badge (Fix Difficulty) ─────────────────────────────────────────────
function ZoneDifficultyBadge({ zone }: { zone: 'green' | 'yellow' | 'red' }) {
  if (zone === 'green') return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sage-bg text-sage font-medium whitespace-nowrap flex-shrink-0">
      <Zap className="w-2.5 h-2.5" />AI Fix
    </span>
  )
  if (zone === 'yellow') return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-caution-bg text-caution font-medium whitespace-nowrap flex-shrink-0">
      <Wrench className="w-2.5 h-2.5" />Engineer
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-soft-bg text-red-soft font-medium whitespace-nowrap flex-shrink-0">
      <AlertOctagon className="w-2.5 h-2.5" />Manual
    </span>
  )
}

// ─── Unified Dimension Card (merges DimensionCard + ZoneCheckRow) ─────────────
function UnifiedDimensionCard({
  dimConfig,
  dimension,
  checks,
  isLocked,
  lockedCount,
  defaultOpen,
  userId,
  siteUrl,
}: {
  dimConfig: typeof DIMENSION_MAP[number]
  dimension: DimensionScore
  checks: ZoneCheck[]
  isLocked?: boolean
  lockedCount?: number
  defaultOpen?: boolean
  userId?: string
  siteUrl?: string
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  const { Icon, label, colorSet, prefix } = dimConfig
  const score = dimension.score

  const getBarColor = (s: number) => {
    if (s >= 85) return 'bg-sage'
    if (s >= 65) return 'bg-ink-2'
    if (s >= 45) return 'bg-caution'
    return 'bg-red-soft'
  }

  const passCount = checks.filter(c => c.status === 'pass').length
  // 'optional' = emerging-protocol bonus opportunity — never counted as a failing issue
  const failCount = checks.filter(c => c.status !== 'pass' && c.status !== 'optional').length
  const greenFail = checks.filter(c => c.zone === 'green' && c.status !== 'pass' && c.status !== 'optional').length
  const yellowFail = checks.filter(c => c.zone === 'yellow' && c.status !== 'pass' && c.status !== 'optional').length
  const redFail = checks.filter(c => c.zone === 'red' && c.status !== 'pass' && c.status !== 'optional').length

  const statusLabel = score >= 85 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Needs Work' : 'Poor'
  const statusColor = score >= 85 ? 'bg-sage-bg text-sage' : score >= 65 ? 'bg-surface-warm text-ink-2' : score >= 45 ? 'bg-caution-bg text-caution' : 'bg-red-soft-bg text-red-soft'

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden transition-all hover:shadow-md ${open ? colorSet.border + ' shadow-md border' : 'border-divider-light'}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorSet.iconBg} ${colorSet.iconText}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-semibold text-ink flex items-center gap-2">
                <span className="text-xs text-ink-3 font-mono">{prefix}</span>
                {label}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-2xl font-bold font-mono text-ink">{score}</span>
              </div>
            </div>
            <p className="text-xs text-ink-3 mb-2">{dimension.description}</p>

            {/* Score bar */}
            <div className="w-full h-1.5 bg-surface-warm rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-2 text-xs text-ink-3">
              <span className="flex items-center gap-3">
                {passCount > 0 && <span className="flex items-center gap-1 text-sage"><CheckCircle className="w-3 h-3" />{passCount} pass</span>}
                {greenFail > 0 && <span className="flex items-center gap-1 text-sage"><Zap className="w-3 h-3" />{greenFail} AI-fix</span>}
                {yellowFail > 0 && <span className="flex items-center gap-1 text-caution"><Wrench className="w-3 h-3" />{yellowFail} engineer</span>}
                {redFail > 0 && <span className="flex items-center gap-1 text-red-soft"><AlertOctagon className="w-3 h-3" />{redFail} manual</span>}
              </span>
              <span className="flex items-center gap-1 text-ink-3 hover:text-ink transition-colors">
                {open ? 'Hide' : 'View'} {checks.length} checks
                <ArrowRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Zone checks */}
      {open && (
        <div className="px-5 pb-4 border-t border-divider-light">
          {/* Fix difficulty legend */}
          <div className="flex items-center gap-3 py-2.5 mb-2 text-[10px] text-ink-3 border-b border-divider-light">
            <span className="font-semibold uppercase tracking-wide">Fix Difficulty:</span>
            <span className="flex items-center gap-1 text-sage"><Zap className="w-2.5 h-2.5" />AI Auto-fix</span>
            <span className="flex items-center gap-1 text-caution"><Wrench className="w-2.5 h-2.5" />Engineer Review</span>
            <span className="flex items-center gap-1 text-red-soft"><AlertOctagon className="w-2.5 h-2.5" />Manual Only</span>
          </div>

          <div className="space-y-1.5">
            {checks.map((check, i) => (
              <ZoneCheckRow
                key={check.id}
                check={check}
                isLocked={isLocked && i >= (checks.length - (lockedCount || 0))}
                userId={userId}
                siteUrl={siteUrl}
                showZoneBadge
              />
            ))}
            {isLocked && (lockedCount || 0) > 0 && (
              <div className="mt-2 p-3 bg-canvas rounded-lg border border-divider-light text-center">
                <Lock className="w-4 h-4 text-ink-3 mx-auto mb-1" />
                <p className="text-xs text-ink-3">
                  <span className="font-semibold">{lockedCount} checks</span> in this dimension are locked — upgrade to view
                </p>
              </div>
            )}
          </div>

          {/* Dimension recommendations */}
          {dimension.recommendations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-divider-light">
              <h5 className="text-xs font-semibold text-ink-3 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-ink-2" />
                Recommendations
              </h5>
              <div className="space-y-1.5">
                {dimension.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs bg-ink/[0.03] border border-ink/10 rounded-lg p-2.5 text-ink-2">
                    <span className="font-medium text-ink mr-1">→</span> {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Unified Audit Section ─────────────────────────────────────────────────────
function UnifiedAuditSection({
  result,
  breakdown,
  isAdmin,
  plan,
  userId,
  siteUrl,
}: {
  result: AuditResult
  breakdown: ZoneBreakdown
  isAdmin: boolean
  plan: string | null
  userId?: string
  siteUrl?: string
}) {
  const isFullAccess = isAdmin || hasPaidAuditPlan(plan)
  const isTrial = !isAdmin && isAuditTrialPlan(plan)

  const allChecks = [
    ...breakdown.green_checks,
    ...breakdown.yellow_checks,
    ...breakdown.red_checks,
  ]

  const totalChecks = allChecks.length
  const totalFail = breakdown.green_fail + breakdown.yellow_fail + breakdown.red_fail

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink flex items-center gap-2">
          <FileCode className="w-5 h-5 text-ink-2" />
          AI Visibility Audit — 5 Dimensions × {totalChecks} Checks
        </h3>
        <div className="flex items-center gap-2">
          {totalFail > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-soft-bg text-red-soft border border-red-soft/30 rounded-full font-medium">
              {totalFail} issues found
            </span>
          )}
          {!isFullAccess && (
            <span className="text-xs text-ink-3 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Subscribe to unlock all
            </span>
          )}
        </div>
      </div>

      {/* Dimension cards */}
      {DIMENSION_MAP.map((dimConfig, idx) => {
        const dimension = result[dimConfig.key]
        const dimChecks = allChecks.filter(c => c.id.startsWith(dimConfig.prefix + '-'))

        // Gating per dimension
        let visibleChecks = dimChecks
        let locked = false
        let lockedCount = 0

        if (!isFullAccess) {
          const yellowChecks = dimChecks.filter(c => c.zone === 'yellow')
          const redChecks = dimChecks.filter(c => c.zone === 'red')

          if (isTrial) {
            const greenChecks = dimChecks.filter(c => c.zone === 'green')
            const visibleGreen = greenChecks.slice(0, Math.max(0, 10 - idx * 2))
            const hiddenGreen = greenChecks.length - visibleGreen.length
            lockedCount = hiddenGreen + yellowChecks.length + redChecks.length
            visibleChecks = visibleGreen
            locked = lockedCount > 0
          }
        }

        return (
          <UnifiedDimensionCard
            key={dimConfig.key}
            dimConfig={dimConfig}
            dimension={dimension}
            checks={visibleChecks}
            isLocked={locked}
            lockedCount={lockedCount}
            defaultOpen={idx === 0}
            userId={userId}
            siteUrl={siteUrl}
          />
        )
      })}
    </div>
  )
}

// ─── Dimension config (kept for backward compat, not used in main render) ─────
function getDimensionConfig(t: ReturnType<typeof useLanguage>['t']) {
  return [
    { key: 'ai_accessibility' as const, icon: <Shield className="w-5 h-5" />, label: t.dashboard.aiAccessibility },
    { key: 'semantic_structure' as const, icon: <Layers className="w-5 h-5" />, label: t.dashboard.semanticStructure },
    { key: 'content_citability' as const, icon: <FileText className="w-5 h-5" />, label: t.dashboard.contentCitability },
    { key: 'risk_boundary' as const, icon: <AlertOctagon className="w-5 h-5" />, label: t.dashboard.riskBoundary },
    { key: 'reusability' as const, icon: <Brain className="w-5 h-5" />, label: t.dashboard.reusability },
  ]
}

// ─── Main Page ─────────────────────────────────────────
export default function GEOAuditPage() {
  const { t } = useLanguage()
  const { user, role } = useAuth()
  const { plan } = useSubscription(user?.id, role)
  // Both admin and staff are internal users with full audit access.
  // Sidebar filtering ensures staff only reach pages they have permission for;
  // once here, their experience is identical to admin (no upsells, no locks).
  const isAdmin = role === 'admin' || role === 'staff'

  // Permission-guarded cross-feature navigation (for staff sub-page CTAs).
  const { navTo: navToFeature } = useFeatureNav()
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [auditingUrl, setAuditingUrl] = useState('')
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const autoRunRequestedRef = useRef(false)
  // Tracks whether the current auditResult came from a live run (true) or was
  // restored from localStorage (false). Auto-scroll only fires for live runs.
  const isLiveAuditRef = useRef(false)

  // ─── Restore from localStorage or URL param on mount ──
  useEffect(() => {
    setRecentUrls(getRecentUrls())
    // Check URL param (cross-module navigation, e.g. from Monitor re-audit)
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url')
    if (paramUrl) {
      setUrl(paramUrl)
      if (params.get('run') === '1') autoRunRequestedRef.current = true
      return
    }
    // Otherwise restore previous session
    try {
      const saved = localStorage.getItem('geo_audit_session')
      if (saved) {
        const session = JSON.parse(saved)
        if (session.url) setUrl(session.url)
        if (session.auditingUrl) setAuditingUrl(session.auditingUrl)
        if (session.auditResult) {
          isLiveAuditRef.current = false  // restored — do NOT auto-scroll
          setAuditResult(session.auditResult)
        }
      }
    } catch {}
  }, [])

  const refreshRecentUrls = useCallback(() => {
    setRecentUrls(getRecentUrls())
  }, [])

  // ─── Persist session to localStorage ──
  useEffect(() => {
    if (auditResult || url) {
      try {
        localStorage.setItem('geo_audit_session', JSON.stringify({
          url, auditingUrl, auditResult,
        }))
        // Also write audit result to shared key so Overview dashboard picks it up
        if (auditResult) {
          localStorage.setItem('alignment_geo_audit_result', JSON.stringify(auditResult))
          window.dispatchEvent(new CustomEvent('auditCompleted'))
        }
      } catch {}
    }
  }, [auditResult, url, auditingUrl])

  // Auto-scroll to results only when a LIVE audit completes (not on restore)
  useEffect(() => {
    if (auditResult && resultRef.current && isLiveAuditRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [auditResult])

  const handleRunAudit = async () => {
    const trimmed = url.trim()
    if (!trimmed) return

    if (!isValidUrl(trimmed)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com or example.com)')
      return
    }

    setAuditingUrl(trimmed)
    setIsAuditing(true)
    setError(null)
    setUrlError(null)
    setAuditResult(null)

    const response = await api.runGEOAudit(trimmed, user?.id)

    if (response.error) {
      setError(response.error)
    } else if (response.data) {
      isLiveAuditRef.current = true  // live run — allow auto-scroll
      setAuditResult(response.data)
      addRecentUrl(response.data.url)
      refreshRecentUrls()
      notifyCreditUsed()
    }

    setIsAuditing(false)
  }

  useEffect(() => {
    if (!autoRunRequestedRef.current || !url.trim() || isAuditing || auditResult) return
    autoRunRequestedRef.current = false
    handleRunAudit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isAuditing, auditResult])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuditing) {
      handleRunAudit()
    }
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (urlError) setUrlError(null)
  }

  const handleReset = () => {
    setUrl('')
    setAuditResult(null)
    setAuditingUrl('')
    try { localStorage.removeItem('geo_audit_session') } catch {}
    setError(null)
    setUrlError(null)
  }

  const handleRemoveRecentUrl = (urlToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeRecentUrl(urlToRemove)
    refreshRecentUrls()
  }

  const handleSelectRecentUrl = (recentUrl: string) => {
    setUrl(recentUrl)
    setUrlError(null)
    setShowRecentDropdown(false)
  }

  const clearAllRecentUrls = () => {
    localStorage.removeItem(RECENT_URLS_KEY)
    setRecentUrls([])
    setShowRecentDropdown(false)
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Header title={t.dashboard.geoAudit} subtitle={t.dashboard.geoAuditShort} />

      <div className="p-6 space-y-6">
        {/* ═══ GEO Audit Input Section ═══ */}
        <section className="bg-surface rounded-2xl border border-divider-light shadow-soft p-8 relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#C84B31]/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C84B31]/[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-soft-bg rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-red-soft" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">{t.dashboard.geoAudit}</h2>
                <p className="text-ink-3 text-sm">{t.dashboard.geoAuditDesc}</p>
              </div>
            </div>

            {/* URL Input */}
            <div className="mt-6 flex gap-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-3" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.dashboard.urlPlaceholder}
                  disabled={isAuditing}
                  className={`w-full pl-12 pr-4 py-4 bg-canvas border rounded-xl text-ink placeholder-ink-3 focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface transition-all outline-none text-lg disabled:opacity-50 ${
                    urlError ? 'border-red-soft/30' : isAuditing ? 'border-red-soft/30' : 'border-divider-light'
                  }`}
                />
              </div>
              <button
                onClick={handleRunAudit}
                disabled={!url.trim() || isAuditing}
                className="px-8 py-4 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t.dashboard.scanning}
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    {t.dashboard.runAudit}
                  </>
                )}
              </button>
              {/* Recent Records Dropdown */}
              {recentUrls.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                    className="px-5 py-4 bg-canvas border border-divider-light text-ink-2 text-sm font-medium rounded-xl hover:bg-surface-muted flex items-center gap-2 transition-colors whitespace-nowrap">
                    <History className="w-4 h-4" /> Recent ({recentUrls.length})
                  </button>
                  {showRecentDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-divider-light rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-divider-light">
                        <span className="text-xs text-ink-3 font-semibold uppercase tracking-wide">Recent Audits</span>
                        <button onClick={clearAllRecentUrls} className="text-[10px] text-red-soft hover:text-red-soft">Clear All</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {recentUrls.map(recentUrl => (
                          <div key={recentUrl} className="flex items-center group">
                            <button onClick={() => handleSelectRecentUrl(recentUrl)}
                              className="flex-1 text-left px-4 py-3 hover:bg-surface-warm border-b border-divider-light last:border-0 transition-colors flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-ink-3 group-hover:text-red-soft flex-shrink-0" />
                              <span className="text-sm text-ink-2 truncate">{recentUrl.replace(/^https?:\/\//, '')}</span>
                            </button>
                            <button onClick={(e) => handleRemoveRecentUrl(recentUrl, e)}
                              className="px-3 py-3 text-ink-3 hover:text-red-soft opacity-0 group-hover:opacity-100 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* URL validation error */}
            {urlError && (
              <div className="mt-3 flex items-center gap-2 text-red-soft text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {/* Error display */}
            {error && !isAuditing && (
              <div className="mt-4 p-4 bg-red-soft-bg border border-red-soft/30 rounded-xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-soft flex-shrink-0" />
                <p className="text-red-soft text-sm">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Scanning Progress Panel (replaces old inline list) ═══ */}
        {isAuditing && (
          <ScanProgressPanel url={auditingUrl} />
        )}

        {/* ═══ Audit Results ═══ */}
        {auditResult && (
          <div ref={resultRef} className="space-y-6">
            {/* Quick Insight Cards */}
            <InsightCards result={auditResult} />

            {/* Main Result: Score + Radar + Summary */}
            <section className="bg-surface rounded-2xl border border-divider-light shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Overall Score Ring + Meta */}
                <div className="p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-divider-light">
                  <ScoreRing score={auditResult.overall_score} />
                  <h3 className="text-xl font-bold text-ink mt-4">{t.dashboard.overallScore}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                      auditResult.overall_score >= 85 ? 'bg-sage-bg text-sage' :
                      auditResult.overall_score >= 65 ? 'bg-surface-warm text-ink-2' :
                      auditResult.overall_score >= 45 ? 'bg-caution-bg text-caution' :
                      'bg-red-soft-bg text-red-soft'
                    }`}>
                      Grade {auditResult.grade}
                    </span>
                  </div>

                  {/* URL info */}
                  <div className="mt-4 flex items-center gap-2 text-sm text-ink-3">
                    <Globe className="w-4 h-4" />
                    <a href={auditResult.url} target="_blank" rel="noopener noreferrer" className="hover:text-ink transition-colors flex items-center gap-1">
                      {auditResult.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {auditResult.page_title && (
                    <p className="text-xs text-ink-3 mt-1 text-center max-w-xs truncate">{auditResult.page_title}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-3">
                    <Clock className="w-3 h-3" />
                    {t.dashboard.auditDuration} {auditResult.audit_duration_seconds}s
                  </div>

                  <button
                    onClick={handleReset}
                    className="mt-4 px-4 py-2 text-sm text-ink-3 hover:text-ink border border-divider-light hover:border-ink rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Audit another site
                  </button>
                </div>

                {/* Radar Chart + Dimension Scores */}
                <div className="p-8 border-b lg:border-b-0 lg:border-r border-divider-light">
                  <h4 className="text-sm font-medium text-ink-3 uppercase tracking-wider mb-4">5 Dimension Overview</h4>

                  {/* Radar chart */}
                  <RadarChart scores={[
                    auditResult.ai_accessibility.score,
                    auditResult.semantic_structure.score,
                    auditResult.content_citability.score,
                    auditResult.risk_boundary.score,
                    auditResult.reusability.score,
                  ]} />

                  {/* Weight info */}
                  <p className="text-xs text-ink-3 mt-3 text-center">
                    Weight: D1 15% · D2 20% · D3 30% · D4 20% · D5 15%
                  </p>
                </div>

                {/* Check Summary + Top Recs */}
                <div className="p-8">
                  <h4 className="text-sm font-medium text-ink-3 uppercase tracking-wider mb-5">Audit Summary</h4>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <StatCard
                      icon={<CheckCircle className="w-5 h-5 text-white" />}
                      label={t.dashboard.passed}
                      value={auditResult.passed_checks}
                      color="bg-sage"
                    />
                    <StatCard
                      icon={<AlertTriangle className="w-5 h-5 text-white" />}
                      label={t.dashboard.warnings}
                      value={auditResult.warnings}
                      color="bg-caution"
                    />
                    <StatCard
                      icon={<XCircle className="w-5 h-5 text-white" />}
                      label={t.dashboard.critical}
                      value={auditResult.critical_issues}
                      color="bg-red-soft"
                    />
                    <StatCard
                      icon={<Search className="w-5 h-5 text-white" />}
                      label={t.dashboard.checksPerformed}
                      value={auditResult.total_checks}
                      color="bg-ink"
                    />
                  </div>

                  {/* Top Recommendations */}
                  {auditResult.top_recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-ink-2 mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-ink-2" />
                        {t.dashboard.topRecommendations}
                      </h5>
                      <div className="space-y-2">
                        {auditResult.top_recommendations.slice(0, 3).map((rec, i) => (
                          <div key={i} className="text-xs bg-ink/[0.03] border border-ink/10 rounded-lg p-2.5 text-ink-2">
                            <span className="font-medium text-ink mr-1">{i + 1}.</span> {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Unified Audit Section (5 Dimensions × 34 Checks merged) ── */}
            {auditResult.zone_breakdown && (
              <UnifiedAuditSection
                result={auditResult}
                breakdown={auditResult.zone_breakdown}
                isAdmin={isAdmin}
                plan={plan}
                userId={user?.id}
                siteUrl={auditResult.url}
              />
            )}

            {/* ── Layer 1 CTA ── */}
            {auditResult.zone_breakdown && (
              <Layer1CTA
                breakdown={auditResult.zone_breakdown}
                isAdmin={isAdmin}
                auditUrl={auditResult.url}
                onNavToFeature={navToFeature}
              />
            )}

          </div>
        )}

        {/* ═══ Empty State (before audit) ═══ */}
        {!auditResult && !isAuditing && (
          <section className="bg-surface rounded-2xl border border-divider-light overflow-hidden">
            {/* Hero section */}
            <div className="bg-gradient-to-br from-canvas to-surface p-10 text-center border-b border-divider-light">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-surface-muted rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-ink/5">
                  <Zap className="w-8 h-8 text-ink-2" />
                </div>
                <h3 className="text-2xl font-bold text-ink mb-3">
                  How does AI see your website?
                </h3>
                <p className="text-ink-3 text-lg leading-relaxed">
                  Our AI Readiness Audit analyzes your website across 5 critical dimensions to determine how well AI platforms (ChatGPT, Perplexity, Gemini) can discover, understand, and cite your content.
                </p>
              </div>
            </div>

            {/* 5 Dimension cards */}
            <div className="p-8">
              <h4 className="text-sm font-medium text-ink-3 uppercase tracking-wider mb-6 text-center">What We Analyze</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {[
                  { icon: <Shield className="w-6 h-6" />, label: 'AI Discoverability', desc: 'Do AI agents find your llms.txt, agent.json & access rules?', color: 'from-surface-warm to-surface-warm text-ink-2 border-divider' },
                  { icon: <Layers className="w-6 h-6" />, label: 'Semantic Structure & Format', desc: 'Is your content structured and format-negotiable for AI?', color: 'from-surface-warm to-surface-warm text-ink-2 border-divider' },
                  { icon: <FileText className="w-6 h-6" />, label: 'Content Citability', desc: 'Does your content have quotable fact units?', color: 'from-surface-warm to-surface-warm text-ink-2 border-divider' },
                  { icon: <AlertOctagon className="w-6 h-6" />, label: 'Risk Boundary & Trust', desc: 'Is your content safe for AI to reference?', color: 'from-red-soft-bg to-red-soft-bg text-red-soft border-red-soft/30' },
                  { icon: <Brain className="w-6 h-6" />, label: 'Reusability & Memory', desc: 'Will AI reuse your content across answers?', color: 'from-sage-bg to-sage-bg text-sage border-sage/30' },
                ].map((dim, i) => (
                  <div key={i} className={`flex flex-col items-center gap-3 p-5 bg-gradient-to-br ${dim.color} rounded-xl border text-center`}>
                    <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center shadow-sm">
                      {dim.icon}
                    </div>
                    <h5 className="text-sm font-semibold">{dim.label}</h5>
                    <p className="text-xs opacity-75 leading-relaxed">{dim.desc}</p>
                  </div>
                ))}
              </div>

              {/* Try these URLs */}
              <div className="text-center">
                <p className="text-sm text-ink-3 mb-3">Try auditing one of these websites:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['myticktalk.com', 'stripe.com', 'openai.com', 'notion.so', 'linear.app'].map((example) => (
                    <button
                      key={example}
                      onClick={() => { setUrl(example); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className="px-4 py-2 text-sm bg-surface-warm hover:bg-ink/5 hover:text-ink text-ink-2 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-ink/20"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
