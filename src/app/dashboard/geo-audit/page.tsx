'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import {
  api, AuditResult, DimensionScore, ZoneCheck, ZoneBreakdown, notifyCreditUsed,
  fixApi, FixPlan, FixResult, FixZone, GenerateFixRequest, RollbackResult,
} from '@/lib/api'
import {
  Search, Globe, Shield, Layers, FileText, AlertOctagon, Brain,
  CheckCircle, AlertTriangle, XCircle, ArrowRight, ArrowDown,
  Loader2, Sparkles, TrendingUp, TrendingDown, Clock, ExternalLink,
  RotateCcw, X, History, Zap, Target, Award, Download, Share2,
  Eye, BookOpen, ShieldCheck, AlertCircle, RefreshCw, BarChart3,
  Lock, Wrench, Bot, FileCode, ChevronDown, ChevronUp, Building2,
  Timer, Wand2, Copy, CheckCheck, Terminal, AlertCircle as AlertCircleIcon,
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
  }>
}

const AUDIT_OPT_CONTEXT_KEY = 'audit_to_opt_context'
const AUDIT_OPT_TTL_MS = 60 * 60 * 1000 // 1 hour

function storeAuditContext(url: string, breakdown: ZoneBreakdown) {
  if (typeof window === 'undefined') return
  try {
    const allChecks = [
      ...breakdown.red_checks,
      ...breakdown.yellow_checks,
      ...breakdown.green_checks,
    ]
    const failingChecks = allChecks.filter(c => c.status !== 'pass')
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
  if (score >= 90) return { percentile: 95, label: 'Top 5%', color: 'text-green-600' }
  if (score >= 80) return { percentile: 85, label: 'Top 15%', color: 'text-green-600' }
  if (score >= 70) return { percentile: 70, label: 'Top 30%', color: 'text-blue-600' }
  if (score >= 60) return { percentile: 50, label: 'Top 50%', color: 'text-blue-600' }
  if (score >= 45) return { percentile: 35, label: 'Top 65%', color: 'text-yellow-600' }
  if (score >= 30) return { percentile: 20, label: 'Bottom 35%', color: 'text-orange-600' }
  return { percentile: 10, label: 'Bottom 15%', color: 'text-red-600' }
}

// ─── Score Ring Component ──────────────────────────────
function ScoreRing({ score, size = 180, strokeWidth = 12, animate = true }: {
  score: number; size?: number; strokeWidth?: number; animate?: boolean
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getColor = (s: number) => {
    if (s >= 85) return { stroke: '#22c55e', text: 'text-green-500', glow: 'shadow-green-500/20' }
    if (s >= 65) return { stroke: '#3b82f6', text: 'text-blue-500', glow: 'shadow-blue-500/20' }
    if (s >= 45) return { stroke: '#eab308', text: 'text-yellow-500', glow: 'shadow-yellow-500/20' }
    return { stroke: '#ef4444', text: 'text-red-600', glow: 'shadow-red-500/20' }
  }

  const color = getColor(score)
  const benchmark = getScoreBenchmark(score)

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="#f3f4f6" strokeWidth={strokeWidth} fill="none"
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
          <span className="text-gray-400 text-sm">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-xs font-semibold ${benchmark.color} bg-gray-50 px-3 py-1 rounded-full`}>
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
  const labels = ['Accessibility', 'Structure', 'Citability', 'Risk', 'Reusability']

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
    if (s >= 85) return '#22c55e'
    if (s >= 65) return '#3b82f6'
    if (s >= 45) return '#eab308'
    return '#ef4444'
  }

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Grid */}
      {gridLevels.map(level => (
        <polygon
          key={level}
          points={getPolygon(level)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
          opacity={0.6}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const p = getPoint(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="1" opacity={0.5} />
      })}

      {/* Data polygon */}
      <polygon
        points={dataPolygon}
        fill="rgba(249, 115, 22, 0.15)"
        stroke="#f97316"
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
            className="text-[10px] fill-gray-500 font-medium"
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
  { icon: Shield, label: 'AI Accessibility', desc: 'Checking crawlability & robots.txt...' },
  { icon: Layers, label: 'Semantic Structure', desc: 'Analyzing headings, paragraphs & sections...' },
  { icon: FileText, label: 'Content Citability', desc: 'Evaluating fact units & objectivity...' },
  { icon: AlertOctagon, label: 'Risk Boundary', desc: 'Reviewing claims & safety signals...' },
  { icon: Brain, label: 'Reusability', desc: 'Assessing FAQ, definitions & memory signals...' },
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
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 w-full">
        <div
          className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Analyzing your website...</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-primary">{Math.round(progress)}%</p>
            <p className="text-xs text-gray-400">{elapsed}s elapsed</p>
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
                    ? 'border-green-200 bg-green-50'
                    : isActive
                    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-gray-100 bg-gray-50 opacity-50'
                }`}
              >
                {/* Step number badge */}
                <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>

                <div className="flex flex-col items-center text-center gap-2 pt-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isDone
                      ? 'bg-green-100 text-green-600'
                      : isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-400'
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
                    isDone ? 'text-green-700' : isActive ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-gray-400 animate-pulse">{step.desc}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Skeleton preview */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center animate-pulse">
            <div className="w-24 h-24 rounded-full bg-gray-200 mb-3" />
            <div className="w-20 h-4 bg-gray-200 rounded" />
          </div>
          <div className="bg-gray-50 rounded-xl p-6 space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-3 bg-gray-200 rounded" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                <div className="w-6 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-6 space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 bg-gray-200 rounded-lg" />
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
    { key: 'ai_accessibility', label: 'AI Accessibility', icon: <Shield className="w-5 h-5" />, score: result.ai_accessibility.score },
    { key: 'semantic_structure', label: 'Semantic Structure', icon: <Layers className="w-5 h-5" />, score: result.semantic_structure.score },
    { key: 'content_citability', label: 'Content Citability', icon: <FileText className="w-5 h-5" />, score: result.content_citability.score },
    { key: 'risk_boundary', label: 'Risk Boundary', icon: <AlertOctagon className="w-5 h-5" />, score: result.risk_boundary.score },
    { key: 'reusability', label: 'Reusability', icon: <Brain className="w-5 h-5" />, score: result.reusability.score },
  ]

  const sorted = [...dimEntries].sort((a, b) => b.score - a.score)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strongest */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Strongest Dimension</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600">{strongest.icon}</span>
            <span className="font-semibold text-gray-900">{strongest.label}</span>
          </div>
          <span className="text-2xl font-bold font-mono text-green-600">{strongest.score}</span>
        </div>
        <p className="text-xs text-green-700 mt-2 opacity-75">
          This is your best-performing area for AI visibility.
        </p>
      </div>

      {/* Weakest */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Priority to Fix</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500">{weakest.icon}</span>
            <span className="font-semibold text-gray-900">{weakest.label}</span>
          </div>
          <span className="text-2xl font-bold font-mono text-red-600">{weakest.score}</span>
        </div>
        <p className="text-xs text-red-700 mt-2 opacity-75">
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
    excellent: { bg: 'bg-green-100', text: 'text-green-700', label: t.dashboard.excellent, border: 'border-green-200' },
    good: { bg: 'bg-blue-100', text: 'text-blue-700', label: t.dashboard.good, border: 'border-blue-200' },
    needs_work: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: t.dashboard.needsWork, border: 'border-yellow-200' },
    poor: { bg: 'bg-red-100', text: 'text-red-700', label: t.dashboard.poor, border: 'border-red-200' },
  }

  const status = statusConfig[dimension.status] || statusConfig.poor

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500'
    if (score >= 65) return 'bg-blue-500'
    if (score >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const passedCount = dimension.details.filter(d => d.startsWith('✅')).length
  const warningCount = dimension.details.filter(d => d.startsWith('⚠️')).length
  const issueCount = dimension.details.filter(d => d.startsWith('❌')).length

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all ${expanded ? `${status.border} shadow-md` : 'border-gray-200'}`}>
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
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">D{index}</span>
                {label}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">{dimension.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.label}
            </span>
            <span className="text-2xl font-bold font-mono text-gray-900">{dimension.score}</span>
          </div>
        </div>

        {/* Score Bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${getBarColor(dimension.score)}`}
            style={{ width: `${dimension.score}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-3">
            {passedCount > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />{passedCount}</span>}
            {warningCount > 0 && <span className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="w-3 h-3" />{warningCount}</span>}
            {issueCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3 h-3" />{issueCount}</span>}
          </span>
          <span className="flex items-center gap-1 text-primary/70 hover:text-primary">
            {expanded ? 'Hide' : 'View'} details
            <ArrowRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Findings */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {t.dashboard.findings}
            </h5>
            <div className="space-y-1.5">
              {dimension.details.map((detail, i) => (
                <div key={i} className={`text-sm py-1.5 px-3 rounded-lg flex items-start gap-2 ${
                  detail.startsWith('✅') ? 'bg-green-50 text-green-800' :
                  detail.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-800' :
                  detail.startsWith('❌') ? 'bg-red-50 text-red-800' : 'text-gray-600'
                }`}>
                  <span className="flex-shrink-0 mt-0.5">
                    {detail.startsWith('✅') ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                     detail.startsWith('⚠️') ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                     detail.startsWith('❌') ? <XCircle className="w-4 h-4 text-red-500" /> : null}
                  </span>
                  <span>{detail.replace(/^[✅⚠️❌]\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {dimension.recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                {t.dashboard.recommendations}
              </h5>
              <div className="space-y-2">
                {dimension.recommendations.map((rec, i) => (
                  <div key={i} className="text-sm bg-primary/5 border border-primary/10 rounded-lg p-3 text-gray-700">
                    <span className="font-medium text-primary mr-1">→</span> {rec}
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 font-mono">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
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
    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
    : isYellow
    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
    : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'

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
        <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Claude is generating the fix…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-start gap-1.5">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Plan display */}
      {plan && !applyResult && (
        <div className={`mt-2 rounded-xl border overflow-hidden ${
          isRed ? 'border-red-200 bg-red-50/60' :
          isYellow ? 'border-amber-200 bg-amber-50/60' :
          'border-green-200 bg-green-50/60'
        }`}>
          {/* Plan header */}
          <div className="px-3 py-2.5 flex items-start justify-between gap-2">
            <div>
              <p className={`text-xs font-semibold ${
                isRed ? 'text-red-800' : isYellow ? 'text-amber-800' : 'text-green-800'
              }`}>
                {isRed ? '⛔ Engineer Guide' : isYellow ? '✏️ AI Draft' : '✅ Auto-fix'} — {plan.fix_title}
              </p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{plan.fix_description}</p>
              {plan.model_used && (
                <p className="text-[10px] text-gray-400 mt-1 font-mono">via {plan.model_used} · ~{plan.estimated_minutes}min</p>
              )}
            </div>
            <button
              onClick={() => { setPlan(null); setError(null) }}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Code block */}
          {plan.fix_code && (
            <div className="mx-3 mb-3">
              <div className="relative">
                <pre className={`text-[11px] font-mono rounded-lg p-3 overflow-x-auto border max-h-52 whitespace-pre-wrap break-all ${
                  isRed ? 'bg-red-900/5 border-red-200 text-red-900' :
                  isYellow ? 'bg-amber-900/5 border-amber-200 text-amber-900' :
                  'bg-green-900/5 border-green-200 text-green-900'
                }`}>
                  {plan.fix_code}
                </pre>
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-1 bg-white/80 hover:bg-white border border-gray-200 rounded-md text-gray-600 transition-all"
                >
                  {copied ? <CheckCheck className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* Engineer guide */}
          {plan.engineer_guide && (
            <div className="mx-3 mb-3">
              <div className="bg-white/70 border border-red-200 rounded-lg p-3 max-h-60 overflow-y-auto">
                <pre className="text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {plan.engineer_guide}
                </pre>
              </div>
            </div>
          )}

          {/* Risk note */}
          {plan.risk_note && (
            <div className="mx-3 mb-3 flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">{plan.risk_note}</p>
            </div>
          )}

          {/* Apply steps summary */}
          {plan.apply_steps.length > 0 && !isRed && (
            <div className="mx-3 mb-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">How to apply</p>
              <ol className="space-y-1">
                {plan.apply_steps.map(step => (
                  <li key={step.step_number} className="flex gap-2 text-[11px] text-gray-600">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${
                      isYellow ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
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
                  className="mt-0.5 w-3.5 h-3.5 accent-amber-600"
                />
                <span className="text-[11px] text-amber-800 leading-relaxed">
                  I have reviewed this draft and confirm it is accurate and appropriate for my website.
                </span>
              </label>
            </div>
          )}

          {/* Action row */}
          {!isRed && (
            <div className="px-3 pb-3 flex items-center gap-2">
              {plan.fix_code && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-lg font-medium transition-all"
                >
                  {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Code'}
                </button>
              )}
              {(isGreen || (isYellow && approved)) && (
                <button
                  onClick={handleApply}
                  disabled={applying || (isYellow && !approved)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 ${
                    isYellow
                      ? 'bg-amber-600 hover:bg-amber-700 text-white disabled:bg-amber-300'
                      : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
                  }`}
                >
                  {applying
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
                    : <><Wand2 className="w-3.5 h-3.5" /> {isYellow ? 'Apply with Approval' : 'Apply Now'}</>
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
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`flex items-start gap-1.5 p-3 ${
            applyResult.success ? 'text-green-800' : 'text-red-700'
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
            <div className="border-t border-green-200 bg-white/60 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-gray-500">Changed your mind? Restore the previous state.</p>
              {!showRollbackConfirm ? (
                <button
                  onClick={() => setShowRollbackConfirm(true)}
                  disabled={rollingBack}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white border border-gray-300 hover:border-red-300 hover:text-red-600 text-gray-600 rounded-lg font-medium transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  Rollback Fix
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-red-700 font-medium">Confirm rollback?</span>
                  <button
                    onClick={handleRollback}
                    disabled={rollingBack}
                    className="text-[11px] px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    {rollingBack
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Restoring…</>
                      : 'Yes, rollback'
                    }
                  </button>
                  <button
                    onClick={() => setShowRollbackConfirm(false)}
                    className="text-[11px] px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual apply — no rollback, but remind user how to undo */}
          {applyResult.success && !applyResult.rollback_available && (
            <div className="border-t border-green-200 bg-white/60 px-3 py-2">
              <p className="text-[11px] text-gray-500">
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
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-start gap-1.5">
            {rollbackResult.success
              ? <RotateCcw className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
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
  const color = score >= 95 ? 'text-green-600 bg-green-50' :
                score >= 85 ? 'text-blue-600 bg-blue-50' :
                              'text-orange-600 bg-orange-50'
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
    ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
    : check.status === 'warning'
    ? <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
    : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />

  const fixTypeBadge: Record<string, { label: string; cls: string }> = {
    auto: { label: 'Auto-fix', cls: 'bg-green-100 text-green-700' },
    ai_draft: { label: 'AI Draft', cls: 'bg-blue-100 text-blue-700' },
    manual_required: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
  }
  const badge = fixTypeBadge[check.fix_type] || fixTypeBadge.manual_required
  const isExpandable = !!(check.fix_suggestion || check.evidence_basis || check.standard_ref || check.status !== 'pass')

  if (isLocked) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50 opacity-60 select-none">
        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-sm text-gray-400 blur-[3px]">████████████████████</span>
        <span className="text-xs text-gray-400">Upgrade to view</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${
      check.status === 'pass' ? 'border-gray-100 bg-white' :
      check.status === 'warning' ? 'border-yellow-100 bg-yellow-50/40' :
      'border-red-100 bg-red-50/40'
    }`}>
      <button
        onClick={() => isExpandable && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${isExpandable ? 'cursor-pointer hover:bg-gray-50/80' : 'cursor-default'}`}
      >
        {statusIcon}
        <span className="flex-1 text-sm text-gray-700 min-w-0">
          <span className="font-mono text-[10px] text-gray-400 mr-1.5">{check.id}</span>
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
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-2">
          <p className="text-xs text-gray-600 leading-relaxed">{check.detail}</p>

          {/* Evidence section */}
          {check.evidence_basis && (
            <div>
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                View evidence
              </button>
              {showEvidence && (
                <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-[11px] font-mono text-gray-600 break-all leading-relaxed">
                  {check.evidence_basis}
                  {check.standard_ref && (
                    <div className="mt-1.5 pt-1.5 border-t border-gray-200 font-sans text-[10px] text-gray-400 not-italic">
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
              check.zone === 'red' ? 'bg-red-50 border border-red-200 text-red-700' :
              check.zone === 'yellow' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
              'bg-green-50 border border-green-200 text-green-700'
            }`}>
              <span className="font-medium">Fix: </span>{check.fix_suggestion}
            </div>
          )}

          {/* Fix Pipeline (Phase 4) — show for failing checks when user is logged in */}
          {check.status !== 'pass' && userId && siteUrl && (
            <div className="pt-1">
              {!showFixPanel ? (
                <button
                  onClick={() => setShowFixPanel(true)}
                  className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                    check.zone === 'red'
                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                      : check.zone === 'yellow'
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'
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
      headerBg: 'bg-green-50 border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      badge: 'bg-green-100 text-green-700',
      icon: <Zap className="w-4 h-4" />,
    },
    yellow: {
      label: 'Yellow Zone',
      sublabel: 'AI-detectable · Engineer review required',
      headerBg: 'bg-yellow-50 border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-700',
      icon: <Wrench className="w-4 h-4" />,
    },
    red: {
      label: 'Red Zone',
      sublabel: 'Manual operation only · High risk',
      headerBg: 'bg-red-50 border-red-200',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
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
            <h4 className="font-bold text-gray-900">{config.label}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
              {checks.length} checks
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{config.sublabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />{passCount} pass
            </span>
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-medium">
                <XCircle className="w-3.5 h-3.5" />{failCount} fix
              </span>
            )}
          </div>
          {isLocked ? <Lock className="w-4 h-4 text-gray-400" /> : (
            open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 bg-white border-t border-gray-100 space-y-1.5">
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
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <Lock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">
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
function Layer1CTA({ breakdown, isAdmin, auditUrl }: { breakdown: ZoneBreakdown; isAdmin: boolean; auditUrl: string }) {
  const totalFail = breakdown.green_fail + breakdown.yellow_fail + breakdown.red_fail
  const hoursLow = breakdown.fix_effort_hours_low
  const hoursHigh = breakdown.fix_effort_hours_high
  const weeksLow = Math.max(1, Math.ceil(hoursLow / 40))
  const weeksHigh = Math.max(1, Math.ceil(hoursHigh / 40))

  const handleFixClick = () => {
    storeAuditContext(auditUrl, breakdown)
    window.location.href = buildOptUrl(auditUrl)
  }

  if (isAdmin) {
    return (
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <span className="text-sm font-semibold text-green-400">Admin Mode — Full Access</span>
          </div>
          {totalFail > 0 && (
            <button
              onClick={handleFixClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all"
            >
              <Zap className="w-4 h-4" />
              Fix These Issues →
            </button>
          )}
        </div>
        <p className="text-sm text-gray-300">
          You have full Layer 1 access. All {34} checks, fix suggestions, and zone details are visible.
          Use the Fix Engine data above to build delivery workflows.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-400">{breakdown.green_fail}</p>
            <p className="text-xs text-gray-400 mt-0.5">Green issues</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-yellow-400">{breakdown.yellow_fail}</p>
            <p className="text-xs text-gray-400 mt-0.5">Yellow issues</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-2xl font-bold text-red-400">{breakdown.red_fail}</p>
            <p className="text-xs text-gray-400 mt-0.5">Red issues</p>
          </div>
        </div>
      </div>
    )
  }

  if (totalFail === 0) return null

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-5 h-5 text-orange-400" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Layer 1 · AI Visibility Infrastructure</span>
        </div>
        <h3 className="text-xl font-bold text-white">一次性改造，长期受益</h3>
        <p className="text-sm text-gray-400 mt-1">
          Your site has {totalFail} issues across {breakdown.green_fail} green, {breakdown.yellow_fail} yellow, and {breakdown.red_fail} red zone checks.
        </p>
      </div>

      {/* Fix Effort Estimator */}
      <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-white/10">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Timer className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400 font-medium">DIY 修复估算</p>
          </div>
          <p className="text-2xl font-bold text-white">{hoursLow}–{hoursHigh}h</p>
          <p className="text-xs text-gray-500 mt-1">≈ {weeksLow}–{weeksHigh} weeks solo</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-4 h-4 text-orange-400" />
            <p className="text-xs text-gray-400 font-medium">Alignment 专家</p>
          </div>
          <p className="text-2xl font-bold text-orange-400">6–8 weeks</p>
          <p className="text-xs text-gray-500 mt-1">全栈交付 · 验收保障</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Bot className="w-4 h-4 text-blue-400" />
            <p className="text-xs text-gray-400 font-medium">Red Zone 操作</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{breakdown.red_fail}</p>
          <p className="text-xs text-gray-500 mt-1">需专家介入，不能自行操作</p>
        </div>
      </div>

      {/* Pricing row */}
      <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-300">
            黄区和红区修复需要 GEO 专业知识。错误修改可能导致 <span className="text-red-400 font-semibold">Google 惩罚或网站崩溃</span>。
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {breakdown.yellow_fail > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <Wrench className="w-3 h-3" />{breakdown.yellow_fail} Yellow需工程师
              </span>
            )}
            {breakdown.red_fail > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertOctagon className="w-3 h-3" />{breakdown.red_fail} Red需人工
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-shrink-0">
          {breakdown.green_fail > 0 && (
            <button
              onClick={handleFixClick}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all text-sm whitespace-nowrap text-center flex items-center gap-2 justify-center"
            >
              <Zap className="w-4 h-4" />
              Fix {breakdown.green_fail} Green Issues Now →
            </button>
          )}
          <a
            href="/pricing"
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all text-sm whitespace-nowrap text-center shadow-lg shadow-orange-500/20"
          >
            查看 Layer 1 服务 — 从 $2,999 起
          </a>
          <p className="text-[10px] text-gray-500 text-center">一次性 · 6–8 周交付 · 30天效果追踪</p>
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
  // admin: full access
  // enterprise/growth: all zones visible
  // starter: green full, yellow/red locked
  // trial (plan=null): green first 10, rest locked
  const isFullAccess = isAdmin || plan === 'enterprise' || plan === 'growth'
  const isStarterOnly = !isAdmin && (plan === 'starter')
  const isTrial = !isAdmin && !plan

  const greenLocked = isTrial ? Math.max(0, breakdown.green_checks.length - 10) : 0
  const yellowLocked = (isStarterOnly || isTrial) ? breakdown.yellow_checks.length : 0
  const redLocked = (isStarterOnly || isTrial) ? breakdown.red_checks.length : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          Layer 1 — AI Visibility Infrastructure Audit
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {breakdown.green_checks.length + breakdown.yellow_checks.length + breakdown.red_checks.length} checks
          </span>
        </h3>
        {!isFullAccess && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            {plan === 'starter' ? 'Upgrade to Growth for Yellow/Red zones' : 'Subscribe to unlock all zones'}
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
    Icon: Shield, label: 'AI Accessibility',
    colorSet: {
      iconBg: 'bg-blue-50', iconText: 'text-blue-600',
      bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700',
      border: 'border-blue-100',
    },
  },
  {
    key: 'semantic_structure' as const, prefix: 'D2',
    Icon: Layers, label: 'Semantic Structure',
    colorSet: {
      iconBg: 'bg-purple-50', iconText: 'text-purple-600',
      bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700',
      border: 'border-purple-100',
    },
  },
  {
    key: 'content_citability' as const, prefix: 'D3',
    Icon: FileText, label: 'Content Citability',
    colorSet: {
      iconBg: 'bg-orange-50', iconText: 'text-orange-600',
      bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700',
      border: 'border-orange-100',
    },
  },
  {
    key: 'risk_boundary' as const, prefix: 'D4',
    Icon: AlertOctagon, label: 'Risk Boundary',
    colorSet: {
      iconBg: 'bg-red-50', iconText: 'text-red-600',
      bar: 'bg-red-500', badge: 'bg-red-100 text-red-700',
      border: 'border-red-100',
    },
  },
  {
    key: 'reusability' as const, prefix: 'D5',
    Icon: Brain, label: 'Reusability',
    colorSet: {
      iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
      bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-100',
    },
  },
]

// ─── Zone Badge (Fix Difficulty) ─────────────────────────────────────────────
function ZoneDifficultyBadge({ zone }: { zone: 'green' | 'yellow' | 'red' }) {
  if (zone === 'green') return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap flex-shrink-0">
      <Zap className="w-2.5 h-2.5" />AI Fix
    </span>
  )
  if (zone === 'yellow') return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium whitespace-nowrap flex-shrink-0">
      <Wrench className="w-2.5 h-2.5" />Engineer
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap flex-shrink-0">
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
    if (s >= 85) return 'bg-green-500'
    if (s >= 65) return 'bg-blue-500'
    if (s >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status !== 'pass').length
  const greenFail = checks.filter(c => c.zone === 'green' && c.status !== 'pass').length
  const yellowFail = checks.filter(c => c.zone === 'yellow' && c.status !== 'pass').length
  const redFail = checks.filter(c => c.zone === 'red' && c.status !== 'pass').length

  const statusLabel = score >= 85 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Needs Work' : 'Poor'
  const statusColor = score >= 85 ? 'bg-green-100 text-green-700' : score >= 65 ? 'bg-blue-100 text-blue-700' : score >= 45 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${open ? colorSet.border + ' shadow-md border' : 'border-gray-200'}`}>
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
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{prefix}</span>
                {label}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-2xl font-bold font-mono text-gray-900">{score}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-2">{dimension.description}</p>

            {/* Score bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBarColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Summary row */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-3">
                {passCount > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />{passCount} pass</span>}
                {greenFail > 0 && <span className="flex items-center gap-1 text-green-600"><Zap className="w-3 h-3" />{greenFail} AI-fix</span>}
                {yellowFail > 0 && <span className="flex items-center gap-1 text-amber-600"><Wrench className="w-3 h-3" />{yellowFail} engineer</span>}
                {redFail > 0 && <span className="flex items-center gap-1 text-red-600"><AlertOctagon className="w-3 h-3" />{redFail} manual</span>}
              </span>
              <span className="flex items-center gap-1 text-primary/70 hover:text-primary">
                {open ? 'Hide' : 'View'} {checks.length} checks
                <ArrowRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Zone checks */}
      {open && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {/* Fix difficulty legend */}
          <div className="flex items-center gap-3 py-2.5 mb-2 text-[10px] text-gray-400 border-b border-gray-50">
            <span className="font-semibold uppercase tracking-wide">Fix Difficulty:</span>
            <span className="flex items-center gap-1 text-green-600"><Zap className="w-2.5 h-2.5" />AI Auto-fix</span>
            <span className="flex items-center gap-1 text-amber-600"><Wrench className="w-2.5 h-2.5" />Engineer Review</span>
            <span className="flex items-center gap-1 text-red-600"><AlertOctagon className="w-2.5 h-2.5" />Manual Only</span>
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
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <Lock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">{lockedCount} checks</span> in this dimension are locked — upgrade to view
                </p>
              </div>
            )}
          </div>

          {/* Dimension recommendations */}
          {dimension.recommendations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Recommendations
              </h5>
              <div className="space-y-1.5">
                {dimension.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs bg-primary/5 border border-primary/10 rounded-lg p-2.5 text-gray-700">
                    <span className="font-medium text-primary mr-1">→</span> {rec}
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
  const isFullAccess = isAdmin || plan === 'enterprise' || plan === 'growth'
  const isStarterOnly = !isAdmin && plan === 'starter'
  const isTrial = !isAdmin && !plan

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
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          AI Visibility Audit — 5 Dimensions × {totalChecks} Checks
        </h3>
        <div className="flex items-center gap-2">
          {totalFail > 0 && (
            <span className="text-xs px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full font-medium">
              {totalFail} issues found
            </span>
          )}
          {!isFullAccess && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {isStarterOnly ? 'Upgrade for Yellow/Red zones' : 'Subscribe to unlock all'}
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
          } else if (isStarterOnly) {
            const greenChecks = dimChecks.filter(c => c.zone === 'green')
            lockedCount = yellowChecks.length + redChecks.length
            visibleChecks = [...greenChecks, ...yellowChecks.slice(0, 1), ...redChecks.slice(0, 1)]
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
  const isAdmin = role === 'admin'
  const [url, setUrl] = useState('')
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [auditingUrl, setAuditingUrl] = useState('')
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
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
    <div className="min-h-screen bg-gray-50/50">
      <Header title={t.dashboard.geoAudit} subtitle={t.dashboard.geoAuditShort} />

      <div className="p-6 space-y-6">
        {/* ═══ GEO Audit Input Section ═══ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-soft p-8 relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.dashboard.geoAudit}</h2>
                <p className="text-gray-500 text-sm">{t.dashboard.geoAuditDesc}</p>
              </div>
            </div>

            {/* URL Input */}
            <div className="mt-6 flex gap-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.dashboard.urlPlaceholder}
                  disabled={isAuditing}
                  className={`w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 focus:bg-white transition-all outline-none text-lg disabled:opacity-50 ${
                    urlError ? 'border-red-300' : isAuditing ? 'border-red-200' : 'border-gray-200'
                  }`}
                />
              </div>
              <button
                onClick={handleRunAudit}
                disabled={!url.trim() || isAuditing}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md"
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
                    className="px-5 py-4 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 flex items-center gap-2 transition-colors whitespace-nowrap">
                    <History className="w-4 h-4" /> Recent ({recentUrls.length})
                  </button>
                  {showRecentDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Recent Audits</span>
                        <button onClick={clearAllRecentUrls} className="text-[10px] text-red-500 hover:text-red-600">Clear All</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {recentUrls.map(recentUrl => (
                          <div key={recentUrl} className="flex items-center group">
                            <button onClick={() => handleSelectRecentUrl(recentUrl)}
                              className="flex-1 text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 flex-shrink-0" />
                              <span className="text-sm text-gray-600 truncate">{recentUrl.replace(/^https?:\/\//, '')}</span>
                            </button>
                            <button onClick={(e) => handleRemoveRecentUrl(recentUrl, e)}
                              className="px-3 py-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
              <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {/* Error display */}
            {error && !isAuditing && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
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
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                {/* Overall Score Ring + Meta */}
                <div className="p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-100">
                  <ScoreRing score={auditResult.overall_score} />
                  <h3 className="text-xl font-bold text-gray-900 mt-4">{t.dashboard.overallScore}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                      auditResult.overall_score >= 85 ? 'bg-green-100 text-green-700' :
                      auditResult.overall_score >= 65 ? 'bg-blue-100 text-blue-700' :
                      auditResult.overall_score >= 45 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      Grade {auditResult.grade}
                    </span>
                  </div>

                  {/* URL info */}
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-4 h-4" />
                    <a href={auditResult.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
                      {auditResult.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {auditResult.page_title && (
                    <p className="text-xs text-gray-400 mt-1 text-center max-w-xs truncate">{auditResult.page_title}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {t.dashboard.auditDuration} {auditResult.audit_duration_seconds}s
                  </div>

                  <button
                    onClick={handleReset}
                    className="mt-4 px-4 py-2 text-sm text-gray-500 hover:text-primary border border-gray-200 hover:border-primary rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Audit another site
                  </button>
                </div>

                {/* Radar Chart + Dimension Scores */}
                <div className="p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">5 Dimension Overview</h4>

                  {/* Radar chart */}
                  <RadarChart scores={[
                    auditResult.ai_accessibility.score,
                    auditResult.semantic_structure.score,
                    auditResult.content_citability.score,
                    auditResult.risk_boundary.score,
                    auditResult.reusability.score,
                  ]} />

                  {/* Weight info */}
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Weight: D1 15% · D2 20% · D3 30% · D4 20% · D5 15%
                  </p>
                </div>

                {/* Check Summary + Top Recs */}
                <div className="p-8">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-5">Audit Summary</h4>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <StatCard
                      icon={<CheckCircle className="w-5 h-5 text-white" />}
                      label={t.dashboard.passed}
                      value={auditResult.passed_checks}
                      color="bg-green-500"
                    />
                    <StatCard
                      icon={<AlertTriangle className="w-5 h-5 text-white" />}
                      label={t.dashboard.warnings}
                      value={auditResult.warnings}
                      color="bg-yellow-500"
                    />
                    <StatCard
                      icon={<XCircle className="w-5 h-5 text-white" />}
                      label={t.dashboard.critical}
                      value={auditResult.critical_issues}
                      color="bg-red-500"
                    />
                    <StatCard
                      icon={<Search className="w-5 h-5 text-white" />}
                      label={t.dashboard.checksPerformed}
                      value={auditResult.total_checks}
                      color="bg-gray-500"
                    />
                  </div>

                  {/* Top Recommendations */}
                  {auditResult.top_recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        {t.dashboard.topRecommendations}
                      </h5>
                      <div className="space-y-2">
                        {auditResult.top_recommendations.slice(0, 3).map((rec, i) => (
                          <div key={i} className="text-xs bg-primary/5 border border-primary/10 rounded-lg p-2.5 text-gray-700">
                            <span className="font-medium text-primary mr-1">{i + 1}.</span> {rec}
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
              />
            )}

            {/* ── Cross-Module CTAs: Next Steps ── */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100 p-6">
              <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider mb-1">Next Steps</h3>
              <p className="text-xs text-red-600 mb-4">Based on your audit results, take action to improve AI visibility.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    if (auditResult.zone_breakdown) storeAuditContext(auditResult.url, auditResult.zone_breakdown)
                    window.location.href = buildOptUrl(auditResult.url)
                  }}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors group text-left w-full">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-200 transition-colors flex-shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Optimize Now</p>
                    <p className="text-[10px] text-gray-500">
                      {auditResult.zone_breakdown
                        ? `${auditResult.zone_breakdown.green_fail + auditResult.zone_breakdown.yellow_fail + auditResult.zone_breakdown.red_fail} issues → fix plan`
                        : 'Generate fix plan & code'}
                    </p>
                  </div>
                </button>
                <a href="/dashboard/geo-content"
                  className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-purple-50 border border-gray-200 rounded-xl transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Create Content</p>
                    <p className="text-[10px] text-gray-500">GEO-optimized articles</p>
                  </div>
                </a>
                <a href="/dashboard/geo-monitor"
                  className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-blue-50 border border-gray-200 rounded-xl transition-colors group">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Monitor Visibility</p>
                    <p className="text-[10px] text-gray-500">Track AI brand mentions</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Empty State (before audit) ═══ */}
        {!auditResult && !isAuditing && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Hero section */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-10 text-center border-b border-gray-100">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/10">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  How does AI see your website?
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Our AI Readiness Audit analyzes your website across 5 critical dimensions to determine how well AI platforms (ChatGPT, Perplexity, Gemini) can discover, understand, and cite your content.
                </p>
              </div>
            </div>

            {/* 5 Dimension cards */}
            <div className="p-8">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6 text-center">What We Analyze</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {[
                  { icon: <Shield className="w-6 h-6" />, label: 'AI Accessibility', desc: 'Can AI bots crawl and read your content?', color: 'from-blue-50 to-blue-100 text-blue-600 border-blue-200' },
                  { icon: <Layers className="w-6 h-6" />, label: 'Semantic Structure', desc: 'Is your content self-organized for AI comprehension?', color: 'from-purple-50 to-purple-100 text-purple-600 border-purple-200' },
                  { icon: <FileText className="w-6 h-6" />, label: 'Content Citability', desc: 'Does your content have quotable fact units?', color: 'from-orange-50 to-orange-100 text-orange-600 border-orange-200' },
                  { icon: <AlertOctagon className="w-6 h-6" />, label: 'Risk Boundary', desc: 'Is your content safe for AI to reference?', color: 'from-red-50 to-red-100 text-red-600 border-red-200' },
                  { icon: <Brain className="w-6 h-6" />, label: 'Reusability', desc: 'Will AI reuse your content across answers?', color: 'from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200' },
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
                <p className="text-sm text-gray-500 mb-3">Try auditing one of these websites:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['myticktalk.com', 'stripe.com', 'openai.com', 'notion.so', 'linear.app'].map((example) => (
                    <button
                      key={example}
                      onClick={() => { setUrl(example); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      className="px-4 py-2 text-sm bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded-lg transition-colors flex items-center gap-1.5 border border-transparent hover:border-primary/20"
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
