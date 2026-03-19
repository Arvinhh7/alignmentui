'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from './LanguageSwitch'
import { ShieldCheck, Zap, PenTool, Share2, BarChart3, LineChart, LayoutDashboard, Bot, TrendingUp, MessageSquare, Database, type LucideIcon } from 'lucide-react'

// Map route → icon + color for module identification
const routeIconMap: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  '/dashboard/overview':      { icon: LayoutDashboard, bg: 'bg-gray-100',    color: 'text-gray-700' },
  '/dashboard/agents':        { icon: Bot,             bg: 'bg-indigo-50',   color: 'text-indigo-600' },
  '/dashboard/geo-audit':     { icon: ShieldCheck,     bg: 'bg-red-50',      color: 'text-red-600' },
  '/dashboard/geo-optimization': { icon: Zap,          bg: 'bg-orange-50',   color: 'text-orange-600' },
  '/dashboard/geo-content':   { icon: PenTool,         bg: 'bg-purple-50',   color: 'text-purple-600' },
  '/dashboard/geo-distribution': { icon: Share2,       bg: 'bg-blue-50',     color: 'text-blue-600' },
  '/dashboard/geo-monitor':   { icon: TrendingUp,      bg: 'bg-emerald-50',  color: 'text-emerald-600' },
  '/dashboard/ga4-attribution': { icon: LineChart,     bg: 'bg-indigo-50',   color: 'text-indigo-600' },
  '/dashboard/prompts':       { icon: MessageSquare,   bg: 'bg-blue-50',     color: 'text-blue-600' },
  '/dashboard/brand-hub':     { icon: Database,        bg: 'bg-orange-50',   color: 'text-orange-600' },
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

  // Resolve module icon
  const routeInfo = routeIconMap[pathname] || null
  const ModuleIcon = routeInfo?.icon

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left - Title */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${routeInfo ? routeInfo.bg : 'bg-gray-100'}`}>
          {ModuleIcon ? (
            <ModuleIcon className={`w-5 h-5 ${routeInfo!.color}`} strokeWidth={2} />
          ) : (
            <span className="text-xl font-bold text-gray-900">W</span>
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Right - Status */}
      <div className="flex items-center gap-4">
        {/* Language Switch */}
        <LanguageSwitch />

        {/* Updated indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Updated 38s ago
        </div>

        {/* Signal Engine Status */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">{t.dashboard.signalStatus}:</span>
          <span className={`text-sm font-semibold ${isActive ? 'text-green-600' : 'text-red-600'}`}>
            {isActive ? t.dashboard.active : 'Inactive'}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Last Update */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-500">{t.dashboard.lastUpdate}:</span>
          <span className="text-sm font-medium text-gray-700">{lastUpdate}</span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  )
}
