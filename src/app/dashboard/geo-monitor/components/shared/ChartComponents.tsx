'use client'

import { useState } from 'react'
import { MultiBrandTrendData as ApiMultiBrandTrendData } from '@/lib/api'
import { X } from 'lucide-react'
import type { ScanHistoryEntry } from './constants'
import { TAG_SEPARATORS, splitTagInput } from './constants'

// ─── ECharts tree-shaking imports ────────────────────────────────────
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echartsCore from 'echarts/core'
import { LineChart as EChartsLineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent as EChartsTooltipCmp,
  LegendComponent as EChartsLegendCmp,
} from 'echarts/components'
import { CanvasRenderer as EChartsCanvasRenderer } from 'echarts/renderers'

echartsCore.use([
  EChartsLineChart,
  GridComponent,
  EChartsTooltipCmp,
  EChartsLegendCmp,
  EChartsCanvasRenderer,
])

// ─── Chart color palette ──────────────────────────────────────────────
const CHART_YOU_COLOR = '#C84B31'          // terracotta — user's brand
const CHART_COMPETITOR_COLORS = [
  '#4A6FA5',   // steel blue
  '#16A34A',   // emerald
  '#7C3AED',   // violet
  '#D97706',   // amber
  '#0891B2',   // teal
  '#BE185D',   // rose
]
const CHART_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function fmtDateLabel(s: string): string {
  const parts = s.split('-')
  if (parts.length < 3) return s
  const m = parseInt(parts[1])
  const d = parseInt(parts[2])
  return `${CHART_MONTHS[m - 1]} ${d}`
}

