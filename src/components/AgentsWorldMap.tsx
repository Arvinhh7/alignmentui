'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { ScatterChart, EffectScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([ScatterChart, EffectScatterChart, GeoComponent, TooltipComponent, CanvasRenderer])

/* ── Public API ──────────────────────────────────────────────────── */
export interface AgentLocation {
  country: string         // ISO-2
  customers: number       // # of Customer Agents in that country
  products: number        // # of Product Agents (brands) HQ'd in that country
}

type Mode = 'customers' | 'products'

/* ── Geography ───────────────────────────────────────────────────── */
const ISO_TO_NAME: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany',
  FR: 'France', CA: 'Canada', AU: 'Australia', JP: 'Japan',
  CN: 'China', IN: 'India', BR: 'Brazil', RU: 'Russia',
  KR: 'South Korea', MX: 'Mexico', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', SE: 'Sweden', SG: 'Singapore', AE: 'United Arab Emirates',
  IL: 'Israel', HK: 'Hong Kong', TW: 'Taiwan', NZ: 'New Zealand',
  AR: 'Argentina', ZA: 'South Africa', TR: 'Turkey', PL: 'Poland',
  ID: 'Indonesia', PH: 'Philippines', TH: 'Thailand', VN: 'Vietnam',
  MY: 'Malaysia', CH: 'Switzerland', BE: 'Belgium', AT: 'Austria',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', IE: 'Ireland',
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-97, 38], CA: [-95, 60], MX: [-102, 23],
  GB: [-3, 55], DE: [10, 51], FR: [2, 46],
  IT: [12, 43], ES: [-4, 40], NL: [5, 52], BE: [4, 50],
  CH: [8, 47], AT: [14, 47], PL: [20, 52], SE: [18, 62],
  NO: [13, 65], DK: [10, 56], FI: [25, 64], IE: [-8, 53],
  RU: [90, 60], TR: [35, 39],
  CN: [103, 35], JP: [138, 36], KR: [128, 36],
  IN: [77, 20], VN: [108, 16], TH: [101, 15], MY: [112, 3],
  SG: [104, 1], ID: [120, -5], PH: [122, 12],
  HK: [114, 22], TW: [121, 23],
  AU: [133, -27], NZ: [174, -41],
  BR: [-53, -15], AR: [-65, -35],
  ZA: [25, -29], IL: [35, 31], AE: [54, 24],
}

/* ── Color tokens ────────────────────────────────────────────────── */
const TOKENS = {
  customer: '#1a7a4c',           // sage green = Customer Agents
  customerBg: 'rgba(26,122,76,0.85)',
  product:  '#991B1B',           // deep red = Product Agents
  productBg: 'rgba(153,27,27,0.85)',
  land:        '#E8E3DA',
  landBorder:  '#D4CFC6',
  ocean:       '#F3F0EA',
  canvas:      '#FAF5EC',
}

