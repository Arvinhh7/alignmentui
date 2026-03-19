'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api, setAuthFromSession } from '@/lib/api'
import { gaEvent } from '@/lib/gtag'
import { getSupabase } from '@/lib/supabase'

interface IndustryModel {
  code: string
  name: string
  name_zh: string
  conversion_rate: number
  gross_margin: number
  ai_multiplier: number
}

interface ROIResult {
  aov: number
  industry_code: string
  industry_name: string
  industry_name_zh: string
  geo_investment: number
  revenue_low: number
  revenue_high: number
  roi_low: number
  roi_high: number
  benchmark_roi_low: number
  benchmark_roi_high: number
  result_explanation: string
}

const ROI_SESSION_KEY = 'roi_simulator_session'

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
const fmtUSD = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
const fmtCustomers = (n: number) => {
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en-US')
}

function ROISimulatorInner() {
  const { t, lang } = useLanguage()
  const r = (t as unknown as Record<string, unknown>).roi as Record<string, unknown>
  const router = useRouter()
  const searchParams = useSearchParams()

  const [models, setModels] = useState<IndustryModel[]>([])
  const [aov, setAov] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<ROIResult | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)
  const autoCalcRef = useRef(false)

  useEffect(() => {
    api.roiGetModels().then(res => { if (res.data) setModels(res.data.models) })
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROI_SESSION_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        if (s.aov) setAov(s.aov)
        if (s.industry) setSelectedIndustry(s.industry)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (searchParams.get('unlock') === 'true' && !autoCalcRef.current) {
      autoCalcRef.current = true
      setUnlocked(true)
      try {
        const saved = localStorage.getItem(ROI_SESSION_KEY)
        if (saved) {
          const s = JSON.parse(saved)
          if (s.aov && s.industry) { setAov(s.aov); setSelectedIndustry(s.industry); doCalculate(s.aov, s.industry) }
        }
      } catch {}
    }
  }, [searchParams])

  const doCalculate = async (aovVal: string, industryVal: string) => {
    setIsCalculating(true)
    const res = await api.roiCalculate({ aov: parseFloat(aovVal), industry: industryVal })
    if (res.data) {
      setResult(res.data)
      setUnlocked(true)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      gaEvent('generate_lead', {
        aov: parseFloat(aovVal),
        industry: industryVal,
        roi_low: res.data.roi_low,
        roi_high: res.data.roi_high,
      })

      // Persist ROI estimate to user profile (only when authenticated)
      try {
        const supabase = getSupabase()
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            setAuthFromSession(session)
            await api.ga4SaveROIEstimate({
              aov:           res.data.aov,
              industry_code: res.data.industry_code,
              industry_name: res.data.industry_name,
              revenue_low:   res.data.revenue_low,
              revenue_high:  res.data.revenue_high,
              roi_low:       res.data.roi_low,
              roi_high:      res.data.roi_high,
              geo_investment: res.data.geo_investment,
            })
          }
        }
      } catch { /* non-critical */ }
    }
    setIsCalculating(false)
  }

  const handleCalculateClick = () => {
    if (!aov || !selectedIndustry) return
    localStorage.setItem(ROI_SESSION_KEY, JSON.stringify({ aov, industry: selectedIndustry }))
    router.push('/login/?from=roi')
  }

  const handleReset = () => {
    setResult(null); setUnlocked(false); setAov(''); setSelectedIndustry('')
    localStorage.removeItem(ROI_SESSION_KEY)
    window.history.replaceState({}, '', '/roi-simulator')
  }

  const modelName = (m: IndustryModel) => lang === 'zh' ? m.name_zh : m.name
  const industryDisplayName = () => result ? (lang === 'zh' ? result.industry_name_zh : result.industry_name) : ''

  const showInput = !unlocked || !result
  const showResult = unlocked && result !== null

  const potentialCustomersLow  = result ? Math.round(result.revenue_low  / result.aov) : 0
  const potentialCustomersHigh = result ? Math.round(result.revenue_high / result.aov) : 0

  const customerExplanation = (res: ROIResult) => {
    const industry = lang === 'zh' ? res.industry_name_zh : res.industry_name
    const low  = potentialCustomersLow.toLocaleString('en-US')
    const high = potentialCustomersHigh.toLocaleString('en-US')
    if (lang === 'zh') {
      return `在${industry}赛道，AI平台每月有大量高意向用户在搜索你的产品类别。按你的客单价 $${res.aov} 估算，通过 GEO 优化后，你的品牌在6个月内可额外触达 ${low}–${high} 位潜在新客户，转化后预计带来 ${fmtK(res.revenue_low)}–${fmtK(res.revenue_high)} 的收入增长（预期ROI ${res.roi_low}x–${res.roi_high}x）。`
    }
    return `In the ${industry} sector, AI platforms handle millions of high-intent searches monthly from buyers like yours. Based on your $${res.aov} AOV, GEO optimization could connect your brand with ${low}–${high} new customers over 6 months — translating to ${fmtK(res.revenue_low)}–${fmtK(res.revenue_high)} in incremental revenue at a ${res.roi_low}x–${res.roi_high}x ROI.`
  }

  const serviceIncludes = (r.includes as string[]) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity"><LogoFull width={140} height={45} /></Link>
            <div className="hidden lg:flex items-center gap-1">
              {[
                { label: t.nav.system, href: '#' }, { label: t.nav.solutions, href: '#' },
                { label: t.nav.technology, href: '#' }, { label: t.nav.pricing, href: '/pricing/' },
                { label: t.nav.docs, href: '#' }, { label: t.nav.insights, href: '#' }, { label: t.nav.contact, href: '#' },
              ].map((item, i) => (
                <Link key={i} href={item.href} className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors rounded-lg hover:bg-gray-50">{item.label}</Link>
              ))}
              <Link href="/roi-simulator" className="ml-1 px-3 py-1.5 text-red-600 hover:text-red-700 text-sm font-semibold transition-colors rounded-lg bg-red-50 hover:bg-red-100 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                {(t as unknown as Record<string, string>).nav_roi}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitch />
              <Link href="/login/" className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-sm">{t.nav.getStarted}</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(239,68,68,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(251,146,60,0.2) 0%, transparent 50%)' }} />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full mb-6">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-sm text-white/90 font-medium">{r.pillBadge as string}</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">{r.title as string}</h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">{r.subtitle as string}</p>
        </div>
      </section>

      {/* Main Card */}
      <section className="relative -mt-10 z-10 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

            {/* Input */}
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-center gap-2 mb-8">
                {[
                  { n: 1, label: lang === 'zh' ? '输入信息' : 'Your Info' },
                  { n: 2, label: lang === 'zh' ? '免费注册' : 'Free Sign Up' },
                  { n: 3, label: r.stepResults as string },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {i > 0 && <div className={`w-8 h-px ${showResult ? 'bg-red-300' : 'bg-gray-200'}`} />}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      (s.n === 1 && showInput) ? 'bg-red-500 text-white' : (s.n === 3 && showResult) ? 'bg-red-500 text-white' : showResult ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {showResult && s.n <= 2 ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <span>{s.n}</span>}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{r.aovLabel as string} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input type="number" value={aov} onChange={e => setAov(e.target.value)} placeholder={r.aovPlaceholder as string} min="1" disabled={showResult}
                      className="w-full pl-8 pr-16 py-3.5 border border-gray-300 rounded-xl text-gray-900 text-lg font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all disabled:bg-gray-50 disabled:text-gray-500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{r.aovUnit as string}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">{r.aovHint as string}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{r.industryLabel as string} <span className="text-red-500">*</span></label>
                  <select value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)} disabled={showResult}
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-xl text-gray-900 text-lg font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 12px center', backgroundRepeat: 'no-repeat', backgroundSize: '20px' }}>
                    <option value="">{r.industryPlaceholder as string}</option>
                    {models.map(m => <option key={m.code} value={m.code}>{modelName(m)}</option>)}
                  </select>
                </div>
              </div>

              {showInput && !isCalculating && (
                <div className="mt-8 text-center">
                  <button onClick={handleCalculateClick} disabled={!aov || !selectedIndustry}
                    className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    {r.calculate as string}
                  </button>
                  <p className="mt-3 text-xs text-gray-400">{lang === 'zh' ? '点击后将跳转至免费注册页面' : 'You\'ll be redirected to create a free account'}</p>
                </div>
              )}

              {isCalculating && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-3 px-8 py-4 bg-gray-100 rounded-xl">
                    <svg className="animate-spin w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    <span className="text-gray-600 font-medium">{r.calculating as string}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Results */}
            {showResult && result && (
              <div ref={resultRef}>
                <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10">
                  <h2 className="text-2xl font-bold text-white mb-8 text-center">{r.resultTitle as string}</h2>

                  {/* 3 Core Cards — Customers first */}
                  <div className="grid md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-gradient-to-br from-red-500/15 to-orange-500/10 backdrop-blur rounded-2xl p-6 text-center border border-red-500/30 ring-1 ring-red-500/10">
                      <div className="text-sm text-gray-300 mb-3 font-medium">{r.potentialCustomers as string}</div>
                      <div className="text-4xl md:text-5xl font-black text-white leading-tight">
                        {fmtCustomers(potentialCustomersLow)} – {fmtCustomers(potentialCustomersHigh)}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">{r.potentialCustomersNote as string}</div>
                    </div>
                    <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-6 text-center border border-white/10 hover:border-green-500/30 transition-all">
                      <div className="text-sm text-gray-400 mb-3 font-medium">{r.revenueUplift as string}</div>
                      <div className="text-3xl md:text-4xl font-bold text-green-400 leading-tight">{fmtK(result.revenue_low)} – {fmtK(result.revenue_high)}</div>
                      <div className="text-xs text-gray-500 mt-2">{lang === 'zh' ? '6个月内' : 'over 6 months'}</div>
                    </div>
                    <div className="bg-white/[0.07] backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                      <div className="text-sm text-gray-400 mb-3 font-medium">{r.roiRange as string}</div>
                      <div className="text-3xl md:text-4xl font-bold text-gray-200 leading-tight">{result.roi_low}x – {result.roi_high}x</div>
                      <div className="text-xs text-gray-500 mt-2">{lang === 'zh' ? '预估投资回报' : 'estimated return'}</div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.06]">
                    <p className="text-gray-300 text-sm leading-relaxed">{customerExplanation(result)}</p>
                  </div>
                </div>

                {/* Trust Section */}
                <div className="bg-gray-50 p-8 md:p-10 grid md:grid-cols-2 gap-6">
                  {/* How we calculated */}
                  <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <h3 className="font-semibold text-gray-900">{r.howWeCalculated as string}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{r.basedOn as string}:</p>
                    <div className="space-y-3">
                      {[
                        { label: r.yourAov as string, value: `$${result.aov}` },
                        { label: r.yourIndustry as string, value: industryDisplayName() },
                        { label: r.serviceTier as string, value: r.serviceTierValue as string },
                        { label: r.geoInvestment as string, value: `~${fmtUSD(result.geo_investment)}` },
                        { label: r.period as string, value: `6 ${r.months as string}` },
                      ].map((row, i) => (
                        <div key={i} className={`flex items-center justify-between py-2 ${i < 4 ? 'border-b border-gray-100' : ''}`}>
                          <span className="text-sm text-gray-500 flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {row.label}
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 italic">{r.dataNote as string}</p>
                    </div>
                  </div>

                  {/* What's included + Benchmark */}
                  <div className="space-y-5">
                    {/* What's included in GEO Pro */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <h3 className="font-semibold text-gray-900">{r.whatsIncluded as string}</h3>
                      </div>
                      <ul className="space-y-2">
                        {serviceIncludes.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Industry Benchmark */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h3 className="font-semibold text-gray-900">{r.benchmarkTitle as string}</h3>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center border border-gray-200">
                        <div className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                          {lang === 'zh' ? `${industryDisplayName()} 行业平均 ROI` : `${industryDisplayName()} Industry Avg. ROI`}
                        </div>
                        <div className="text-2xl font-bold text-gray-700">
                          {result.benchmark_roi_low}x – {result.benchmark_roi_high}x
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 rounded-full">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            <span className="text-xs font-semibold text-green-700">
                              {lang === 'zh' ? `Alignment：${result.roi_low}x – ${result.roi_high}x` : `With Alignment: ${result.roi_low}x – ${result.roi_high}x`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="bg-white p-8 border-t border-gray-100">
                  <div className="text-center">
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
                      <Link href="/contact/?subject=managed-service&from=roi" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl">
                        {r.ctaStart as string}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </Link>
                      <button onClick={handleReset} className="inline-flex items-center gap-2 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        {r.ctaAdjust as string}
                      </button>
                    </div>
                    <Link href="/pricing/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {r.ctaPlatform as string}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">{r.disclaimer as string}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center"><span className="text-white font-bold text-lg">A</span></div>
              <span className="text-xl font-bold text-gray-900">Alignment AI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-600">
              <Link href="/features/" className="hover:text-gray-900">Features</Link>
              <Link href="/pricing/" className="hover:text-gray-900">Pricing</Link>
              <Link href="/roi-simulator" className="hover:text-gray-900 text-red-600 font-medium">ROI Calculator</Link>
              <Link href="/login/" className="hover:text-gray-900">Dashboard</Link>
            </div>
            <p className="mt-6 md:mt-0 text-sm text-gray-400">&copy; 2026 Alignment AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function ROISimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" /></div>}>
      <ROISimulatorInner />
    </Suspense>
  )
}
