'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth } from '@/hooks/useAuth'
import { api, OptimizationResult, DimensionOptimization, OptimizationFix, ApplyOptimizationResult, notifyCreditUsed } from '@/lib/api'
import {
  Zap, Shield, Layers, FileText, AlertOctagon, Brain,
  ArrowRight, CheckCircle, Clock, TrendingUp, TrendingDown,
  ChevronRight, ChevronDown, Sparkles, Code, Eye,
  ArrowUpRight, Lock, RefreshCw, Save, Globe, Search,
  Loader2, AlertTriangle, XCircle, X, History, Copy,
  Download, Check, ExternalLink, Target, RotateCcw,
  ClipboardList, ChevronUp
} from 'lucide-react'

// ─── Audit Context (from geo-audit handoff) ────────────
const AUDIT_OPT_CONTEXT_KEY = 'audit_to_opt_context'
const AUDIT_OPT_TTL_MS = 60 * 60 * 1000 // 1 hour

interface AuditOptContext {
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

function readAuditContext(url: string): AuditOptContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUDIT_OPT_CONTEXT_KEY)
    if (!raw) return null
    const ctx: AuditOptContext = JSON.parse(raw)
    // Check TTL
    const age = Date.now() - new Date(ctx.timestamp).getTime()
    if (age > AUDIT_OPT_TTL_MS) {
      localStorage.removeItem(AUDIT_OPT_CONTEXT_KEY)
      return null
    }
    // URL must match
    const normalizedCtx = ctx.url.replace(/\/$/, '').toLowerCase()
    const normalizedUrl = url.replace(/\/$/, '').toLowerCase()
    if (!normalizedUrl.includes(normalizedCtx) && !normalizedCtx.includes(normalizedUrl)) return null
    return ctx
  } catch { return null }
}

