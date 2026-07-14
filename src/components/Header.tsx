'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { normalizePath } from '@/lib/path'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from './LanguageSwitch'
import { ShieldCheck, Zap, PenTool, Share2, BarChart3, LineChart, LayoutDashboard, Bot, TrendingUp, MessageSquare, Database, type LucideIcon } from 'lucide-react'

// Map route → icon + DESIGN.md token colors
const routeIconMap: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  '/dashboard/overview':          { icon: LayoutDashboard, bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/agents':            { icon: Bot,             bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/geo-audit':         { icon: ShieldCheck,     bg: 'bg-red-soft-bg',   color: 'text-red-soft' },
  '/dashboard/geo-optimization':  { icon: Zap,             bg: 'bg-caution-bg',    color: 'text-caution' },
  '/dashboard/geo-content':       { icon: PenTool,         bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/geo-distribution':  { icon: Share2,          bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/geo-monitor':       { icon: TrendingUp,      bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/ga4-attribution':   { icon: LineChart,       bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/prompts':           { icon: MessageSquare,   bg: 'bg-sage-bg',       color: 'text-sage' },
  '/dashboard/brand-hub':         { icon: Database,        bg: 'bg-caution-bg',    color: 'text-caution' },
}

interface HeaderProps {
  title: string
  subtitle: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [lastUpdate, setLastUpdate] = useState('2m ago')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor(Math.random() * 60)
      setLastUpdate(`${seconds}s ago`)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const routeInfo = routeIconMap[normalizePath(pathname)] || null
  const ModuleIcon = routeInfo?.icon

  return (
    <header className="h-16 bg-[#080A0E]/92 border-b border-divider-light flex items-center justify-between px-6 backdrop-blur">
      {/* Left — Title */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl border border-[rgba(243,107,43,0.18)] flex items-center justify-center ${routeInfo ? routeInfo.bg : 'bg-sage-bg'}`}>
          {ModuleIcon ? (
            <ModuleIcon className={`w-5 h-5 ${routeInfo!.color}`} strokeWidth={2} />
          ) : (
            <span className="text-xl font-semibold text-sage">W</span>
          )}
        </div>
        <div>
          <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
          <p className="text-[12px] text-ink-3">{subtitle}</p>
        </div>
      </div>

      {/* Right — Status */}
      <div className="flex items-center gap-3">
        <LanguageSwitch />

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <span className="w-1.5 h-1.5 bg-sage rounded-full shadow-[0_0_14px_rgba(243,107,43,0.55)] animate-pulse" />
          Updated {lastUpdate}
        </div>

        {/* Signal Engine Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/80 rounded-lg border border-divider-light">
          <span className="text-[13px] font-medium text-ink-2">{t.dashboard.signalStatus}:</span>
          <span className={`text-[13px] font-semibold ${isActive ? 'text-sage' : 'text-red-soft'}`}>
            {isActive ? t.dashboard.active : 'Inactive'}
          </span>
          <svg className="w-3.5 h-3.5 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Last Update */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/80 rounded-lg border border-divider-light">
          <span className="text-[13px] text-ink-3">{t.dashboard.lastUpdate}:</span>
          <span className="text-[13px] font-medium text-ink">{lastUpdate}</span>
          <svg className="w-3.5 h-3.5 text-ink-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  )
}
