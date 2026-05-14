'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

export interface DailyPoint {
  date: string        // ISO YYYY-MM-DD
  quotes: number      // total quotes issued
  commits: number     // successful commits (= "Success")
}

const COLORS = {
  success:    '#1a7a4c',                   // green = Success (committed)
  noSale:     'rgba(153, 27, 27, 0.45)',   // muted red = Quoted but no sale
  rate:       '#6D4AE8',                   // purple = Success-rate line
  axis:       '#9E9484',
  axisText:   '#7a7568',
  grid:       'rgba(158, 148, 132, 0.18)',
}

export default function QuoteSuccessChart({ data, height = 280 }: { data: DailyPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)

  const option: EChartsOption = useMemo(() => {
    const dates    = data.map(d => d.date.slice(5))                            // MM-DD
    const success  = data.map(d => d.commits)
    const noSale   = data.map(d => Math.max(0, d.quotes - d.commits))
    const rate     = data.map(d => d.quotes > 0 ? Math.round((d.commits / d.quotes) * 1000) / 10 : 0)

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(0,0,0,0.92)',
        borderColor: 'rgba(250,245,236,0.12)',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#FAF5EC', fontSize: 12, fontFamily: 'system-ui, sans-serif' },
        formatter: (params: unknown) => {
          const arr = params as { axisValue: string; seriesName: string; value: number; color: string }[]
          if (!arr.length) return ''
          const date = arr[0].axisValue
          const total = (arr.find(p => p.seriesName === 'Success')?.value ?? 0)
                      + (arr.find(p => p.seriesName === 'Quoted (no sale)')?.value ?? 0)
          const rows = arr.map(p => `
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;margin-top:3px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color}"></span>
              <span style="opacity:0.75">${p.seriesName}</span>
              <span style="margin-left:auto;font-weight:600">${p.value}${p.seriesName === 'Success Rate' ? '%' : ''}</span>
            </div>`).join('')
          return `
            <div style="font-weight:600;margin-bottom:4px">${date}</div>
            <div style="font-size:10px;opacity:0.55;margin-bottom:4px">Total quotes: ${total}</div>
            ${rows}`
        },
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: COLORS.axisText, fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 14,
        data: [
          { name: 'Success',          icon: 'rect' },
          { name: 'Quoted (no sale)', icon: 'rect' },
          { name: 'Success Rate',     icon: 'roundRect' },
        ],
      },
      grid: { left: 36, right: 42, top: 28, bottom: 24 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine:  { lineStyle: { color: COLORS.axis } },
        axisLabel: { color: COLORS.axisText, fontSize: 10, interval: dates.length > 30 ? Math.floor(dates.length / 12) : 'auto' },
        axisTick:  { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '',
          axisLine:  { show: false },
          axisLabel: { color: COLORS.axisText, fontSize: 10 },
          splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        },
        {
          type: 'value',
          name: '',
          max: 100,
          min: 0,
          axisLine:  { show: false },
          axisLabel: { color: COLORS.axisText, fontSize: 10, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Success',
          type: 'bar',
          stack: 'quotes',
          data: success,
          itemStyle: { color: COLORS.success, borderRadius: [0, 0, 0, 0] },
          barCategoryGap: '20%',
        },
        {
          name: 'Quoted (no sale)',
          type: 'bar',
          stack: 'quotes',
          data: noSale,
          itemStyle: { color: COLORS.noSale, borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Success Rate',
          type: 'line',
          yAxisIndex: 1,
          data: rate,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: COLORS.rate, width: 2 },
          itemStyle: { color: COLORS.rate, borderColor: '#fff', borderWidth: 1.5 },
          z: 10,
        },
      ],
    }
  }, [data])

  useEffect(() => {
    if (!ref.current) return
    if (!inst.current) inst.current = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    inst.current.setOption(option, true)
    const onResize = () => inst.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [option])

  useEffect(() => {
    const ro = new ResizeObserver(() => inst.current?.resize())
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-ink-3" style={{ height }}>No data</div>
  }

  return <div ref={ref} style={{ width: '100%', height }} />
}
