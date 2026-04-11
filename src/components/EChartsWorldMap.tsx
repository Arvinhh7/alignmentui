'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { MapChart, ScatterChart, EffectScatterChart } from 'echarts/charts'
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

// Register once
echarts.use([
  MapChart,
  ScatterChart,
  EffectScatterChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  CanvasRenderer,
])

/* ── Data types ──────────────────────────────────────────────────── */
interface GeoDataItem {
  country: string
  visit_count: number
  bot_count: number
  referral_count: number
}

type GeoFilter = 'traffic' | 'visits' | 'referral'

/* ── Country code → ECharts name mapping ─────────────────────────── */
const ISO_TO_NAME: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany',
  FR: 'France', CA: 'Canada', AU: 'Australia', JP: 'Japan',
  CN: 'China', IN: 'India', BR: 'Brazil', RU: 'Russia',
  KR: 'South Korea', MX: 'Mexico', IT: 'Italy', ES: 'Spain',
  PT: 'Portugal', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland',
  AT: 'Austria', PL: 'Poland', CZ: 'Czech Republic', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', RO: 'Romania',
  GR: 'Greece', UA: 'Ukraine', TR: 'Turkey', HU: 'Hungary',
  BY: 'Belarus', VN: 'Vietnam', TH: 'Thailand', MY: 'Malaysia',
  SG: 'Singapore', ID: 'Indonesia', PH: 'Philippines', HK: 'Hong Kong',
  TW: 'Taiwan', NZ: 'New Zealand', AR: 'Argentina', CL: 'Chile',
  CO: 'Colombia', PE: 'Peru', ZA: 'South Africa', NG: 'Nigeria',
  EG: 'Egypt', KE: 'Kenya', MA: 'Morocco', ET: 'Ethiopia',
  IL: 'Israel', SA: 'Saudi Arabia', AE: 'United Arab Emirates',
  IR: 'Iran', IQ: 'Iraq', KZ: 'Kazakhstan', UZ: 'Uzbekistan',
  MN: 'Mongolia', NP: 'Nepal', SK: 'Slovakia', HR: 'Croatia',
  BG: 'Bulgaria', RS: 'Serbia', LT: 'Lithuania', LV: 'Latvia',
  EE: 'Estonia', IS: 'Iceland', IE: 'Ireland', PK: 'Pakistan',
  BD: 'Bangladesh', DZ: 'Algeria', TZ: 'Tanzania', GH: 'Ghana',
  MD: 'Moldova', KW: 'Kuwait', QA: 'Qatar',
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-97, 38], CA: [-95, 60], MX: [-102, 23],
  GB: [-3, 55], DE: [10, 51], FR: [2, 46],
  IT: [12, 43], ES: [-4, 40], PT: [-8, 39],
  NL: [5, 52], BE: [4, 50], CH: [8, 47],
  AT: [14, 47], PL: [20, 52], CZ: [15, 50],
  SE: [18, 62], NO: [13, 65], DK: [10, 56],
  FI: [25, 64], RO: [25, 46], GR: [22, 39],
  UA: [32, 49], TR: [35, 39], HU: [19, 47],
  RU: [90, 60], BY: [28, 53],
  CN: [103, 35], JP: [138, 36], KR: [128, 36],
  IN: [77, 20], PK: [70, 30], BD: [90, 23],
  VN: [108, 16], TH: [101, 15], MY: [112, 3],
  SG: [104, 1], ID: [120, -5], PH: [122, 12],
  HK: [114, 22], TW: [121, 23],
  AU: [133, -27], NZ: [174, -41],
  BR: [-53, -15], AR: [-65, -35], CL: [-71, -35],
  CO: [-74, 4], PE: [-75, -10],
  ZA: [25, -29], NG: [8, 8], EG: [30, 27],
  KE: [38, -1], MA: [-6, 32], ET: [38, 8],
  IL: [35, 31], SA: [45, 24], AE: [54, 24],
  IR: [53, 32], IQ: [44, 33],
  KZ: [68, 48], UZ: [64, 41],
  MN: [105, 46], NP: [84, 28],
  SK: [19, 49], HR: [16, 45], BG: [25, 43],
  RS: [21, 44], LT: [24, 56], LV: [25, 57],
  EE: [25, 58], IS: [-18, 65], IE: [-8, 53],
  MD: [29, 47], KW: [48, 29], QA: [51, 25],
  DZ: [2, 28], TZ: [35, -6], GH: [-1, 8],
}

/* ── Warm Design Tokens ──────────────────────────────────────────── */
const WARM = {
  canvas:       '#FAF7F2',
  surface:      '#FFFFFF',
  surfaceWarm:  '#F3EDE4',
  divider:      '#E0DBD2',
  dividerLight: '#EDE8E0',
  ink:          '#191918',
  ink2:         '#6B6860',
  ink3:         '#9C978E',
  bot:          '#00C8E8',
  referral:     '#9B30E8',
  both:         '#FF5520',
  sage:         '#4A7C59',
  land:         '#E8E3DA',
  landBorder:   '#D4CFC6',
  ocean:        '#F3F0EA',
}

