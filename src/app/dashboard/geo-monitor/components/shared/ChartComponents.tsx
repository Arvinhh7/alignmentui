'use client'

import { useState } from 'react'
import { MultiBrandTrendData as ApiMultiBrandTrendData, BrandTrendPoint } from '@/lib/api'
import { X } from 'lucide-react'
import type { ScanHistoryEntry } from './constants'
import { TAG_SEPARATORS, splitTagInput } from './constants'

// ─── Helpers ─────────────────────────────────────────

export function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

export function DonutChart({ segments, centerLabel, size = 160 }: {
  segments: { label: string; value: number; color: string }[]
  centerLabel?: string
  size?: number
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
      <div className="mt-4 space-y-1.5 w-full max-w-[220px]">
        {segments.filter(s => s.value > 0).map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-ink-2 text-xs">{s.label}</span>
            </div>
            <span className="font-mono text-xs font-medium text-ink">{s.value} ({((s.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
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

export function ScanHistoryTrendChart({ data }: { data: ScanHistoryEntry[] }) {
  if (data.length === 0) return <div className="text-center py-8 text-ink-3 text-sm">No scan history yet. Run multiple scans to see trends.</div>
  const W = 640, H = 180, PX = 40, PY = 16, plotW = W - PX - 40, plotH = H - PY - 34
  // Fixed 0–100% Y axis so axis is stable and curves never show phantom > 100% values
  const yMax = 100
  const yTicks = [0, 25, 50, 75, 100]
  const pts = data.map((d, i) => {
    const clamped = Math.max(0, Math.min(100, d.visibility_score))
    return {
      x: PX + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
      y: PY + plotH - (clamped / yMax) * plotH,
      vis: clamped,
      date: d.date,
    }
  })
  const curvePath = catmullRomPath(pts)
  const maxLabels = Math.min(10, data.length)
  const labelIndices: number[] = []
  if (data.length <= maxLabels) data.forEach((_, i) => labelIndices.push(i))
  else for (let i = 0; i < maxLabels; i++) labelIndices.push(Math.round(i * (data.length - 1) / (maxLabels - 1)))
  const fmtDate = (s: string | undefined | null) => {
    if (!s || typeof s !== 'string') return ''
    const p = s.split('T')[0].split('-')
    if (p.length === 3) {
      const m = parseInt(p[1])
      const d = parseInt(p[2])
      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`
    }
    return s
  }
  const lastPt = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id="sh-clip"><rect x={PX} y={PY} width={plotW} height={plotH} /></clipPath></defs>
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PX} y1={PY + plotH - (v / yMax) * plotH} x2={W - 40} y2={PY + plotH - (v / yMax) * plotH} stroke="#C8BFB0" strokeWidth="0.7" />
          <text x={PX - 6} y={PY + plotH - (v / yMax) * plotH + 3.5} textAnchor="end" fill="#2D2B27" fontSize="9" fontFamily="-apple-system, system-ui, sans-serif">{v}%</text>
        </g>
      ))}
      {labelIndices.map(i => (
        <text key={i} x={pts[i].x} y={H - 3} textAnchor="middle" fill="#2D2B27" fontSize="9" fontFamily="-apple-system, system-ui, sans-serif">{fmtDate(data[i].date)}</text>
      ))}
      <path d={curvePath} fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" clipPath="url(#sh-clip)" />
      {lastPt && (
        <text x={lastPt.x + 6} y={lastPt.y + 3.5} fill="#000000" fontSize="10" fontWeight="600" fontFamily="-apple-system, system-ui, sans-serif">{lastPt.vis}%</text>
      )}
    </svg>
  )
}

// ─── UnifiedTrendChart (multi-brand with hover) ──────

export type MultiBrandTrendData = ApiMultiBrandTrendData

export function UnifiedTrendChart({ data, brandName, scanHistory }: {
  data: ApiMultiBrandTrendData; brandName: string; scanHistory: ScanHistoryEntry[]
}) {
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null)
  const [hoverX, setHoverX] = useState<number | null>(null)

  const dateMap: Record<string, Record<string, BrandTrendPoint>> = {}
  for (const pt of data.data_points) {
    if (!dateMap[pt.date]) dateMap[pt.date] = {}
    dateMap[pt.date][pt.brand_name] = pt
  }
  for (const entry of scanHistory) {
    if (!entry.date || typeof entry.date !== 'string') continue  // guard: malformed history row
    const d = entry.date.split('T')[0]
    if (!dateMap[d]) dateMap[d] = {}
    if (!dateMap[d][brandName]) {
      dateMap[d][brandName] = { brand_name: brandName, date: d, visibility_score: entry.visibility_score, mention_quality_avg: 0, sentiment_avg: 0, mention_count: entry.mentions_found }
    }
  }
  const dates = Object.keys(dateMap).sort()
  if (dates.length === 0) return <div className="text-center py-8 text-ink-3 text-sm">No trend data available yet.</div>

  const brands = data.brands.length > 0 ? data.brands : [brandName]
  const BRAND_COLORS = ['#000000', '#4A6FA5', '#0A0A0A', '#B8860B', '#7B5E96', '#2D2B27', '#4A7C59', '#B5453A']
  // Reduced height (260→200) so the chart is less dominant in the layout
  const W = 640, H = 200, PX = 40, PY = 16, plotW = W - PX - 40, plotH = H - PY - 34
  const getBrandColor = (brand: string, idx: number) => brand === brandName ? '#000000' : BRAND_COLORS[idx % BRAND_COLORS.length]

  // Always use 0–100 range so the Y axis is stable and never exceeds 100%.
  // catmullRom curves can mathematically overshoot — a clipPath clips them.
  const yMax = 100
  const yTicks = [0, 25, 50, 75, 100]

  const maxLabels = Math.min(10, dates.length)
  const labelIndices: number[] = []
  if (dates.length <= maxLabels) dates.forEach((_, i) => labelIndices.push(i))
  else for (let i = 0; i < maxLabels; i++) labelIndices.push(Math.round(i * (dates.length - 1) / (maxLabels - 1)))

  const fmtDate = (s: string | undefined | null) => {
    if (!s || typeof s !== 'string') return ''
    const p = s.split('-')
    if (p.length === 3) {
      const m = parseInt(p[1])
      const d = parseInt(p[2])
      return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${d}`
    }
    return s
  }

  const toX = (i: number) => PX + (dates.length > 1 ? (i / (dates.length - 1)) * plotW : plotW / 2)
  // Clamp input to [0, yMax] before computing Y so catmullRom overshoots don't
  // escape the plot area even before the SVG clipPath catches them.
  const toY = (v: number) => PY + plotH - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH

  const brandCurves = brands.map((brand, bIdx) => {
    const color = getBrandColor(brand, bIdx)
    const pts = dates.map((date, i) => {
      const vis = Math.max(0, Math.min(100, dateMap[date]?.[brand]?.visibility_score || 0))
      return { x: toX(i), y: toY(vis), vis }
    })
    return { brand, color, pts, bIdx }
  })

  const clipId = 'trend-clip'

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet"
        onMouseMove={e => { const r = (e.target as SVGElement).closest('svg')?.getBoundingClientRect(); if (r) setHoverX(((e.clientX - r.left) / r.width) * W) }}
        onMouseLeave={() => setHoverX(null)}>
        {/* Clip all curve paths to the plot area so catmullRom overshoots are invisible */}
        <defs>
          <clipPath id={clipId}>
            <rect x={PX} y={PY} width={plotW} height={plotH} />
          </clipPath>
        </defs>
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PX} y1={toY(v)} x2={W - 40} y2={toY(v)} stroke="#C8BFB0" strokeWidth="0.7" />
            <text x={PX - 6} y={toY(v) + 3.5} textAnchor="end" fill="#2D2B27" fontSize="9" fontFamily="-apple-system, system-ui, sans-serif">{v}%</text>
          </g>
        ))}
        {labelIndices.map(i => (
          <text key={i} x={toX(i)} y={H - 3} textAnchor="middle" fill="#2D2B27" fontSize="9" fontFamily="-apple-system, system-ui, sans-serif">{fmtDate(dates[i])}</text>
        ))}
        {hoverX !== null && hoverX >= PX && hoverX <= PX + plotW && (
          <line x1={hoverX} y1={PY} x2={hoverX} y2={PY + plotH} stroke="#C8BFB0" strokeWidth="0.8" strokeDasharray="3 3" />
        )}
        {brandCurves.map(({ brand, color, pts, bIdx }) => {
          const isHovered = hoveredBrand === brand
          const isAnyHovered = hoveredBrand !== null
          const isDimmed = isAnyHovered && !isHovered
          const isOwn = brand === brandName
          const opacity = isDimmed ? 0.1 : 1
          const strokeW = isHovered ? 2.8 : isOwn && !isAnyHovered ? 2.2 : 1.5
          const curve = catmullRomPath(pts)
          const lastPt = pts[pts.length - 1]
          return (
            <g key={bIdx} style={{ opacity, transition: 'opacity 0.4s ease' }}>
              <path d={curve} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke-width 0.3s ease' }} clipPath={`url(#${clipId})`} />
              {!isDimmed && lastPt && (
                <text x={lastPt.x + 6} y={lastPt.y + 3.5} fill={color} fontSize="10" fontWeight="600" fontFamily="-apple-system, system-ui, sans-serif">{lastPt.vis}%</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {brands.map((brand, i) => {
          const color = getBrandColor(brand, i)
          const isHovered = hoveredBrand === brand
          const isOwn = brand === brandName
          return (
            <button key={i} onMouseEnter={() => setHoveredBrand(brand)} onMouseLeave={() => setHoveredBrand(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${isHovered ? 'shadow-md scale-[1.06] border-divider bg-surface' : 'border-divider-light bg-canvas hover:bg-surface hover:border-divider'}`}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className={isOwn ? 'text-ink font-semibold' : 'text-ink-2'}>{brand}</span>
              {isOwn && <span className="text-[8px] px-1 py-px bg-surface-warm text-ink-2 rounded-full font-semibold">You</span>}
            </button>
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