// ─── Helpers ─────────────────────────────────────────

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateOnly(date: string): Date | null {
  const [raw] = date.split('T')
  const parts = raw.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function addDays(date: string, days: number): string {
  const d = parseDateOnly(date)
  if (!d) return date
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function contiguousDates(startDate: string, endDate: string): string[] {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (!start || !end || start > end) return [startDate]
  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function buildRunBaselineDates(actualDates: string[], daysBeforeFirstRun = 14): string[] {
  const normalized = Array.from(new Set(actualDates.map(d => d.split('T')[0]).filter(Boolean))).sort()
  if (normalized.length === 0) return recentBaselineDates(undefined, 7)
  return contiguousDates(addDays(normalized[0], -daysBeforeFirstRun), normalized[normalized.length - 1])
}

function carryForwardValues(dates: string[], valueByDate: Record<string, number>): number[] {
  let last = 0
  return dates.map(date => {
    if (valueByDate[date] !== undefined) {
      last = Math.max(0, Math.min(100, valueByDate[date]))
    }
    return last
  })
}

export function formatNum(v: number | undefined | null, decimals = 1): string {
  if (v == null || isNaN(v)) return '—'
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + 'K'
  return Number(v).toFixed(decimals)
}

export function formatPct(v: number | undefined | null): string {
  if (v == null || isNaN(v)) return '—'
  return Number(v).toFixed(1) + '%'
}

export function catmullRomPath(pts: { x: number; y: number }[], tension = 0.35): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]
    const p1 = pts[i]
    const p2 = pts[Math.min(i + 1, pts.length - 1)]
    const p3 = pts[Math.min(i + 2, pts.length - 1)]
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
}

// ─── Report row types (local, no external SDK dependency) ────
interface ReportRow {
  dimensions: string[];
  metrics: number[];
}
interface ReportResponse {
  data: ReportRow[];
  info: { total_rows: number; query?: Record<string, unknown> };
}

export function getMetricIndex(report: ReportResponse | null | undefined, metricName: string): number {
  const queryMetrics = (report?.info?.query as any)?.metrics as string[] | undefined
  if (!queryMetrics) return -1
  return queryMetrics.indexOf(metricName)
}

export function getMetricValue(report: ReportResponse | null | undefined, metricName: string, fallback = 0): number {
  if (!report?.data?.[0]?.metrics) return fallback
  const idx = getMetricIndex(report, metricName)
  if (idx < 0) return fallback
  return report.data[0].metrics[idx] ?? fallback
}

export function getRowMetric(report: ReportResponse | null | undefined, row: ReportRow, metricName: string, fallback = 0): number {
  const idx = getMetricIndex(report, metricName)
  if (idx < 0) return fallback
  return row.metrics?.[idx] ?? fallback
}

export function mapReportRows(
  data: ReportRow[],
  metricNames: string[],
  dimensionNames: string[],
  report?: ReportResponse | null,
): Record<string, unknown>[] {
  const actualMetricOrder = (report?.info?.query as any)?.metrics as string[] | undefined
  return (data ?? []).map(row => {
    const obj: Record<string, unknown> = {}
    dimensionNames.forEach((name, i) => { obj[name] = row.dimensions?.[i] ?? '' })
    if (actualMetricOrder) {
      actualMetricOrder.forEach((name, i) => { obj[name] = row.metrics?.[i] ?? 0 })
    } else {
      metricNames.forEach((name, i) => { obj[name] = row.metrics?.[i] ?? 0 })
    }
    return obj
  })
}

export function sumMetric(data: ReportRow[] | undefined, metricIndex: number): number {
  if (!data) return 0
  return data.reduce((s, r) => s + (r.metrics?.[metricIndex] ?? 0), 0)
}

export function avgMetric(data: ReportRow[] | undefined, metricIndex: number): number {
  if (!data || data.length === 0) return 0
  return sumMetric(data, metricIndex) / data.length
}

// ─── Text helpers ────────────────────────────────────

/**
 * Strip Markdown syntax characters (headers, bold, italic, code, links, blockquotes)
 * so AI responses render as clean plain text in the UI.
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''
  return text
    // Headers: "### Title" → "Title"
    .replace(/^#{1,6}\s+/gm, '')
    // Bold (**text** / __text__) and italic (*text* / _text_)
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1$2')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1$2')
    // Inline code: `code` → code
    .replace(/`([^`\n]+)`/g, '$1')
    // Links: [text](url) → text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    // Blockquote markers and horizontal rules
    .replace(/^>\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse 3+ newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function highlightBrand(text: string, brand: string): React.ReactNode {
  const cleaned = stripMarkdown(text)
  if (!brand) return cleaned
  const parts = cleaned.split(new RegExp(`(${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === brand.toLowerCase()
      ? <span key={i} className="bg-caution-bg text-caution font-semibold px-0.5 rounded">{part}</span>
      : part,
  )
}

// Mirrors backend monitor_service._SEARCH_FORCE_PREAMBLE
const _SEARCH_FORCE_PREAMBLE =
  'Search the web for current, real sources before answering. ' +
  'Only cite URLs that you actually find through search. '

export function displayPrompt(text: string, brandName?: string): string {
  // Strip backend instruction preamble — it's a scan-time directive to the AI engine,
  // not part of the user-facing query and should never appear in the UI.
  let result = text.startsWith(_SEARCH_FORCE_PREAMBLE)
    ? text.slice(_SEARCH_FORCE_PREAMBLE.length)
    : text
  if (result.includes('{brand}'))
    result = result.replace(/\{brand\}/gi, brandName || 'Your Brand')
  return result
}

// ─── MetricCard ──────────────────────────────────────

export function MetricCard({ icon, label, value, subtitle, color, bgColor, trend }: {
  icon: React.ReactNode
  label: string
  value: string
  subtitle?: string
  color: string
  bgColor: string
  trend?: { delta: number; label: string }
}) {
  return (
    <div className="bg-surface rounded-xl border border-divider p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>{icon}</div>
        {trend && trend.delta !== 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend.delta > 0 ? 'bg-sage-bg text-sage' : 'bg-red-soft-bg text-red-soft'}`}>
            {trend.delta > 0 ? '\u2191' : '\u2193'} {parseFloat(Math.abs(trend.delta).toFixed(1))}{trend.label}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-ink-3 mt-1">{label}</p>
      {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ─── DonutChart ──────────────────────────────────────

export function DonutChart({ segments, centerLabel, size = 160, showLegend = true, valueIsPercent = false }: {
  segments: { label: string; value: number; color: string }[]
  centerLabel?: string
  size?: number
  showLegend?: boolean
  // When the segment value is already a percentage (e.g. share of voice), show a
  // single "23.1%" instead of the count-style "23.1 (23%)" — the latter is only
  // meaningful when value is a raw count.
  valueIsPercent?: boolean
}) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="text-center py-6 text-ink-3 text-sm">No data</div>
  const gradParts: string[] = []
  let pct = 0
  for (const s of segments) {
    if (s.value <= 0) continue
    const next = pct + (s.value / total) * 100
    gradParts.push(`${s.color} ${pct}% ${next}%`)
    pct = next
  }
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${gradParts.join(', ')})` }} />
        <div className="absolute bg-surface rounded-full flex items-center justify-center" style={{ top: '22%', left: '22%', width: '56%', height: '56%' }}>
          {centerLabel && <span className="text-base font-bold text-ink">{centerLabel}</span>}
        </div>
      </div>
      {showLegend && (
        <div className="mt-4 space-y-1.5 w-full max-w-[240px]">
          {segments.filter(s => s.value > 0).map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-ink-2 text-xs truncate" title={s.label}>{s.label}</span>
              </div>
              <span className="font-mono text-xs font-medium text-ink flex-shrink-0">
                {valueIsPercent
                  ? `${((s.value / total) * 100).toFixed(1)}%`
                  : `${s.value} (${((s.value / total) * 100).toFixed(0)}%)`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── HorizontalBar ───────────────────────────────────

export function HorizontalBar({ label, value, max, color, icon }: {
  label: string; value: number; max: number; color: string; icon?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-xs text-ink-2 w-40 truncate">{label}</span>
      <div className="flex-1 h-3 bg-surface-warm rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono font-bold text-ink w-8 text-right">{value}</span>
    </div>
  )
}

// ─── TagInput ────────────────────────────────────────

export function TagInput({ value, onChange, placeholder, inputValue, onInputChange, validate }: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder: string
  inputValue?: string        // controlled mode: parent owns the input text
  onInputChange?: (v: string) => void
  // Return false to silently reject a tag (e.g. brand-self filter on competitors).
  validate?: (tag: string) => boolean
}) {
  const [internalInput, setInternalInput] = useState('')
  const [rejectedHint, setRejectedHint] = useState<string | null>(null)
  const input = inputValue !== undefined ? inputValue : internalInput
  const setInput = onInputChange ?? setInternalInput

  // Accept tags into `value`; silently skips duplicates and validator-rejected ones.
  const acceptTags = (candidates: string[]) => {
    const updated = [...value]
    let rejected: string | null = null
    for (const raw of candidates) {
      const t = raw.trim()
      if (!t || updated.includes(t)) continue
      if (validate && !validate(t)) { rejected = t; continue }
      updated.push(t)
    }
    if (updated.length !== value.length) onChange(updated)
    if (rejected) {
      setRejectedHint(rejected)
      window.setTimeout(() => setRejectedHint(null), 2500)
    }
  }

  // Auto-split on separators in input — pasting or typing "A, B, C" yields 3 tags.
  const handleInputChange = (raw: string) => {
    if (!TAG_SEPARATORS.test(raw)) { setInput(raw); return }
    const endsWithSep = TAG_SEPARATORS.test(raw[raw.length - 1] ?? '')
    const parts = splitTagInput(raw)
    const finishedParts = endsWithSep ? parts : parts.slice(0, -1)
    const remaining = endsWithSep ? '' : (parts[parts.length - 1] ?? '')
    acceptTags(finishedParts)
    setInput(remaining)
  }

  const addTagFromInput = () => {
    const parts = splitTagInput(input)
    if (parts.length === 0) return
    acceptTags(parts)
    setInput('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-warm text-ink text-xs font-medium rounded-full">
            {tag}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-ink-2">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text" value={input} onChange={e => handleInputChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagFromInput() } }}
        onBlur={() => { if (input.trim()) addTagFromInput() }}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
      />
      {rejectedHint && (
        <p className="mt-1 text-xs text-caution">
          &quot;{rejectedHint}&quot; matches your brand and was skipped.
        </p>
      )}
    </div>
  )
}

// ─── Single-metric TrendChart ────────────────────────

export function TrendLineChart({ data, label, color = '#000000' }: {
  data: { date: string; value: number }[]; label: string; color?: string
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  if (!data || data.length === 0) return <div className="text-center text-sm text-ink-3 py-8">No trend data</div>

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))

  const W = 640, H = 200, PX = 48, PY = 16, PR = 24, PB = 34
  const plotW = W - PX - PR, plotH = H - PY - PB
  const maxVal = Math.max(...sorted.map(d => d.value), 1)
  const yMax = Math.ceil(maxVal * 1.1)

  const points = sorted.map((d, i) => ({
    x: PX + (sorted.length > 1 ? (i / (sorted.length - 1)) * plotW : plotW / 2),
    y: PY + plotH - (d.value / yMax) * plotH,
  }))

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(yMax * f))

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * W
    if (mouseX < PX || mouseX > PX + plotW || points.length === 0) { setHoverIdx(null); return }
    let closest = 0, minDist = Infinity
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX)
      if (dist < minDist) { minDist = dist; closest = i }
    }
    setHoverIdx(closest)
  }

  return (
    <div className="bg-surface rounded-xl border border-divider p-5">
      <h4 className="text-sm font-semibold text-ink-2 mb-3">{label}</h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
        {yTicks.map(v => {
          const y = PY + plotH - (v / yMax) * plotH
          return (
            <g key={v}>
              <line x1={PX} y1={y} x2={W - PR} y2={y} stroke="#C8BFB0" strokeWidth="1" />
              <text x={PX - 6} y={y + 4} textAnchor="end" className="text-[10px]" fill="#2D2B27">{v}</text>
            </g>
          )
        })}
        <path
          d={catmullRomPath(points) + ` L${points[points.length - 1].x},${PY + plotH} L${points[0].x},${PY + plotH} Z`}
          fill={color} fillOpacity="0.08"
        />
        <path d={catmullRomPath(points)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3} fill={color} style={{ transition: 'r 0.15s ease' }} />)}
        {sorted.map((d, i) => {
          if (sorted.length > 14 && i % Math.ceil(sorted.length / 7) !== 0 && i !== sorted.length - 1) return null
          return <text key={i} x={points[i].x} y={H - 6} textAnchor="middle" className="text-[9px]" fill="#2D2B27">{d.date.slice(5)}</text>
        })}
        {hoverIdx !== null && (
          <>
            <line x1={points[hoverIdx].x} y1={PY} x2={points[hoverIdx].x} y2={PY + plotH} stroke={color} strokeWidth="0.8" strokeDasharray="3 3" strokeOpacity="0.5" />
            <rect
              x={points[hoverIdx].x - 44} y={points[hoverIdx].y - 38}
              width="88" height="30" rx="6"
              fill="white" stroke="#C8BFB0" strokeWidth="1"
              filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"
            />
            <text x={points[hoverIdx].x} y={points[hoverIdx].y - 24} textAnchor="middle" fontSize="10" fill="#0A0A0A" fontFamily="-apple-system, system-ui, sans-serif">
              {sorted[hoverIdx].date.slice(5)}
            </text>
            <text x={points[hoverIdx].x} y={points[hoverIdx].y - 13} textAnchor="middle" fontSize="11" fill={color} fontWeight="600" fontFamily="-apple-system, system-ui, sans-serif">
              {formatNum(sorted[hoverIdx].value)}
            </text>
          </>
        )}
        {hoverIdx === null && points.length > 0 && (
          <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8}
            textAnchor="middle" className="text-[11px]" fill={color} fontWeight="600">
            {formatNum(sorted[sorted.length - 1].value)}
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── ScanHistoryTrendChart ───────────────────────────

function recentBaselineDates(anchorDate?: string, days = 7): string[] {
  const anchor = anchorDate ? new Date(anchorDate) : new Date()
  if (Number.isNaN(anchor.getTime())) return recentBaselineDates(undefined, days)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(anchor)
    d.setDate(anchor.getDate() - (days - 1 - i))
    return formatDate(d)
  })
}

export function EmptyVisibilityTrendChart({ label = 'Waiting for first scan' }: { label?: string }) {
  const dates = recentBaselineDates()
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    grid: { left: 44, right: 64, top: 16, bottom: 36 },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#8C8070',
        fontSize: 11,
        interval: 0,
        showMaxLabel: true,
        formatter: (val: string) => fmtDateLabel(val),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 40,
      splitNumber: 4,
      splitLine: { lineStyle: { color: '#E8E2DA', width: 0.8, type: 'dashed' } },
      axisLabel: { color: '#8C8070', fontSize: 11, formatter: '{value}%' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: { show: false },
    series: [{
      name: 'Visibility Score',
      type: 'line',
      data: dates.map(() => 0),
      smooth: 0.35,
      showSymbol: false,
      lineStyle: { color: '#C8BFB0', width: 2, type: 'dashed' },
      itemStyle: { color: '#C8BFB0' },
      endLabel: {
        show: true,
        formatter: () => label,
        color: '#8C8070',
        fontSize: 11,
        fontWeight: '600',
      },
    }],
  }

  return (
    <ReactEChartsCore
      echarts={echartsCore}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      option={option as any}
      style={{ height: '240px', width: '100%' }}
      notMerge={true}
    />
  )
}

export function ScanHistoryTrendChart({ data }: { data: ScanHistoryEntry[] }) {
  if (data.length === 0) {
    return <EmptyVisibilityTrendChart />
  }

  // Normalize dates to YYYY-MM-DD, sort chronologically
  const sorted = [...data]
    .filter(e => !!e.date)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  const valueByDate: Record<string, number> = {}
  for (const entry of sorted) {
    const date = (entry.date ?? '').split('T')[0]
    if (!date) continue
    valueByDate[date] = Math.max(0, Math.min(100, entry.visibility_score))
  }
  const dates = buildRunBaselineDates(Object.keys(valueByDate))
  const values = carryForwardValues(dates, valueByDate)

  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 500,
    grid: { left: 44, right: 64, top: 16, bottom: 36 },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#8C8070',
        fontSize: 11,
        interval: dates.length > 10 ? Math.floor(dates.length / 6) : 0,
        showMaxLabel: true,
        formatter: (val: string) => fmtDateLabel(val),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitNumber: 4,
      splitLine: { lineStyle: { color: '#E8E2DA', width: 0.8 } },
      axisLabel: { color: '#8C8070', fontSize: 11, formatter: '{value}%' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: '#C8BFB0', type: 'dashed', width: 1.5 } },
      backgroundColor: '#FFFFFF',
      borderColor: '#E8E2DA',
      borderWidth: 1,
      padding: [10, 14],
      extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.08);border-radius:8px;',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        if (!params?.[0]) return ''
        const p = params[0]
        return `<div style="font-size:11px;color:#8C8070;margin-bottom:4px;font-weight:500;">${fmtDateLabel(String(p.name))}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${CHART_YOU_COLOR};display:inline-block;flex-shrink:0;"></span>
            <span style="color:#2D2B27;">Visibility Score</span>
            <span style="font-weight:700;color:${CHART_YOU_COLOR};font-family:ui-monospace,monospace;margin-left:auto;padding-left:16px;">${Number(p.value).toFixed(1)}%</span>
          </div>`
      },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: CHART_YOU_COLOR, width: 2.5 },
      itemStyle: { color: CHART_YOU_COLOR },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: hexToRgba(CHART_YOU_COLOR, 0.22) },
            { offset: 0.75, color: hexToRgba(CHART_YOU_COLOR, 0.04) },
            { offset: 1, color: hexToRgba(CHART_YOU_COLOR, 0) },
          ],
        },
      },
      endLabel: {
        show: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (p: any) => `${Number(p.value).toFixed(1)}%`,
        color: CHART_YOU_COLOR,
        fontSize: 11,
        fontWeight: '700',
      },
    }],
  }

  return (
    <ReactEChartsCore
      echarts={echartsCore}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      option={option as any}
      style={{ height: '240px', width: '100%' }}
      notMerge={true}
    />
  )
}

// ─── UnifiedTrendChart (multi-brand, ECharts) ────────

export type MultiBrandTrendData = ApiMultiBrandTrendData

export function UnifiedTrendChart({ data, brandName, scanHistory }: {
  data: ApiMultiBrandTrendData; brandName: string; scanHistory: ScanHistoryEntry[]
}) {
  // ── 1. Merge & normalize: all dates → YYYY-MM-DD (no duplicates) ──
  const dateMap: Record<string, Record<string, number>> = {}

  for (const pt of data.data_points) {
    if (!pt.date) continue
    const date = pt.date.split('T')[0]           // normalize ISO → date-only
    if (!dateMap[date]) dateMap[date] = {}
    if (dateMap[date][pt.brand_name] === undefined) {
      dateMap[date][pt.brand_name] = Math.max(0, Math.min(100, pt.visibility_score))
    }
  }
  for (const entry of scanHistory) {
    if (!entry.date || typeof entry.date !== 'string') continue
    const date = entry.date.split('T')[0]
    if (!dateMap[date]) dateMap[date] = {}
    // Customer-scoped scan history is the source of truth for the user's own
    // brand. Multi-brand trend data can be brand-level/stale, so it must not
    // override the latest customer scan value shown in the KPI cards.
    dateMap[date][brandName] = Math.max(0, Math.min(100, entry.visibility_score))
  }

  const actualDates = Object.keys(dateMap).sort()
  if (actualDates.length === 0) {
    return <div className="text-center py-8 text-ink-3 text-sm">No trend data available yet.</div>
  }
  const customerRunDates = scanHistory
    .map(entry => (entry.date ?? '').split('T')[0])
    .filter(Boolean)
    .sort()
  const firstRunDate = customerRunDates[0] ?? actualDates[0]
  const dates = contiguousDates(addDays(firstRunDate, -14), actualDates[actualDates.length - 1])

  const brands = data.brands.length > 0 ? data.brands : [brandName]
  const competitors = brands.filter(b => b !== brandName)

  const getBrandColor = (brand: string): string => {
    if (brand === brandName) return CHART_YOU_COLOR
    const idx = competitors.indexOf(brand)
    return CHART_COMPETITOR_COLORS[idx % CHART_COMPETITOR_COLORS.length]
  }

  // ── 2. Build ECharts series ────────────────────────────────────────
  const series = brands.map(brand => {
    const color = getBrandColor(brand)
    const isOwn = brand === brandName
    const valueByDate = dates.reduce<Record<string, number>>((acc, date) => {
      if (dateMap[date]?.[brand] !== undefined) acc[date] = dateMap[date][brand]
      return acc
    }, {})
    const values = carryForwardValues(dates, valueByDate)
    return {
      name: brand,
      type: 'line',
      smooth: 0.35,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      data: values,
      lineStyle: { color, width: isOwn ? 2.5 : 1.8 },
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,    color: hexToRgba(color, isOwn ? 0.22 : 0.12) },
            { offset: 0.8,  color: hexToRgba(color, 0.03) },
            { offset: 1,    color: hexToRgba(color, 0) },
          ],
        },
      },
      emphasis: {
        focus: 'series',
        lineStyle: { width: isOwn ? 3 : 2.5 },
        itemStyle: { borderWidth: 2 },
      },
      endLabel: {
        show: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (p: any) => `${Number(p.value).toFixed(1)}%`,
        color,
        fontSize: 11,
        fontWeight: '700',
      },
    }
  })

  // ── 3. ECharts option ─────────────────────────────────────────────
  const option = {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut',
    grid: { left: 44, right: 68, top: 16, bottom: 36 },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#8C8070',
        fontSize: 11,
        interval: dates.length > 10 ? Math.floor(dates.length / 7) : 0,
        showMaxLabel: true,
        formatter: (val: string) => fmtDateLabel(val),
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitNumber: 4,
      splitLine: { lineStyle: { color: '#E8E2DA', width: 0.8 } },
      axisLabel: { color: '#8C8070', fontSize: 11, formatter: '{value}%' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: '#C8BFB0', type: 'dashed', width: 1.5 },
      },
      backgroundColor: '#FFFFFF',
      borderColor: '#E8E2DA',
      borderWidth: 1,
      padding: [10, 14],
      extraCssText: 'box-shadow:0 4px 16px rgba(0,0,0,0.08);border-radius:8px;',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        if (!params?.length) return ''
        const date = fmtDateLabel(String(params[0].name))
        // Sort brands by value descending for readability
        const sorted = [...params].sort((a, b) => Number(b.value) - Number(a.value))
        let html = `<div style="font-size:11px;color:#8C8070;font-weight:500;margin-bottom:6px;">${date}</div>`
        for (const p of sorted) {
          const isMine = p.seriesName === brandName
          html += `<div style="display:flex;align-items:center;gap:8px;margin:3px 0;">
            <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0;"></span>
            <span style="flex:1;color:#2D2B27;${isMine ? 'font-weight:600;' : ''}">${p.seriesName}${isMine ? '&nbsp;<span style="font-size:9px;background:#FAF0EC;color:#C84B31;padding:1px 5px;border-radius:999px;font-weight:600;">You</span>' : ''}</span>
            <span style="font-weight:700;color:${p.color};font-family:ui-monospace,monospace;min-width:42px;text-align:right;">${Number(p.value).toFixed(1)}%</span>
          </div>`
        }
        return html
      },
    },
    legend: { show: false },   // custom legend pills below
    series,
  }

  return (
    <div>
      <ReactEChartsCore
        echarts={echartsCore}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        option={option as any}
        style={{ height: '260px', width: '100%' }}
        notMerge={true}
      />
      {/* ── Brand legend pills ───────────────────────────── */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {brands.map((brand, i) => {
          const color = getBrandColor(brand)
          const isOwn = brand === brandName
          return (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-divider-light bg-canvas">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className={isOwn ? 'text-ink font-semibold' : 'text-ink-2'}>{brand}</span>
              {isOwn && (
                <span className="text-[8px] px-1.5 py-px rounded-full font-semibold" style={{ background: '#FAF0EC', color: '#C84B31' }}>
                  You
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DataTable ───────────────────────────────────────

export function DataTable({ columns, rows, emptyText = 'No data' }: {
  columns: { key: string; label: string; align?: 'left' | 'right'; format?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }[]
  rows: Record<string, unknown>[]
  emptyText?: string
}) {
  if (rows.length === 0) return <div className="text-center text-sm text-ink-3 py-8">{emptyText}</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-canvas">
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 text-xs font-medium text-ink-3 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-divider-light">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface-warm transition-colors">
              {columns.map(col => (
                <td key={col.key} className={`px-4 py-3 text-sm ${col.align === 'right' ? 'text-right font-mono' : ''}`}>
                  {col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
