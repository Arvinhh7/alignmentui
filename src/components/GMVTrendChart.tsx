'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

export interface GMVPoint {
  date: string        // ISO YYYY-MM-DD
  gmv: number         // total gross GMV
  commission: number  // commission amount (subset of gmv)
  transactions: number
}

const COLORS = {
  gmvNet:     'rgba(139, 92, 246, 0.42)',  // purple = GMV net of commission
  commission: 'rgba(234, 179, 8, 0.80)',   // yellow = Commission base strip
  growth:     '#6D4AE8',                   // purple line = GMV cumulative growth
  axis:       '#9E9484',
  axisText:   '#7a7568',
  grid:       'rgba(158, 148, 132, 0.18)',
}

function fmtDollar(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

export default function GMVTrendChart({ data, height = 280 }: { data: GMVPoint[]; height?: number }) {
  const ref  = useRef<HTMLDivElement>(null)
  const inst = useRef<echarts.ECharts | null>(null)

  const option: EChartsOption = useMemo(() => {
    const dates    = data.map(d => d.date.slice(5))                   // MM-DD
    const commData = data.map(d => d.commission)
    const netData  = data.map(d => Math.max(0, d.gmv - d.commission)) // purple portion

    // GMV cumulative growth from Day-1 baseline (always ≥ 0, monotonically rising)
    const baseGMV = data.length > 0 ? data[0].gmv : 0
    const growth  = data.map(d =>
      baseGMV > 0 ? parseFloat(((d.gmv / baseGMV - 1) * 100).toFixed(1)) : 0
    )

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
          const arr = params as { axisValue: string; seriesName: string; value: number }[]
          if (!arr.length) return ''
          const date    = arr[0].axisValue
          const netVal  = arr.find(p => p.seriesName === 'GMV')?.value ?? 0
          const commVal = arr.find(p => p.seriesName === 'Commission')?.value ?? 0
          const growVal = arr.find(p => p.seriesName === 'GMV Growth')?.value ?? 0
          const totalGMV = netVal + commVal
          return `
            <div style="font-weight:600;margin-bottom:6px">${date}</div>
            <div style="font-size:11px;display:flex;justify-content:space-between;gap:16px;margin-top:3px">
              <span style="opacity:0.7">Total GMV</span>
              <span style="font-weight:600">$${totalGMV.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div style="font-size:11px;display:flex;justify-content:space-between;gap:16px;margin-top:2px">
              <span style="opacity:0.7">Commission</span>
              <span style="font-weight:600;color:#EAB308">$${commVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div style="font-size:11px;display:flex;justify-content:space-between;gap:16px;margin-top:2px">
              <span style="opacity:0.7">GMV Growth</span>
              <span style="font-weight:600;color:#8B5CF6">+${growVal}%</span>
            </div>`
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
          { name: 'GMV',        icon: 'rect' },
          { name: 'Commission', icon: 'rect' },
          { name: 'GMV Growth', icon: 'roundRect' },
        ],
      },
      grid: { left: 52, right: 52, top: 28, bottom: 24 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine:  { lineStyle: { color: COLORS.axis } },
        axisLabel: {
          color: COLORS.axisText,
          fontSize: 10,
          interval: dates.length > 20 ? Math.floor(dates.length / 10) : 'auto',
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          axisLine:  { show: false },
          axisLabel: {
            color: COLORS.axisText,
            fontSize: 10,
            formatter: (v: number) => fmtDollar(v),
          },
          splitLine: { lineStyle: { color: COLORS.grid, type: 'dashed' } },
        },
        {
          type: 'value',
          min: 0,
          axisLine:  { show: false },
          axisLabel: { color: COLORS.axisText, fontSize: 10, formatter: '+{value}%' },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Commission',
          type: 'bar',
          stack: 'gmv',
          data: commData,
          itemStyle: { color: COLORS.commission, borderRadius: [0, 0, 0, 0] },
          barCategoryGap: '20%',
        },
        {
          name: 'GMV',
          type: 'bar',
          stack: 'gmv',
          data: netData,
          itemStyle: { color: COLORS.gmvNet, borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'GMV Growth',
          type: 'line',
          yAxisIndex: 1,
          data: growth,
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { color: COLORS.growth, width: 2 },
          itemStyle: { color: COLORS.growth, borderColor: '#fff', borderWidth: 1.5 },
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
    return (
      <div className="flex items-center justify-center text-sm text-ink-3" style={{ height }}>
        No data
      </div>
    )
  }

  return <div ref={ref} style={{ width: '100%', height }} />
}
