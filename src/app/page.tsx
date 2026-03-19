'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull, LogoIcon } from '@/components/Logo'
import { useEffect, useState } from 'react'

// Platform logos — local files in /public/logos/
const ChatGPTIcon  = () => <img src="/logos/openai.png"     alt="ChatGPT"   width={24} height={24} className="w-6 h-6 rounded object-contain" />
const PerplexityIcon = () => <img src="/logos/perplexity.png" alt="Perplexity" width={24} height={24} className="w-6 h-6 rounded object-contain" />
const GeminiIcon   = () => <img src="/logos/gemini.png"     alt="Gemini"    width={24} height={24} className="w-6 h-6 rounded object-contain" />
const GrokIcon     = () => <img src="/logos/grok.png"       alt="Grok"      width={24} height={24} className="w-6 h-6 rounded object-contain" />
const GoogleAIIcon = () => <img src="/logos/google.png"     alt="Google AI" width={24} height={24} className="w-6 h-6 rounded object-contain" />

// Animated counter component
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = value / steps
    let current = 0
    
    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value])
  
  return <span className="font-mono">{count.toLocaleString()}{suffix}</span>
}

// Feature card component
const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  value,
  delay = 0 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  value?: string
  delay?: number
}) => (
  <div 
    className="group relative bg-white rounded-2xl p-6 card-interactive opacity-0 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      {value && (
        <span className="text-lg font-bold font-mono text-red-500">{value}</span>
      )}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </div>
)

// Platform badge component
const PlatformBadge = ({ 
  icon, 
  name, 
  users, 
  delay = 0 
}: { 
  icon: React.ReactNode
  name: string
  users: string
  delay?: number
}) => (
  <div 
    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-soft hover:shadow-medium hover:border-red-100 transition-all duration-300 opacity-0 animate-fade-in-up"
    style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
  >
    <div className="text-gray-700">{icon}</div>
    <div>
      <div className="font-medium text-gray-900 text-sm">{name}</div>
      <div className="text-xs text-gray-500">{users}</div>
    </div>
  </div>
)