// ─── Audit Context Banner ──────────────────────────────
function AuditContextBanner({ ctx, onDismiss }: { ctx: AuditOptContext; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const totalFail = ctx.green_fail + ctx.yellow_fail + ctx.red_fail

  const zoneColor = {
    red: 'text-red-600 bg-red-50 border-red-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    green: 'text-green-700 bg-green-50 border-green-200',
  }
  const zoneIcon = { red: '🔴', yellow: '🟡', green: '🟢' }

  const redChecks = ctx.failing_checks.filter(c => c.zone === 'red')
  const yellowChecks = ctx.failing_checks.filter(c => c.zone === 'yellow')
  const greenChecks = ctx.failing_checks.filter(c => c.zone === 'green')

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">
              Imported from Layer 1 Audit — {totalFail} issues found
            </p>
            <p className="text-[11px] text-orange-600 mt-0.5">
              {ctx.red_fail > 0 && <span className="mr-2">🔴 {ctx.red_fail} Red (manual)</span>}
              {ctx.yellow_fail > 0 && <span className="mr-2">🟡 {ctx.yellow_fail} Yellow (engineer review)</span>}
              {ctx.green_fail > 0 && <span>🟢 {ctx.green_fail} Green (auto-fixable)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-orange-600 hover:text-orange-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Collapse' : 'View issues'}
          </button>
          <button onClick={onDismiss} className="text-orange-400 hover:text-orange-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded issue list */}
      {expanded && (
        <div className="border-t border-orange-200 px-5 py-4 space-y-3">
          {/* Fix effort summary */}
          <div className="flex items-center gap-4 text-xs text-orange-700 bg-orange-100/60 rounded-lg px-3 py-2">
            <span className="font-semibold">Estimated manual effort:</span>
            <span>{ctx.fix_effort_hours_low}–{ctx.fix_effort_hours_high}h</span>
            <span className="text-orange-400">·</span>
            <span>Alignment can handle Yellow + Red automatically</span>
          </div>

          {/* Issues by zone: Red first */}
          {[
            { label: 'Red Zone — Engineer Required', checks: redChecks, zone: 'red' as const },
            { label: 'Yellow Zone — AI Draft + Review', checks: yellowChecks, zone: 'yellow' as const },
            { label: 'Green Zone — Auto-fixable', checks: greenChecks, zone: 'green' as const },
          ].filter(g => g.checks.length > 0).map(group => (
            <div key={group.zone}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                {zoneIcon[group.zone]} {group.label}
              </p>
              <div className="space-y-1">
                {group.checks.map(c => (
                  <div
                    key={c.id}
                    className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border text-xs ${zoneColor[c.zone]}`}
                  >
                    <span className="font-mono text-[9px] opacity-60 mt-0.5 flex-shrink-0">{c.id}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{c.name}</p>
                      <p className="opacity-75 mt-0.5 text-[10px] leading-relaxed">{c.detail}</p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium ${
                      c.fix_type === 'auto' ? 'bg-green-200 text-green-800' :
                      c.fix_type === 'ai_draft' ? 'bg-blue-200 text-blue-800' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {c.fix_type === 'auto' ? 'Auto' : c.fix_type === 'ai_draft' ? 'AI Draft' : 'Manual'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-orange-500 text-center pt-1">
            Run optimization below to generate fix plans for all {totalFail} issues
          </p>
        </div>
      )}
    </div>
  )
}

// ─── URL Validation (same as GEO Audit) ────────────────
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
  } catch { return false }
}

// ─── Recent URLs (shared with GEO Audit via same key) ──
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

// ─── Baseline Snapshot ─────────────────────────────────
const BASELINE_KEY = 'geo_optimization_baseline'

interface BaselineSnapshot {
  url: string
  savedAt: string
  overallScore: number
  dimensions: { [key: string]: { score: number; projected: number } }
}

function getBaseline(url: string): BaselineSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(BASELINE_KEY)
    if (!stored) return null
    const baselines: BaselineSnapshot[] = JSON.parse(stored)
    const normalized = url.replace(/\/$/, '').toLowerCase()
    return baselines.find(b => b.url === normalized) || null
  } catch { return null }
}

function saveBaseline(result: OptimizationResult) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(BASELINE_KEY)
    const baselines: BaselineSnapshot[] = stored ? JSON.parse(stored) : []
    const normalized = result.url.replace(/\/$/, '').toLowerCase()
    const newBaseline: BaselineSnapshot = {
      url: normalized,
      savedAt: new Date().toISOString(),
      overallScore: result.current_overall_score,
      dimensions: result.dimensions.reduce((acc, d) => {
        acc[d.dimension_key] = { score: d.current_score, projected: d.projected_score }
        return acc
      }, {} as { [key: string]: { score: number; projected: number } }),
    }
    const updated = [newBaseline, ...baselines.filter(b => b.url !== normalized)].slice(0, 10)
    localStorage.setItem(BASELINE_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

function clearBaseline(url: string) {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem(BASELINE_KEY)
    if (!stored) return
    const baselines: BaselineSnapshot[] = JSON.parse(stored)
    const normalized = url.replace(/\/$/, '').toLowerCase()
    const updated = baselines.filter(b => b.url !== normalized)
    localStorage.setItem(BASELINE_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
}

// ─── Stability Badge Component ─────────────────────────
function StabilityBadge({ type }: { type: 'structural' | 'content' | 'hybrid' }) {
  const config = {
    structural: {
      label: 'Structural',
      desc: 'One-time fix',
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: <Lock className="w-3 h-3" />,
    },
    content: {
      label: 'Content',
      desc: 'Ongoing',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: <RefreshCw className="w-3 h-3" />,
    },
    hybrid: {
      label: 'Hybrid',
      desc: 'Mixed',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <FileText className="w-3 h-3" />,
    },
  }
  const cfg = config[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
      <span className="opacity-60 normal-case">· {cfg.desc}</span>
    </span>
  )
}

// ─── Scanning Progress Panel ───────────────────────────
const OPT_STEPS = [
  { icon: Shield, label: 'Auditing', desc: 'Running GEO Audit...' },
  { icon: Layers, label: 'Analyzing', desc: 'Finding optimization opportunities...' },
  { icon: Zap, label: 'Planning', desc: 'Generating fix plans & code...' },
  { icon: Target, label: 'Scoring', desc: 'Calculating projected impact...' },
  { icon: CheckCircle, label: 'Finalizing', desc: 'Building optimization report...' },
]

function ScanProgressPanel({ url }: { url: string }) {
  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep(prev => (prev < 4 ? prev + 1 : prev))
    }, 3000)
    const elapsedTimer = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => { clearInterval(stepTimer); clearInterval(elapsedTimer) }
  }, [])

  const progress = Math.min(((activeStep + 1) / 5) * 85 + elapsed * 1.5, 95)

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1.5 bg-gray-100 w-full">
        <div className="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Generating optimization plan...</h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                {url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-mono text-orange-500">{Math.round(progress)}%</p>
            <p className="text-xs text-gray-400">{elapsed}s elapsed</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {OPT_STEPS.map((step, i) => {
            const Icon = step.icon
            const isActive = i === activeStep
            const isDone = i < activeStep
            return (
              <div key={i} className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${isDone ? 'border-green-200 bg-green-50' : isActive ? 'border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex flex-col items-center text-center gap-2 pt-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDone ? 'bg-green-100 text-green-600' : isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                    {isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <p className={`text-xs font-semibold ${isDone ? 'text-green-700' : isActive ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                  {isActive && <p className="text-[10px] text-gray-400 animate-pulse">{step.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Code Preview Modal (with Edit & Download) ────────
function CodePreview({ code, title, onClose }: { code: string; title: string; onClose: () => void }) {
  const [editableCode, setEditableCode] = useState(code)
  const [isEditing, setIsEditing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileName, setFileName] = useState(() => {
    // Auto-detect file name from content
    if (code.includes('User-agent:') && code.includes('Allow:')) return 'robots.txt'
    if (code.includes('<!DOCTYPE html>') || code.includes('<html')) return 'optimized-page.html'
    if (code.includes('<script type="application/ld+json">')) return 'schema-markup.html'
    if (code.includes('<section') || code.includes('<div')) return 'geo-optimized.html'
    if (code.includes('const ') || code.includes('function ')) return 'optimization.js'
    return 'geo-optimization.html'
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setEditableCode(code)
  }

  // Count lines
  const lineCount = editableCode.split('\n').length

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Code className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
              <p className="text-xs text-gray-400">{lineCount} lines · Click "Edit" to modify before downloading</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            {/* Toggle Edit/Preview */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${isEditing ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}`}
            >
              {isEditing ? <><Eye className="w-3.5 h-3.5" /> Switch to Preview</> : <><Code className="w-3.5 h-3.5" /> Edit Code</>}
            </button>
            {isEditing && (
              <button onClick={handleReset} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* File name input */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={fileName}
                onChange={e => setFileName(e.target.value)}
                className="text-xs text-gray-700 bg-transparent outline-none w-40"
                placeholder="filename.html"
              />
            </div>
            {/* Copy */}
            <button onClick={handleCopy} className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
              {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
            {/* Download */}
            <button onClick={handleDownload} className="px-3 py-1.5 text-xs bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-1.5 transition-colors font-medium shadow-sm">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>

        {/* Code Area */}
        <div className="flex-1 overflow-y-auto">
          {isEditing ? (
            <div className="relative">
              {/* Line numbers */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 border-r border-gray-700 select-none pointer-events-none z-10">
                <div className="p-4 text-right">
                  {editableCode.split('\n').map((_, i) => (
                    <div key={i} className="text-[11px] leading-[1.7] text-gray-500 font-mono">{i + 1}</div>
                  ))}
                </div>
              </div>
              <textarea
                value={editableCode}
                onChange={e => setEditableCode(e.target.value)}
                className="w-full min-h-[50vh] bg-gray-900 text-gray-100 p-4 pl-16 text-sm font-mono leading-[1.7] outline-none resize-none"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="relative">
              {/* Line numbers */}
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-gray-800 border-r border-gray-700 select-none z-10">
                <div className="p-4 text-right">
                  {editableCode.split('\n').map((_, i) => (
                    <div key={i} className="text-[11px] leading-[1.7] text-gray-500 font-mono">{i + 1}</div>
                  ))}
                </div>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 pl-16 text-sm font-mono leading-[1.7] overflow-x-auto whitespace-pre-wrap min-h-[50vh]">
                {editableCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>This code does <strong>NOT</strong> modify your website. Copy/download and apply manually.</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center gap-2 transition-colors font-medium">
              {copied ? <><Check className="w-4 h-4 text-green-500" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All</>}
            </button>
            <button onClick={handleDownload} className="px-4 py-2 text-sm bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm">
              <Download className="w-4 h-4" /> Download as {fileName}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Fix Card ──────────────────────────────────────────
function FixCard({ fix, index, onViewCode, onApply, applying }: {
  fix: OptimizationFix
  index: number
  onViewCode: (code: string, title: string) => void
  onApply: () => void
  applying: boolean
}) {
  const effortColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`p-4 rounded-xl border transition-all ${fix.is_permanent ? 'bg-green-50/50 border-green-100' : fix.requires_maintenance ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${fix.is_permanent ? 'bg-white border-green-200' : fix.requires_maintenance ? 'bg-white border-orange-200' : 'bg-white border-gray-200'}`}>
            <span className="text-xs font-bold text-gray-500">{index + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold text-gray-900">{fix.title}</p>
              {fix.is_permanent && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                  <Lock className="w-2.5 h-2.5" /> Permanent
                </span>
              )}
              {fix.requires_maintenance && (
                <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                  <RefreshCw className="w-2.5 h-2.5" /> Ongoing
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-2">{fix.description}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +{fix.impact_points}pts
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${effortColors[fix.effort]}`}>
                {fix.effort.charAt(0).toUpperCase() + fix.effort.slice(1)} Effort
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {fix.code_snippet && (
            <button
              onClick={() => onViewCode(fix.code_snippet!, fix.title)}
              className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-primary border border-transparent hover:border-gray-200"
              title="View code"
            >
              <Code className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onApply}
            disabled={applying}
            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-orange-500 border border-transparent hover:border-gray-200 disabled:opacity-50"
            title="Apply fix"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dimension Optimization Card ───────────────────────
function DimensionOptCard({ dim, icon, index, baseline, onViewCode, onOptimize, optimizing, optType }: {
  dim: DimensionOptimization
  icon: React.ReactNode
  index: number
  baseline: BaselineSnapshot | null
  onViewCode: (code: string, title: string) => void
  onOptimize: (key: string) => void
  optimizing: string | null
  optType: OptimizationType
}) {
  const [expanded, setExpanded] = useState(false)
  const isOptimizing = optimizing === dim.dimension_key

  const getScoreColor = (s: number) => {
    if (s >= 85) return 'text-green-500 bg-green-50 border-green-200'
    if (s >= 65) return 'text-blue-500 bg-blue-50 border-blue-200'
    if (s >= 45) return 'text-yellow-500 bg-yellow-50 border-yellow-200'
    return 'text-red-500 bg-red-50 border-red-200'
  }

  const getBarColor = (s: number) => {
    if (s >= 85) return 'bg-green-500'
    if (s >= 65) return 'bg-blue-500'
    if (s >= 45) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const baselineDim = baseline?.dimensions[dim.dimension_key]
  const hasRegression = baselineDim && dim.current_score < baselineDim.score

  const permanentCount = dim.fixes.filter(f => f.is_permanent).length
  const maintenanceCount = dim.fixes.filter(f => f.requires_maintenance).length

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all ${hasRegression ? 'border-orange-300' : 'border-gray-200'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${getScoreColor(dim.current_score)}`}>
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">D{index}</span>
                  {dim.dimension_name}
                </h4>
                <StabilityBadge type={dim.stability_type} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5 max-w-lg">{dim.stability_description}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Score */}
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-gray-900">{dim.current_score}</div>
              <div className="text-xs text-gray-400">Current</div>
              {hasRegression && (
                <div className="flex items-center gap-0.5 text-[10px] text-orange-600 mt-0.5">
                  <TrendingDown className="w-3 h-3" />
                  Regressed from {baselineDim!.score}
                </div>
              )}
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            {/* Projected */}
            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-green-500">{dim.projected_score}</div>
              <div className="text-xs text-green-500">Projected</div>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
            <div className={`h-full rounded-full transition-all duration-700 ${getBarColor(dim.current_score)}`} style={{ width: `${dim.current_score}%` }} />
            {/* Projected ghost bar */}
            <div className="absolute top-0 h-full bg-green-300/30 rounded-full transition-all duration-700" style={{ width: `${dim.projected_score}%` }} />
          </div>
          <span className="text-xs text-green-600 font-semibold flex items-center gap-1 whitespace-nowrap">
            <TrendingUp className="w-3 h-3" />
            +{dim.total_impact}pts
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-5">
          {/* Fix Category Summary */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lock className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-700">Permanent Fixes</span>
              </div>
              <p className="text-lg font-bold text-green-700">{permanentCount}</p>
              <p className="text-[10px] text-green-600">Fix once, stays fixed forever</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">Ongoing Maintenance</span>
              </div>
              <p className="text-lg font-bold text-orange-700">{maintenanceCount}</p>
              <p className="text-[10px] text-orange-600">Needs regular updates</p>
            </div>
          </div>

          {/* Issues Found */}
          {dim.findings_summary.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Issues Found</h5>
              <div className="space-y-1">
                {dim.findings_summary.map((f, i) => (
                  <div key={i} className={`text-xs py-1.5 px-3 rounded-lg ${f.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fix Items */}
          <div className="space-y-2 mb-5">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Optimization Fixes</h5>
            {dim.fixes.map((fix, i) => (
              <FixCard
                key={i}
                fix={fix}
                index={i}
                onViewCode={onViewCode}
                onApply={() => {}}
                applying={false}
              />
            ))}
          </div>

          {/* Important Notice — adapted per optimization type */}
          <div className={`rounded-xl p-4 mb-4 border ${optType === 'content' ? 'bg-purple-50 border-purple-200' : optType === 'hybrid' ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <Shield className={`w-5 h-5 flex-shrink-0 mt-0.5 ${optType === 'content' ? 'text-purple-600' : optType === 'hybrid' ? 'text-indigo-600' : 'text-blue-600'}`} />
              <div className="flex-1">
                {optType === 'code' && (
                  <>
                    <p className="text-sm font-semibold text-blue-900 mb-1">🔒 Code Generation Tool (No Website Modification)</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>This tool generates ready-to-use code and does NOT modify your website.</strong>
                      <br />• Generate HTML, robots.txt, meta tags, schema markup
                      <br />• Preview, edit, and download code files
                      <br />• <strong>You manually apply changes to your website</strong>
                    </p>
                  </>
                )}
                {optType === 'content' && (
                  <>
                    <p className="text-sm font-semibold text-purple-900 mb-1">✍️ Content Generation (GEO Content Module)</p>
                    <p className="text-xs text-purple-700 leading-relaxed">
                      <strong>This dimension requires AI-generated content optimization.</strong>
                      <br />• TL;DR summaries, key fact units, objective language
                      <br />• Generate GEO-optimized articles in the <strong>GEO Content</strong> module
                    </p>
                  </>
                )}
                {optType === 'hybrid' && (
                  <>
                    <p className="text-sm font-semibold text-indigo-900 mb-1">🔀 Hybrid: Code + Content (Choose Your Action)</p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      <strong>This dimension involves both code templates and content writing.</strong>
                      <br />• <strong>Generate Code</strong>: HTML templates, schema markup, structural fixes
                      <br />• <strong>Generate Content</strong>: Rewritten copy, FAQ answers, entity definitions
                      <br />• Content generation available in the <strong>GEO Content</strong> module
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Button(s) — based on optimization type */}
          {optType === 'code' && (
            <>
              <button
                onClick={() => onOptimize(dim.dimension_key)}
                disabled={!!optimizing}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating optimization code...
                  </>
                ) : (
                  <>
                    <Code className="w-5 h-5" />
                    Generate Optimization Code — {dim.dimension_name}
                  </>
                )}
              </button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                You will receive code snippets to preview, edit, and download
              </p>
            </>
          )}

          {optType === 'content' && (
            <>
              <a
                href={`/dashboard/geo-content?type=${dim.dimension_key === 'content_citability' ? 'faq' : dim.dimension_key === 'risk_boundary' ? 'evaluation_risk' : 'definition'}`}
                className="w-full px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
              >
                <FileText className="w-5 h-5" />
                Generate Content — {dim.dimension_name}
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Opens GEO Content module with recommended content type pre-selected
              </p>
            </>
          )}

          {optType === 'hybrid' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onOptimize(dim.dimension_key)}
                  disabled={!!optimizing}
                  className="px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="w-5 h-5" />
                      Generate Code
                    </>
                  )}
                </button>
                <a
                  href={`/dashboard/geo-content?type=${dim.dimension_key === 'content_citability' ? 'faq' : dim.dimension_key === 'risk_boundary' ? 'evaluation_risk' : 'definition'}`}
                  className="px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <FileText className="w-5 h-5" />
                  Generate Content
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Code generation available · Content opens in GEO Content module
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Dimension Icon Map ────────────────────────────────
const DIMENSION_ICONS: Record<string, React.ReactNode> = {
  ai_accessibility: <Shield className="w-5 h-5" />,
  semantic_structure: <Layers className="w-5 h-5" />,
  content_citability: <FileText className="w-5 h-5" />,
  risk_boundary: <AlertOctagon className="w-5 h-5" />,
  reusability: <Brain className="w-5 h-5" />,
}

// ─── Optimization Type Map (determines button style) ──
type OptimizationType = 'code' | 'content' | 'hybrid'

const DIMENSION_OPT_TYPE: Record<string, OptimizationType> = {
  ai_accessibility: 'code',       // Pure code: robots.txt, meta tags, SSR config
  semantic_structure: 'code',     // Pure code: HTML headings, page structure, schema
  content_citability: 'content',  // Pure content: TL;DR summaries, facts, language
  risk_boundary: 'hybrid',       // Hybrid: disclaimer HTML templates (code) + language rewriting (content)
  reusability: 'hybrid',         // Hybrid: FAQ schema markup (code) + FAQ content + entity definitions
}

// ─── Apply Result Panel ────────────────────────────────
function ApplyResultPanel({ result, onClose, onViewCode }: {
  result: ApplyOptimizationResult
  onClose: () => void
  onViewCode: (code: string, title: string) => void
}) {
  const dimLabel = result.dimension_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const handleDownloadDirect = () => {
    if (!result.optimized_content) return
    const ext = result.optimized_content.includes('User-agent:') ? 'txt' : 'html'
    const fname = `geo-${result.dimension_key}.${ext}`
    const blob = new Blob([result.optimized_content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fname
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 relative">
      <button onClick={onClose} className="absolute top-4 right-4 p-1.5 hover:bg-green-200 rounded-lg transition-colors">
        <X className="w-4 h-4 text-green-600" />
      </button>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Code className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-green-800">Optimization Code Generated!</h3>
          <p className="text-sm text-green-600">{result.fixes_applied} fixes generated for {dimLabel}</p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-white border border-orange-300 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-gray-900 mb-1">⚠️ Manual Application Required</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>Your website has NOT been modified.</strong> Review the code, edit if needed, then copy or download to apply manually.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-4">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Estimated New Score</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-green-600">{result.estimated_new_score}</span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4">
          <h4 className="text-xs font-medium text-gray-500 mb-1">Fixes Generated</h4>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono text-primary">{result.fixes_applied}</span>
            <span className="text-sm text-gray-400">code snippets</span>
          </div>
        </div>
      </div>

      {result.implementation_steps.length > 0 && (
        <div className="bg-white rounded-xl p-4 mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            Implementation Steps
          </h4>
          <div className="space-y-0.5">
            {result.implementation_steps.map((step, i) => (
              <p key={i} className={`text-xs ${step.startsWith('Step') ? 'font-semibold text-gray-900 mt-2.5 flex items-center gap-1.5' : 'text-gray-500 pl-5'}`}>
                {step.startsWith('Step') && <ChevronRight className="w-3 h-3 text-green-500" />}
                {step}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — always show */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => result.optimized_content && onViewCode(result.optimized_content, `${dimLabel} — Generated Code`)}
          disabled={!result.optimized_content}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Code className="w-4 h-4" />
          Preview & Edit Code
        </button>
        <button
          onClick={handleDownloadDirect}
          disabled={!result.optimized_content}
          className="px-4 py-3 bg-white border-2 border-green-300 text-green-700 hover:bg-green-50 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download Code
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ─── Main Page ────────────────────────────────────────
// ═══════════════════════════════════════════════════════
export default function GEOOptimizationPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [recentUrls, setRecentUrls] = useState<string[]>([])
  const [showRecentDropdown, setShowRecentDropdown] = useState(false)
  const [loadingUrl, setLoadingUrl] = useState('')
  const [baseline, setBaseline] = useState<BaselineSnapshot | null>(null)
  const [codePreview, setCodePreview] = useState<{ code: string; title: string } | null>(null)
  const [optimizing, setOptimizing] = useState<string | null>(null)
  const [applyResult, setApplyResult] = useState<ApplyOptimizationResult | null>(null)
  const [auditContext, setAuditContext] = useState<AuditOptContext | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)
  const autoRunRef = useRef(false)

  // ─── Restore from localStorage or URL param on mount ──
  useEffect(() => {
    setRecentUrls(getRecentUrls())
    // Check URL param first (cross-module navigation)
    const params = new URLSearchParams(window.location.search)
    const paramUrl = params.get('url')
    const fromAudit = params.get('from_audit') === '1'
    if (paramUrl) {
      setUrl(paramUrl)
      autoRunRef.current = true
      // Load audit context if navigated from audit page
      if (fromAudit) {
        const ctx = readAuditContext(paramUrl)
        if (ctx) setAuditContext(ctx)
      }
      return
    }
    // Otherwise restore previous session
    try {
      const saved = localStorage.getItem('geo_optimization_session')
      if (saved) {
        const session = JSON.parse(saved)
        if (session.url) setUrl(session.url)
        if (session.result) setResult(session.result)
        if (session.loadingUrl) setLoadingUrl(session.loadingUrl)
      }
    } catch {}
  }, [])

  const refreshRecentUrls = useCallback(() => {
    setRecentUrls(getRecentUrls())
  }, [])

  // ─── Auto-run optimization when navigated with URL param ──
  useEffect(() => {
    if (autoRunRef.current && url && !isLoading && !result) {
      autoRunRef.current = false
      handleRunOptimization()
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist session to localStorage ──
  useEffect(() => {
    if (result || url) {
      try {
        localStorage.setItem('geo_optimization_session', JSON.stringify({
          url, result, loadingUrl,
        }))
      } catch {}
    }
  }, [result, url, loadingUrl])

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, [result])

  const handleRunOptimization = async () => {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!isValidUrl(trimmed)) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)')
      return
    }

    setLoadingUrl(trimmed)
    setIsLoading(true)
    setError(null)
    setUrlError(null)
    setResult(null)
    setApplyResult(null)

    const response = await api.generateOptimization(trimmed, user?.id)

    if (response.error) {
      setError(response.error)
    } else if (response.data) {
      setResult(response.data)
      addRecentUrl(response.data.url)
      refreshRecentUrls()
      setBaseline(getBaseline(response.data.url))
      notifyCreditUsed()
    }
    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleRunOptimization()
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    if (urlError) setUrlError(null)
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

  const handleReset = () => {
    setUrl('')
    setResult(null)
    setError(null)
    setUrlError(null)
    setApplyResult(null)
    try { localStorage.removeItem('geo_optimization_session') } catch {}
  }

  const handleViewCode = (code: string, title: string) => {
    setCodePreview({ code, title })
  }

  const handleOneClickOptimize = async (dimensionKey: string) => {
    if (!result) return
    setOptimizing(dimensionKey)
    setApplyResult(null)

    const response = await api.applyOptimization(result.url, dimensionKey, undefined, user?.id)
    if (response.error) {
      setError(response.error)
    } else if (response.data) {
      setApplyResult(response.data)
      notifyCreditUsed()
    }
    setOptimizing(null)
  }

  const handleSaveBaseline = () => {
    if (!result) return
    saveBaseline(result)
    setBaseline(getBaseline(result.url))
  }

  const handleClearBaseline = () => {
    if (!result) return
    clearBaseline(result.url)
    setBaseline(null)
  }

  // Stats
  const currentAvg = result ? result.current_overall_score : 0
  const projectedAvg = result ? result.projected_overall_score : 0
  const totalImpact = result ? projectedAvg - currentAvg : 0
  const quickWins = result ? result.quick_wins_count : 0

  // Stability counts
  const structuralCount = result ? result.dimensions.filter(d => d.stability_type === 'structural').length : 0
  const contentCount = result ? result.dimensions.filter(d => d.stability_type === 'content').length : 0
  const hybridCount = result ? result.dimensions.filter(d => d.stability_type === 'hybrid').length : 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header title={t.dashboard.geoOptimization} subtitle={t.dashboard.geoOptimizationDesc} />

      <div className="p-6 space-y-6">
        {/* ═══ Audit Context Banner (shown when navigated from Audit) ═══ */}
        {auditContext && (
          <AuditContextBanner
            ctx={auditContext}
            onDismiss={() => {
              setAuditContext(null)
              try { localStorage.removeItem(AUDIT_OPT_CONTEXT_KEY) } catch {}
            }}
          />
        )}

        {/* ═══ URL Input Section (same as GEO Audit) ═══ */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-soft p-8 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.dashboard.geoOptimization}</h2>
                <p className="text-gray-500 text-sm">{t.dashboard.geoOptimizationDesc}</p>
              </div>
            </div>

            {/* URL Input */}
            <div className="mt-6 flex gap-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.dashboard.urlPlaceholder}
                  disabled={isLoading}
                  className={`w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 focus:bg-white transition-all outline-none text-lg disabled:opacity-50 ${urlError ? 'border-red-300' : isLoading ? 'border-orange-200' : 'border-gray-200'}`}
                />
              </div>
              <button
                onClick={handleRunOptimization}
                disabled={!url.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md shadow-red-500/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Generate Plan
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
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 shadow-lg rounded-xl z-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Recent URLs</span>
                        <button onClick={clearAllRecentUrls} className="text-[10px] text-red-500 hover:text-red-600">Clear All</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {recentUrls.map(recentUrl => (
                          <button key={recentUrl} onClick={() => handleSelectRecentUrl(recentUrl)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate">{recentUrl.replace(/^https?:\/\//, '')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* URL Error */}
            {urlError && (
              <div className="mt-3 flex items-center gap-2 text-red-500 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{urlError}</span>
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══ Scanning Progress ═══ */}
        {isLoading && <ScanProgressPanel url={loadingUrl} />}

        {/* ═══ Results ═══ */}
        {result && (
          <div ref={resultRef} className="space-y-6">
            {/* Overview Stats */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-soft p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Optimization Plan</h2>
                      <p className="text-gray-500 text-sm flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        {result.url.replace(/^https?:\/\//, '')}
                        <span className="text-gray-600">·</span>
                        <Clock className="w-3 h-3" />
                        {result.optimization_duration_seconds}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {baseline ? (
                      <button onClick={handleClearBaseline}
                        className="px-3 py-2 text-xs bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        Baseline saved · Clear
                      </button>
                    ) : (
                      <button onClick={handleSaveBaseline}
                        className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        Save Baseline
                      </button>
                    )}
                    <button onClick={handleReset}
                      className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      New URL
                    </button>
                  </div>
                </div>

                {/* Score Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm mb-1">Current Score</p>
                    <p className="text-3xl font-bold font-mono text-gray-900">{currentAvg}</p>
                    <p className="text-xs text-gray-500 mt-1">across 5 dimensions</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm mb-1">Projected Score</p>
                    <p className="text-3xl font-bold font-mono text-green-600">{projectedAvg}</p>
                    <p className="text-xs text-green-600/60 mt-1">after optimization</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm mb-1">Total Impact</p>
                    <p className="text-3xl font-bold font-mono text-orange-500">+{totalImpact}</p>
                    <p className="text-xs text-gray-500 mt-1">{result.total_fixes} fixes total</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <p className="text-gray-500 text-sm mb-1">Quick Wins</p>
                    <p className="text-3xl font-bold font-mono text-blue-600">{quickWins}</p>
                    <p className="text-xs text-gray-500 mt-1">low-effort fixes</p>
                  </div>
                </div>

                {/* Stability Dashboard */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Optimization Stability Classification
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-600">Structural</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{structuralCount}</p>
                      <p className="text-xs text-gray-500">One-time permanent fixes</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <RefreshCw className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-medium text-orange-600">Content</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{contentCount}</p>
                      <p className="text-xs text-gray-500">Requires ongoing updates</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Hybrid</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{hybridCount}</p>
                      <p className="text-xs text-gray-500">Mix of permanent + ongoing</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Baseline Alert */}
            {baseline && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Save className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Optimization Baseline Active</p>
                    <p className="text-xs text-blue-600">
                      Saved on {new Date(baseline.savedAt).toLocaleDateString()} · Score: {baseline.overallScore}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-500">Score regressions will be highlighted below</p>
              </div>
            )}

            {/* Apply Result */}
            {applyResult && (
              <ApplyResultPanel
                result={applyResult}
                onClose={() => setApplyResult(null)}
                onViewCode={handleViewCode}
              />
            )}

            {/* Dimension Optimization Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                {t.dashboard.dimensionOptimizations}
              </h3>

              {result.dimensions.map((dim, i) => (
                <DimensionOptCard
                  key={dim.dimension_key}
                  dim={dim}
                  icon={DIMENSION_ICONS[dim.dimension_key] || <Zap className="w-5 h-5" />}
                  index={i + 1}
                  baseline={baseline}
                  onViewCode={handleViewCode}
                  onOptimize={handleOneClickOptimize}
                  optimizing={optimizing}
                  optType={DIMENSION_OPT_TYPE[dim.dimension_key] || 'code'}
                />
              ))}
            </div>

            {/* Fix Summary */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Fix Summary
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Lock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{result.permanent_fixes}</p>
                  <p className="text-xs text-green-600">Permanent Fixes</p>
                  <p className="text-[10px] text-green-500 mt-1">Fix once, done forever</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <RefreshCw className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-700">{result.maintenance_fixes}</p>
                  <p className="text-xs text-orange-600">Maintenance Items</p>
                  <p className="text-[10px] text-orange-500 mt-1">Needs regular updates</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <Sparkles className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{quickWins}</p>
                  <p className="text-xs text-blue-600">Quick Wins</p>
                  <p className="text-[10px] text-blue-500 mt-1">Low-effort, high-impact</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ═══ Empty State ═══ */}
        {!result && !isLoading && (
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-50 to-white p-10 text-center border-b border-gray-100">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/10">
                  <Zap className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  AI-Powered Code Generation for GEO Optimization
                </h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Enter your website URL to get a complete optimization plan. We{"'"}ll audit your site, identify issues, classify fixes by stability type, and generate ready-to-use code for each dimension.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900 mb-1">🔒 Code Generation Only</p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        This tool <strong>generates code snippets</strong> for you to copy and apply manually. 
                        It <strong>does NOT modify your website automatically</strong>. You maintain full control over all changes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6 text-center">How It Works</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { icon: <Search className="w-6 h-6" />, title: '1. Audit & Diagnose', desc: 'We run a full GEO Audit to identify issues across all 5 dimensions', color: 'from-blue-50 to-blue-100 text-blue-600 border-blue-200' },
                  { icon: <Target className="w-6 h-6" />, title: '2. Classify & Plan', desc: 'Fixes are classified by type: Code (structural), Content (ongoing), or Hybrid (both)', color: 'from-orange-50 to-orange-100 text-orange-600 border-orange-200' },
                  { icon: <Code className="w-6 h-6" />, title: '3. Generate & Apply', desc: 'Generate code to download, or get content recommendations for each dimension', color: 'from-green-50 to-green-100 text-green-600 border-green-200' },
                ].map((step, i) => (
                  <div key={i} className={`flex flex-col items-center gap-3 p-6 bg-gradient-to-br ${step.color} rounded-xl border text-center`}>
                    <div className="w-12 h-12 bg-white/60 rounded-xl flex items-center justify-center shadow-sm">
                      {step.icon}
                    </div>
                    <h5 className="text-sm font-semibold">{step.title}</h5>
                    <p className="text-xs opacity-75 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>

              {/* Optimization type explanation */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 text-center">Optimization Types</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Code className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Generate Code</p>
                      <p className="text-xs text-gray-500">Code-only fixes: robots.txt, HTML structure, schema markup. Download & apply.</p>
                      <p className="text-[10px] text-green-600 mt-1 font-medium">✅ Available Now</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Generate Content</p>
                      <p className="text-xs text-gray-500">Content-only fixes: TL;DR, key facts, objective language, qualifier text.</p>
                      <p className="text-[10px] text-purple-600 mt-1 font-medium">🔜 Coming in GEO Content</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Layers className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Hybrid</p>
                      <p className="text-xs text-gray-500">Both code templates and content rewriting. Choose your action per fix.</p>
                      <p className="text-[10px] text-indigo-600 mt-1 font-medium">⚡ Code now · Content soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Code Preview Modal */}
      {codePreview && (
        <CodePreview
          code={codePreview.code}
          title={codePreview.title}
          onClose={() => setCodePreview(null)}
        />
      )}
    </div>
  )
}