function flagEmoji(cc: string): string {
  return cc
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

/* ── Component ───────────────────────────────────────────────────── */
export default function EChartsWorldMap({ geoData }: { geoData: GeoDataItem[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<echarts.ECharts | null>(null)
  const [mapRegistered, setMapRegistered] = useState(false)
  const [filter, setFilter] = useState<GeoFilter>('traffic')

  // Register world map GeoJSON
  useEffect(() => {
    fetch('/data/world.json')
      .then(r => r.json())
      .then(json => {
        echarts.registerMap('world', json)
        setMapRegistered(true)
      })
      .catch(() => {})
  }, [])

  // Derive scatter data
  const { scatterData, maxVal, totalCount, countryCount } = useMemo(() => {
    let max = 0
    let total = 0
    const data = geoData
      .filter(d => COUNTRY_COORDS[d.country])
      .map(d => {
        // AI Referral = non-bot AI traffic (visit_count - bot_count)
        const effectiveReferral = Math.max(0, d.visit_count - d.bot_count)
        const val =
          filter === 'visits' ? d.bot_count
            : filter === 'referral' ? effectiveReferral
              : d.visit_count
        if (val > max) max = val
        total += val

        const hasBots = d.bot_count > 0
        const hasRef = effectiveReferral > 0
        const color = (hasBots && hasRef) ? WARM.both : hasBots ? WARM.bot : WARM.referral
        const name = ISO_TO_NAME[d.country] || d.country

        return {
          name,
          value: [...COUNTRY_COORDS[d.country], val] as [number, number, number],
          itemStyle: { color },
          raw: { ...d, effectiveReferral },
        }
      })
      .filter(d => d.value[2] > 0)
      .sort((a, b) => b.value[2] - a.value[2])

    return { scatterData: data, maxVal: max, totalCount: total, countryCount: data.length }
  }, [geoData, filter])

  // Top countries for the scatter effect (top 3 pulsing)
  const topData = useMemo(() => scatterData.slice(0, 3), [scatterData])

  // Build chart options
  const option: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(25,25,24,0.92)',
      borderColor: 'rgba(250,247,242,0.12)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: WARM.canvas, fontSize: 12, fontFamily: 'system-ui, sans-serif' },
      formatter: (params: any) => {
        const d = params.data?.raw as (GeoDataItem & { effectiveReferral: number }) | undefined
        if (!d) return ''
        const flag = flagEmoji(d.country)
        const name = ISO_TO_NAME[d.country] || d.country
        return `
          <div style="font-weight:600;font-size:13px;margin-bottom:6px">${flag} ${name}</div>
          <div style="display:flex;gap:16px;font-size:11px;opacity:0.8">
            <span style="color:${WARM.bot}">Bot ${d.bot_count}</span>
            <span style="color:${WARM.referral}">Referral ${d.effectiveReferral}</span>
            <span>Total ${d.visit_count}</span>
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
      itemStyle: {
        areaColor: WARM.land,
        borderColor: WARM.landBorder,
        borderWidth: 0.6,
      },
      emphasis: {
        disabled: true,
      },
      regions: [
        { name: 'Antarctica', itemStyle: { areaColor: 'transparent', borderWidth: 0 } },
      ],
    },
    series: [
      // Bubble scatter
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: scatterData,
        symbolSize: (val: number[]) => {
          const pct = maxVal > 0 ? val[2] / maxVal : 0
          return Math.max(8, Math.sqrt(pct) * 36)
        },
        itemStyle: {
          shadowBlur: 8,
          shadowColor: 'rgba(25,25,24,0.15)',
        },
        emphasis: {
          scale: 1.4,
          itemStyle: { shadowBlur: 14, shadowColor: 'rgba(25,25,24,0.25)' },
        },
      },
      // Pulsing effect on top countries
      {
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: topData,
        symbolSize: (val: number[]) => {
          const pct = maxVal > 0 ? val[2] / maxVal : 0
          return Math.max(10, Math.sqrt(pct) * 36)
        },
        showEffectOn: 'render',
        rippleEffect: {
          brushType: 'stroke',
          scale: 3,
          period: 4,
        },
        itemStyle: { shadowBlur: 6, shadowColor: 'rgba(25,25,24,0.12)' },
      },
    ],
  }), [scatterData, topData, maxVal])

  // Initialize & update chart
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

  // Resize on container changes
  useEffect(() => {
    const ro = new ResizeObserver(() => chartInstance.current?.resize())
    if (chartRef.current) ro.observe(chartRef.current)
    return () => ro.disconnect()
  }, [])

  const isEmpty = geoData.length === 0

  const filterBtns: { key: GeoFilter; label: string }[] = [
    { key: 'traffic',  label: 'AI Traffic' },
    { key: 'visits',   label: 'AI Visits' },
    { key: 'referral', label: 'AI Referral' },
  ]

  // Sorted list for ranking
  const ranked = useMemo(() => scatterData.slice(0, 12), [scatterData])

  return (
    <div className="bg-surface rounded-2xl border border-divider-light p-5 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <h3 className="text-[15px] font-semibold text-ink">Global AI Traffic Distribution</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex bg-surface-warm rounded-lg p-0.5">
            {filterBtns.map(b => (
              <button
                key={b.key}
                onClick={() => setFilter(b.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === b.key
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Stats summary */}
      <p className="text-xs text-ink-3 mb-3">
        {totalCount.toLocaleString()} total visits from {countryCount} countries
      </p>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-divider-light" style={{ background: WARM.ocean }}>
        {isEmpty ? (
          <div className="flex items-center justify-center h-[380px] text-sm text-ink-3">
            No geo data available yet
          </div>
        ) : (
          <div ref={chartRef} style={{ width: '100%', height: 380 }} />
        )}
      </div>

      {/* Country ranking */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-4 text-xs">
          {ranked.map((d, i) => {
            const raw = d.raw
            return (
              <div key={raw.country} className="flex items-center gap-2 py-1">
                <span className="text-ink-3 w-4 text-right font-mono">{i + 1}</span>
                <span>{flagEmoji(raw.country)}</span>
                <span className="text-ink-2 truncate flex-1">{d.name}</span>
                <span className="text-ink font-semibold tabular-nums">{d.value[2]}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