export default function LandingPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group hover:opacity-90 transition-opacity">
              <LogoFull width={140} height={45} />
            </Link>
            
            <div className="hidden lg:flex items-center gap-1">
              {[
                { label: t.nav.system, href: '/system/' },
                { label: t.nav.technology, href: '/technology/' },
                { label: t.nav.pricing, href: '/pricing/' },
                { label: t.nav.docs, href: '/docs/' },
                { label: t.nav.insights, href: '/insights/' },
                { label: t.nav.contact, href: '/contact/' },
              ].map((item, i) => (
                <Link 
                  key={i}
                  href={item.href} 
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-1"
                >
                  {item.label}
                </Link>
              ))}
              {/* Solutions Dropdown */}
              <div className="relative group">
                <button className="px-3 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  {t.nav.solutions}
                  <svg className="w-3.5 h-3.5 opacity-50 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {[
                    { label: 'GEO Audit', href: '/dashboard/geo-audit', icon: '🔍' },
                    { label: 'GEO Optimization', href: '/dashboard/geo-optimization', icon: '⚡' },
                    { label: 'GEO Content', href: '/dashboard/geo-content', icon: '📝' },
                    { label: 'GEO Distribution', href: '/dashboard/geo-distribution', icon: '📡' },
                    { label: 'GEO Monitor', href: '/dashboard/geo-monitor', icon: '📊' },
                  ].map((item, i) => (
                    <Link key={i} href={item.href} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                  <div className="border-t border-gray-100 my-1" />
                  <Link href="/roi-simulator" className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <span>📈</span>
                    <span className="font-semibold">{(t as unknown as Record<string, string>).nav_roi} <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">Free</span></span>
                  </Link>
                </div>
              </div>
              {/* ROI Calculator highlight in nav */}
              <Link href="/roi-simulator" className="ml-1 px-3 py-1.5 text-red-600 hover:text-red-700 text-sm font-semibold transition-colors rounded-lg bg-red-50 hover:bg-red-100 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                {(t as unknown as Record<string, string>).nav_roi}
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitch />
              <Link
                href="/login/"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-soft hover:shadow-medium btn-shine"
              >
                {t.nav.getStarted}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
          <div className="text-center">
            {/* Badge */}
            <div 
              className={`inline-flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur border border-gray-200/50 rounded-full shadow-soft mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-sm text-gray-700 font-medium">{t.hero.badge}</span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <div className="text-green-600 opacity-80 hover:opacity-100 transition-opacity"><ChatGPTIcon /></div>
                <div className="text-gray-800 opacity-80 hover:opacity-100 transition-opacity"><PerplexityIcon /></div>
                <div className="opacity-80 hover:opacity-100 transition-opacity"><GeminiIcon /></div>
                <div className="opacity-80 hover:opacity-100 transition-opacity"><GrokIcon /></div>
                <div className="opacity-80 hover:opacity-100 transition-opacity"><GoogleAIIcon /></div>
              </div>
            </div>

            {/* Headline */}
            <h1 
              className={`text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {t.hero.headline}
              <br />
              <span className="gradient-text">{t.hero.headlineHighlight}</span>
            </h1>

            <p 
              className={`text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {t.hero.subheadline}
            </p>

            {/* CTA Buttons */}
            <div 
              className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Link
                href="/login/"
                className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-large hover:shadow-glow btn-shine"
              >
                {t.nav.getStarted}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-all shadow-soft hover:shadow-medium"
              >
                {t.nav.seeHowItWorks}
              </Link>
            </div>

            {/* Stats Cards - Stripe Style */}
            <div 
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto transition-all duration-700 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              {[
                { 
                  icon: (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ),
                  value: 1247,
                  label: t.hero.stats.mentions,
                  change: t.hero.stats.mentionsChange
                },
                { 
                  icon: (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ),
                  value: 87.3,
                  label: t.hero.stats.score,
                  change: t.hero.stats.scoreChange,
                  isDecimal: true
                },
                { 
                  icon: (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  value: 342,
                  label: t.hero.stats.citations,
                  change: t.hero.stats.citationsChange
                },
              ].map((stat, i) => (
                <div 
                  key={i}
                  className="group bg-white/80 backdrop-blur rounded-2xl border border-gray-200/50 p-5 hover:shadow-medium hover:border-red-200/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {stat.icon}
                    </div>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">{stat.change}</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {mounted ? (
                      stat.isDecimal ? (
                        <span className="font-mono">{stat.value}</span>
                      ) : (
                        <AnimatedCounter value={stat.value as number} />
                      )
                    ) : stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-gray-50/50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm text-gray-500 mb-8 uppercase tracking-wider font-medium">
            {t.platforms.badge}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <PlatformBadge icon={<ChatGPTIcon />} name="ChatGPT" users="200M+ users" delay={0} />
            <PlatformBadge icon={<PerplexityIcon />} name="Perplexity" users="100M+ users" delay={100} />
            <PlatformBadge icon={<GeminiIcon />} name="Gemini" users="1B+ users" delay={200} />
            <PlatformBadge icon={<GrokIcon />} name="Grok" users="50M+ users" delay={300} />
            <PlatformBadge icon={<GoogleAIIcon />} name="Google AI" users="2B+ users" delay={400} />
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              {t.features.badge}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {t.features.title}
              <br />
              <span className="gradient-text">{t.features.titleHighlight}</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Large Card - Brand Tracking */}
            <div className="lg:col-span-2 lg:row-span-2 group relative bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-sm font-medium text-white/70 mb-2">{t.features.brandTracking.value}</div>
                <h3 className="text-2xl font-bold mb-3">{t.features.brandTracking.title}</h3>
                <p className="text-white/80 leading-relaxed">{t.features.brandTracking.desc}</p>
                
                {/* Mini visualization */}
                <div className="mt-8 pt-6 border-t border-white/20">
                  <div className="flex items-end gap-2 h-20">
                    {[40, 65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-white/30 rounded-t-sm hover:bg-white/50 transition-colors"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Regular Cards */}
            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
              title={t.features.promptManagement.title}
              description={t.features.promptManagement.desc}
              value={t.features.promptManagement.value}
              delay={100}
            />

            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
              title={t.features.citationAnalysis.title}
              description={t.features.citationAnalysis.desc}
              value={t.features.citationAnalysis.value}
              delay={200}
            />

            {/* Highlighted Card */}
            <div className="group relative bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-red-100 overflow-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold font-mono text-red-600">{t.features.aigvrMetrics.value}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.features.aigvrMetrics.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t.features.aigvrMetrics.desc}</p>
            </div>

            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              title={t.features.competitorAnalysis.title}
              description={t.features.competitorAnalysis.desc}
              value={t.features.competitorAnalysis.value}
              delay={400}
            />
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
              title={t.features.shareOfModel.title}
              description={t.features.shareOfModel.desc}
              value={t.features.shareOfModel.value}
              delay={500}
            />

            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
              title={t.features.sentimentAnalysis.title}
              description={t.features.sentimentAnalysis.desc}
              value={t.features.sentimentAnalysis.value}
              delay={600}
            />

            <FeatureCard
              icon={<svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              title={t.features.realTimeMonitoring.title}
              description={t.features.realTimeMonitoring.desc}
              value={t.features.realTimeMonitoring.value}
              delay={700}
            />
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/[0.06] rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="opacity-0 animate-fade-in-up bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-8 shadow-soft" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
              <div className="text-5xl md:text-6xl font-bold mb-2 font-mono text-gray-900">{t.platforms.stats.interactionsValue}</div>
              <div className="text-gray-500">{t.platforms.stats.interactions}</div>
            </div>
            <div className="opacity-0 animate-fade-in-up bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-8 shadow-soft" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
              <div className="text-5xl md:text-6xl font-bold mb-2 font-mono gradient-text">{t.platforms.stats.growthValue}</div>
              <div className="text-gray-500">{t.platforms.stats.growth}</div>
            </div>
            <div className="opacity-0 animate-fade-in-up bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-8 shadow-soft" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="text-5xl md:text-6xl font-bold mb-2 font-mono text-gray-900">{t.platforms.stats.zeroClickValue}</div>
              <div className="text-gray-500">{t.platforms.stats.zeroClick}</div>
            </div>
          </div>
        </div>
      </section>

      {/* GEO Platform — 5 Modules Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-stripe-gradient" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Complete GEO Agent
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              5 Modules. <span className="gradient-text">One Platform.</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From diagnosis to monitoring — the complete GEO lifecycle in one intelligent agent.
            </p>
          </div>

          {/* 5 Module Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
            {[
              {
                step: '01',
                title: 'GEO Audit',
                desc: 'Diagnose AI readiness across 5 dimensions',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                color: 'from-red-500 to-red-600',
                href: '/dashboard/geo-audit',
                active: true,
              },
              {
                step: '02',
                title: 'GEO Optimize',
                desc: 'One-click optimization per dimension',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                color: 'from-orange-500 to-orange-600',
                href: '/dashboard/geo-optimization',
                active: true,
              },
              {
                step: '03',
                title: 'GEO Content',
                desc: 'Generate AI-citable content',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                color: 'from-purple-500 to-purple-600',
                href: '/dashboard/geo-content',
                active: true,
              },
              {
                step: '04',
                title: 'GEO Distribute',
                desc: 'Distribute to AI-cited channels',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                ),
                color: 'from-blue-500 to-blue-600',
                href: '/dashboard/geo-distribution',
                active: true,
              },
              {
                step: '05',
                title: 'GEO Monitor',
                desc: 'Track brand AI visibility',
                icon: (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                color: 'from-green-500 to-green-600',
                href: '/dashboard/geo-monitor',
                active: true,
              },
            ].map((module, i) => (
              <Link
                key={i}
                href={module.href}
                className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300 text-center"
              >
                <div className="absolute top-3 right-3 text-[10px] font-bold text-gray-300 font-mono">{module.step}</div>
                <div className={`w-14 h-14 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  {module.icon}
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{module.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{module.desc}</p>
                <div className="mt-4 flex items-center justify-center gap-1 text-xs text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Enter <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            ))}
          </div>

          {/* Workflow Arrow */}
          <div className="hidden md:flex items-center justify-center gap-2 mb-16 -mt-12">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center">
                <div className="w-24 h-0.5 bg-gradient-to-r from-gray-200 to-gray-300" />
                <svg className="w-4 h-4 text-gray-300 -ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                </svg>
              </div>
            ))}
          </div>

          {/* GEO Audit Demo Card */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-full text-red-600 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 12V7m0 5h5" />
              </svg>
              {t.audit.badge}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              {t.audit.title} <span className="gradient-text">{t.audit.titleHighlight}</span>
            </h3>
            <p className="text-gray-600 max-w-xl mx-auto mb-8">
              {t.audit.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 5-Dimension Audit Scores Card */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-soft">
              <div className="space-y-4">
                {[
                  { score: 85, label: t.audit.aiAccessibility, desc: t.audit.aiAccessibilityDesc, status: t.audit.good, dim: 'D1' },
                  { score: 72, label: t.audit.semanticStructure, desc: t.audit.semanticStructureDesc, status: t.audit.needsWork, dim: 'D2' },
                  { score: 91, label: t.audit.contentCitability, desc: t.audit.contentCitabilityDesc, status: t.audit.excellent, dim: 'D3' },
                  { score: 68, label: t.audit.riskBoundary, desc: t.audit.riskBoundaryDesc, status: t.audit.needsWork, dim: 'D4' },
                  { score: 76, label: t.audit.reusability, desc: t.audit.reusabilityDesc, status: t.audit.good, dim: 'D5' },
                ].map((item, i) => {
                  const barColor = item.score >= 85 ? 'bg-green-500' : item.score >= 65 ? 'bg-blue-500' : item.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                  const textColor = item.score >= 85 ? 'text-green-600' : item.score >= 65 ? 'text-blue-600' : item.score >= 45 ? 'text-yellow-600' : 'text-red-600'
                  return (
                    <div key={i} className="group p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-gray-400 w-5">{item.dim}</span>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{item.label}</h4>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            item.score >= 85 ? 'bg-green-100 text-green-700' :
                            item.score >= 65 ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>{item.status}</span>
                          <span className={`text-xl font-bold font-mono ${textColor}`}>{item.score}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full animate-progress ${barColor}`} style={{ width: `${item.score}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span>Weight: D1 15% · D2 20% · D3 30% · D4 20% · D5 15%</span>
                <span>{t.audit.keyDimensions}</span>
              </div>
            </div>

            {/* Overall Score Ring */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-soft flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={`${79 * 5.52} 552`}
                    strokeLinecap="round"
                    className="animate-progress"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold font-mono gradient-text">79</span>
                  <span className="text-gray-400 text-sm">/ 100</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{t.audit.overallScore}</h3>
              <p className="text-gray-500 mb-6">{t.audit.grade}</p>

              <div className="w-full space-y-3 mb-6">
                {[
                  { label: t.audit.aiAccessibility, value: '85/100', dim: 'D1' },
                  { label: t.audit.semanticStructure, value: '72/100', dim: 'D2' },
                  { label: t.audit.contentCitability, value: '91/100', dim: 'D3' },
                  { label: t.audit.riskBoundary, value: '68/100', dim: 'D4' },
                  { label: t.audit.reusability, value: '76/100', dim: 'D5' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{item.dim}</span>
                      {item.label}
                    </span>
                    <span className="font-medium font-mono">{item.value}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/dashboard/geo-audit"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3.5 rounded-xl transition-all text-center shadow-soft hover:shadow-glow btn-shine"
              >
                {t.audit.runFreeAudit}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 02: GEO Optimize ═══ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Visual Mockup */}
            <div className="order-2 lg:order-1">
              <div className="bg-gray-950 rounded-2xl p-6 shadow-2xl border border-gray-800">
                {/* Terminal header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-2 text-xs text-gray-500 font-mono">optimization-output.tsx</span>
                </div>
                {/* Code block mockup */}
                <div className="space-y-3 font-mono text-[13px] leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">1</span>
                    <span><span className="text-purple-400">{"// "}Structural Fix</span> — <span className="text-green-400">Permanent</span></span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">2</span>
                    <span className="text-blue-400">{'<script type="application/ld+json">'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">3</span>
                    <span className="text-yellow-300 pl-4">{'"@type": "FAQPage",'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">4</span>
                    <span className="text-yellow-300 pl-4">{'"mainEntity": [...]'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">5</span>
                    <span className="text-blue-400">{'</script>'}</span>
                  </div>
                  <div className="h-px bg-gray-800 my-2" />
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">7</span>
                    <span><span className="text-purple-400">{"// "}Content Fix</span> — <span className="text-yellow-400">Ongoing</span></span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">8</span>
                    <span className="text-green-300">{'Add TL;DR summary to top of page'}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-gray-600 select-none w-6 text-right">9</span>
                    <span className="text-green-300">{'Include 3+ data citations per section'}</span>
                  </div>
                </div>
                {/* Score improvement */}
                <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Before</span>
                    <span className="text-lg font-bold font-mono text-red-400">62</span>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    <span className="text-xs text-gray-500">After</span>
                    <span className="text-lg font-bold font-mono text-green-400">91</span>
                  </div>
                  <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">+47%</span>
                </div>
              </div>
            </div>

            {/* Right — Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-orange-600 text-xs font-semibold mb-5 tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Optimization Engine
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                GEO Optimize: <span className="text-orange-500">Code-Level Fixes</span>
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Other tools give recommendations. We give you <strong>production-ready code</strong>. One-click optimization per dimension with copy-paste-ready snippets.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Stability classification: Structural (permanent) vs Content (ongoing)',
                  'Ready-to-copy code for Schema markup, meta tags, and content structure',
                  'Before/after score comparison with predicted improvement',
                  'Quick wins prioritized by impact × effort',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-600">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/geo-optimization" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-soft hover:shadow-lg group">
                Try GEO Optimize
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 03: GEO Content ═══ */}
      <section className="py-24 bg-gray-50/50 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-purple-600 text-xs font-semibold mb-5 tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                Content Studio
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                GEO Content: <span className="text-purple-500">AI-Citable Assets</span>
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Generate content specifically formatted for AI citation. Not just SEO content — content that AI platforms <strong>want to quote</strong>.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'FAQ pages with Schema markup for direct AI extraction',
                  'Comparison guides structured for "vs" queries',
                  'Definition articles optimized for knowledge panels',
                  'How-to guides with step-by-step AI-readable format',
                  'Glossary entries for entity recognition',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-600">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/geo-content" className="inline-flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-soft hover:shadow-lg group">
                Try GEO Content
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Right — Visual Mockup */}
            <div>
              <div className="space-y-4">
                {[
                  { type: 'FAQ', icon: '❓', label: 'FAQ Page', desc: 'Structured Q&A with Schema markup', score: 94, color: 'border-purple-200 bg-purple-50/50' },
                  { type: 'Comparison', icon: '⚖️', label: 'Comparison Guide', desc: '"Product A vs B" with data tables', score: 88, color: 'border-blue-200 bg-blue-50/50' },
                  { type: 'Definition', icon: '📖', label: 'Definition Article', desc: '"What is X?" with entity markup', score: 91, color: 'border-green-200 bg-green-50/50' },
                  { type: 'HowTo', icon: '🔧', label: 'How-To Guide', desc: 'Step-by-step with HowTo schema', score: 86, color: 'border-orange-200 bg-orange-50/50' },
                  { type: 'Review', icon: '⭐', label: 'Review / Testimonial', desc: 'Trust signals with Review schema', score: 82, color: 'border-yellow-200 bg-yellow-50/50' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${item.color} hover:shadow-md transition-all duration-300`}>
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.desc}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold font-mono text-gray-900">{item.score}</div>
                      <div className="text-[10px] text-gray-400 uppercase">AI Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 04: GEO Distribute ═══ */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Visual Mockup */}
            <div className="order-2 lg:order-1">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
                {/* Channel cards */}
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-gray-900 text-sm">Top Channels by AI Citation Weight</h4>
                  <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">ChatGPT Optimized</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Reddit', weight: 95, category: 'UGC', icon: '🔴', bar: 'bg-red-500' },
                    { name: 'Wikipedia', weight: 98, category: 'Reference', icon: '📖', bar: 'bg-gray-800' },
                    { name: 'Stack Overflow', weight: 88, category: 'UGC', icon: '📙', bar: 'bg-orange-500' },
                    { name: 'G2 Reviews', weight: 85, category: 'UGC', icon: '⭐', bar: 'bg-green-500' },
                    { name: 'Medium', weight: 75, category: 'Editorial', icon: '📝', bar: 'bg-purple-500' },
                  ].map((ch, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-lg">{ch.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{ch.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ch.category}</span>
                            <span className="text-sm font-bold font-mono text-gray-900">{ch.weight}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ch.bar}`} style={{ width: `${ch.weight}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Reddit highlight */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">🔴</span>
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Reddit Deep Strategy</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-red-50 rounded-lg p-2">
                      <div className="text-lg font-bold font-mono text-red-600">12</div>
                      <div className="text-[9px] text-gray-500">Subreddits</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <div className="text-lg font-bold font-mono text-orange-600">8</div>
                      <div className="text-[9px] text-gray-500">Templates</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-lg font-bold font-mono text-blue-600">4w</div>
                      <div className="text-[9px] text-gray-500">Calendar</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-600 text-xs font-semibold mb-5 tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                AI Citation
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                GEO Distribute: <span className="text-blue-500">Citation-Driven Channels</span>
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Not just where humans go — where <strong>AI goes to find sources</strong>. Channel recommendations ranked by ChatGPT citation weight, not traffic volume.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'AI citation weight scoring for 20+ channels',
                  'Industry × Channel priority matrix (tech, SaaS, fintech, etc.)',
                  'Reddit deep strategy with subreddit recommendations & post templates',
                  'Content queue with status pipeline: Draft → Published → AI Verified',
                  'GEO Monitor integration for citation gap detection',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-600">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/geo-distribution" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-soft hover:shadow-lg group">
                Try GEO Distribute
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Module 05: GEO Monitor ═══ */}
      <section className="py-24 bg-gray-50/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-3xl -translate-y-1/3 -translate-x-1/4" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-green-600 text-xs font-semibold mb-5 tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                AI Visibility
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                GEO Monitor: <span className="text-green-500">AI Visibility Intelligence</span>
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Track how AI platforms see your brand in real time. Not simulated data — <strong>real URL citations</strong> from AI web search, classified across 8 source categories.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Real-time brand visibility tracking across AI responses',
                  '8 source categories: UGC, Editorial, Corporate, Reference, etc.',
                  'Granular mention classification (Primary, Alternative, Feature...)',
                  'Multi-brand competitive intelligence & Share of Voice',
                  'Gap analysis: find where competitors appear and you don\'t',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-gray-600">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/geo-monitor" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-soft hover:shadow-lg group">
                Try GEO Monitor
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Right — Visual Mockup */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                {/* Dashboard header */}
                <div className="bg-gray-900 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold text-sm">Brand Visibility Dashboard</div>
                      <div className="text-gray-400 text-xs">Last scan: 38 seconds ago</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-xs text-green-400 font-medium">Live</span>
                    </div>
                  </div>
                </div>
                {/* Metrics grid */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: 'Mentions', value: '24', change: '+12%', color: 'text-blue-600' },
                      { label: 'Sentiment', value: '8.2', change: '+0.5', color: 'text-green-600' },
                      { label: 'Sources', value: '47', change: '+8', color: 'text-purple-600' },
                    ].map((m, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 text-center">
                        <div className={`text-2xl font-bold font-mono ${m.color}`}>{m.value}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{m.label}</div>
                        <div className="text-[10px] font-medium text-green-500 mt-1">{m.change}</div>
                      </div>
                    ))}
                  </div>
                  {/* Source breakdown */}
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Source Categories</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { cat: 'UGC', count: 18, color: 'bg-blue-500' },
                      { cat: 'Editorial', count: 12, color: 'bg-purple-500' },
                      { cat: 'Corporate', count: 8, color: 'bg-orange-500' },
                      { cat: 'Reference', count: 5, color: 'bg-green-500' },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <div className={`h-1.5 rounded-full ${s.color} mb-2`} style={{ width: '100%', opacity: 0.3 + (s.count / 18) * 0.7 }} />
                        <div className="text-sm font-bold font-mono text-gray-900">{s.count}</div>
                        <div className="text-[9px] text-gray-400">{s.cat}</div>
                      </div>
                    ))}
                  </div>
                  {/* Competitor comparison */}
                  <div className="mt-5 pt-4 border-t border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Share of Voice</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500 rounded-l-full" style={{ width: '42%' }} />
                        <div className="h-full bg-blue-400" style={{ width: '28%' }} />
                        <div className="h-full bg-orange-400" style={{ width: '18%' }} />
                        <div className="h-full bg-gray-300 rounded-r-full" style={{ width: '12%' }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Your Brand 42%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Competitor A 28%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> Competitor B 18%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-50 relative">
        <div className="absolute inset-0 bg-dots opacity-30" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 text-sm font-medium mb-6 shadow-soft">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t.cta.badge}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t.cta.title} <span className="gradient-text">{t.cta.titleHighlight}</span>
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login/"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-large hover:shadow-glow btn-shine"
            >
              {t.nav.startFreeTrial}
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="#"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-4 rounded-xl transition-all shadow-soft hover:shadow-medium"
            >
              {t.nav.bookDemo}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <div className="mb-4">
                <LogoFull width={160} height={100} />
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">{t.footer.tagline}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{t.footer.resources}</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/docs/" className="hover:text-gray-900 transition-colors">{t.footer.docs}</Link></li>
                <li><Link href="/insights/" className="hover:text-gray-900 transition-colors">{t.footer.blog}</Link></li>
                <li><Link href="/technology/" className="hover:text-gray-900 transition-colors">Technology</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{t.footer.ecosystem}</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/system/" className="hover:text-gray-900 transition-colors">System</Link></li>
                <li><Link href="/pricing/" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">{t.footer.contact}</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/contact/" className="hover:text-gray-900 transition-colors">{t.footer.contact}</Link></li>
                <li><a href="mailto:contact@alignmenttech.ai" className="hover:text-gray-900 transition-colors">{t.footer.sendEmail}</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-500 text-sm">
            {t.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  )
}