function flagEmoji(cc: string): string {
  return cc
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

/* ── Component ───────────────────────────────────────────────────── */
export default function AgentsWorldMap({ data }: { data: AgentLocation[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [mapRegistered, setMapRegistered] = useState(false)
  const [mode, setMode] = useState<Mode>('customers')

  // Register world map GeoJSON once
  useEffect(() => {
    fetch('/data/world.json')
      .then(r => r.json())
      .then(json => {
        echarts.registerMap('world', json)
        setMapRegistered(true)
      })
      .catch(() => {})
  }, [])

  // Derive scatter data based on selected mode
  const { scatterData, maxVal, totalCount, countryCount } = useMemo(() => {
    let max = 0
    let total = 0
    const color = mode === 'customers' ? TOKENS.customerBg : TOKENS.productBg

    const filtered = data
      .filter(d => COUNTRY_COORDS[d.country])
      .map(d => {
        const val = mode === 'customers' ? d.customers : d.products
        if (val > max) max = val
        total += val
        return {
          name: ISO_TO_NAME[d.country] || d.country,
          value: [...COUNTRY_COORDS[d.country], val] as [number, number, number],
          itemStyle: { color },
          raw: d,
        }
      })
      .filter(d => d.value[2] > 0)
      .sort((a, b) => b.value[2] - a.value[2])

    return { scatterData: filtered, maxVal: max, totalCount: total, countryCount: filtered.length }
  }, [data, mode])

  const topData = useMemo(() => scatterData.slice(0, 3), [scatterData])

  const accent = mode === 'customers' ? TOKENS.customer : TOKENS.product
  const noun   = mode === 'customers' ? 'Customer Agents' : 'Product Agents'

  // Build chart options
  const option: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0,0,0,0.92)',
      borderColor: 'rgba(250,245,236,0.12)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: TOKENS.canvas, fontSize: 12, fontFamily: 'system-ui, sans-serif' },
      formatter: (params: unknown) => {
        const p = params as { data?: { raw?: AgentLocation } }
        const d = p.data?.raw
        if (!d) return ''
        const flag = flagEmoji(d.country)
        const name = ISO_TO_NAME[d.country] || d.country
        return `
          <div style="font-weight:600;font-size:13px;margin-bottom:6px">${flag} ${name}</div>
          <div style="display:flex;gap:14px;font-size:11px;opacity:0.85">
            <span style="color:${TOKENS.customer}">Customer ${d.customers}</span>
            <span style="color:${TOKENS.product}">Product ${d.products}</span>
          </div>
        `
      },
    },
    geo: {
      map: 'world',
      roam: true,
      scaleLimit: { min: 1, max: 6 },
      silent: true,
      center: [10, 20],
      zoom: 1.2,
      itemStyle: { areaColor: TOKENS.land, borderColor: TOKENS.landBorder, borderWidth: 0.6 },
      emphasis: { disabled: true },
      regions: [{ name: 'Antarctica', itemStyle: { areaColor: 'transparent', borderWidth: 0 } }],
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val: number[]) => {
          const pct = maxVal > 0 ? val[2] / maxVal : 0
          return Math.max(8, Math.sqrt(pct) * 36)
        },
        itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.15)' },
        emphasis: { scale: 1.4, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.25)' } },
      },
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: topData,
        symbolSize: (val: number[]) => {
          const pct = maxVal > 0 ? val[2] / maxVal : 0
          return Math.max(10, Math.sqrt(pct) * 36)
        },
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.12)' },
      },
    ],
  }), [scatterData, topData, maxVal])

  // Init / update chart
  useEffect(() => {
    if (!chartRef.current || !mapRegistered) return
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' })
    }
    chartInstance.current.setOption(option, true)
    const onResize = () => chartInstance.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [option, mapRegistered])

  useEffect(() => {
    const ro = new ResizeObserver(() => chartInstance.current?.resize())
    if (chartRef.current) ro.observe(chartRef.current)
    return () => ro.disconnect()
  }, [])

  const ranked = useMemo(() => scatterData.slice(0, 8), [scatterData])

  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-elevation-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <h3 className="text-[15px] font-semibold text-ink">Global Agents Distribution</h3>
        </div>

        {/* 2-mode toggle: Customer / Product */}
        <div className="flex bg-surface-warm rounded-lg p-0.5">
          {([
            { key: 'customers' as const, label: 'Customer Agents', color: TOKENS.customer },
            { key: 'products'  as const, label: 'Product Agents',  color: TOKENS.product  },
          ]).map(b => (
            <button
              key={b.key}
              onClick={() => setMode(b.key)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
              style={mode === b.key
                ? { background: b.color, color: '#fff' }
                : { color: '#7a7568' }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <p className="text-xs text-ink-3 mb-3">
        <span className="font-semibold tabular-nums" style={{ color: accent }}>{totalCount.toLocaleString()}</span>{' '}
        {noun.toLowerCase()} across <span className="font-semibold tabular-nums">{countryCount}</span> countries
      </p>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-divider-light" style={{ background: TOKENS.ocean }}>
        {scatterData.length === 0 ? (
          <div className="flex items-center justify-center h-[380px] text-sm text-ink-3">
            No {noun.toLowerCase()} in this view
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 380 }} />
        )}
      </div>

      {/* Country ranking */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-xs">
          {ranked.map((d, i) => (
            <div key={d.raw.country} className="flex items-center gap-2 py-1">
              <span className="text-ink-3 w-4 text-right font-mono">{i + 1}</span>
              <span>{flagEmoji(d.raw.country)}</span>
              <span className="text-ink-2 truncate flex-1">{d.name}</span>
              <span className="font-semibold tabular-nums" style={{ color: accent }}>{d.value[2]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
