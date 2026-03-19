'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth, type UserRole } from '@/hooks/useAuth'
import { api, CreditBalance } from '@/lib/api'
import {
  ShieldCheck, Zap, PenTool, Share2, BarChart3, Activity,
  LogOut, Settings, Wrench, PanelLeftClose, PanelLeft,
  Sparkles, ExternalLink, HelpCircle, Home, ChevronRight, CreditCard,
  LineChart, LayoutDashboard, Bot, Search, MessageSquare,
  BookOpen, TrendingUp, Database, X,
} from 'lucide-react'

const SIDEBAR_KEY = 'sidebar_expanded'

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: { label: 'ADMIN', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  demo:  { label: 'DEMO',  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  user:  { label: 'USER',  color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

const PLAN_DISPLAY: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
  trial: 'Trial',
}

// Getting Started steps to track onboarding progress
const GETTING_STARTED_KEY = 'alignment_onboarding_steps'
function getCompletedSteps(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(GETTING_STARTED_KEY)
    return stored ? JSON.parse(stored).length : 0
  } catch { return 0 }
}

interface NavItem {
  href: string
  icon: React.ElementType
  labelKey: string
  matchPrefix?: boolean
  badge?: string
  isNew?: boolean
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

export default function Sidebar() {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, signOut } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [credits, setCredits] = useState<CreditBalance | null>(null)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [promptCount, setPromptCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const TOTAL_STEPS = 5
  const userEmail = user?.email ?? ''
  const displayName = user?.user_metadata?.company_name
    || user?.user_metadata?.full_name
    || userEmail.split('@')[0]
    || 'User'
  const initial = displayName[0]?.toUpperCase() ?? 'U'
  const roleCfg = ROLE_CONFIG[role ?? 'user']

  // ── Persist sidebar state ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY)
      if (saved === 'true') setExpanded(true)
    } catch {}
    setCompletedSteps(getCompletedSteps())
    // Read prompt count from localStorage (written by prompts page on load)
    try {
      const cnt = localStorage.getItem('alignment_prompts_count')
      if (cnt) setPromptCount(parseInt(cnt, 10) || 0)
    } catch {}
  }, [])

  // ── Close menus on outside click ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Fetch credits ──────────────────────────────────────────────────────
  const refreshCredits = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await api.getCredits(user.id)
      if (res.data) setCredits(res.data)
    } catch {}
  }, [user?.id])

  useEffect(() => { refreshCredits() }, [refreshCredits])

  useEffect(() => {
    const handler = () => refreshCredits()
    window.addEventListener('creditsUsed', handler)
    return () => window.removeEventListener('creditsUsed', handler)
  }, [refreshCredits])

  // ── Focus search input when opened ────────────────────────────────────
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const toggleExpanded = () => {
    setExpanded(prev => {
      const next = !prev
      try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch {}
      return next
    })
  }

  const handleLogout = async () => {
    setShowUserMenu(false)
    const ok = await signOut()
    if (ok) router.push('/login')
  }

  // ── Navigation groups ──────────────────────────────────────────────────
  const navGroups: NavGroup[] = [
    {
      labelKey: 'navGroupAnalytics',
      items: [
        { href: '/dashboard/overview',       icon: LayoutDashboard, labelKey: 'overviewNav' },
        { href: '/dashboard/geo-monitor',    icon: TrendingUp,      labelKey: 'answerEngineNav' },
      ],
    },
    {
      labelKey: 'navGroupAction',
      items: [
        { href: '/dashboard/agents',         icon: Bot,             labelKey: 'agentsNav', isNew: true },
        { href: '/dashboard/geo-audit',      icon: ShieldCheck,     labelKey: 'geoAuditNav' },
        { href: '/dashboard/geo-content',    icon: PenTool,         labelKey: 'geoContentNav' },
      ],
    },
    {
      labelKey: 'navGroupContext',
      items: [
        { href: '/dashboard/prompts',   icon: MessageSquare, labelKey: 'promptsNav', badge: promptCount > 0 ? String(promptCount) : undefined },
        { href: '/dashboard/brand-hub', icon: Database,      labelKey: 'brandNav' },
      ],
    },
  ]

  // Admin-only items appended after groups
  const adminItems: NavItem[] = role === 'admin' ? [
    { href: '/dashboard/geo-optimization', icon: Zap,      labelKey: 'geoOptimizationNav' },
    { href: '/dashboard/geo-distribution', icon: Share2,   labelKey: 'geoDistributionNav' },
    { href: '/dashboard/ga4-attribution',  icon: LineChart, labelKey: 'GA4 Attribution' as never },
    { href: '/dashboard/ops',              icon: Activity, labelKey: 'Managed Service' as never, matchPrefix: true },
    { href: '/dashboard/admin',            icon: Wrench,   labelKey: 'Admin Panel' as never },
  ] : []

  // ── Credits display values ─────────────────────────────────────────────
  const creditsRemaining = credits?.credits_remaining ?? 0
  const creditsTotal     = credits?.credits_total     ?? 0
  const creditPct        = creditsTotal > 0 ? Math.min(100, Math.round(((creditsTotal - creditsRemaining) / creditsTotal) * 100)) : 0
  const creditLow        = creditsTotal > 0 && creditsRemaining <= Math.round(creditsTotal * 0.2)
  const planLabel        = PLAN_DISPLAY[credits?.plan ?? ''] ?? (credits?.plan ?? 'Free')

  // ── Search results (static nav search) ───────────────────────────────
  const allNavItems = navGroups.flatMap(g => g.items)
  const searchResults = searchQuery.trim()
    ? allNavItems.filter(item => {
        const val = (t.dashboard as unknown as Record<string, unknown>)[item.labelKey]
        const label = typeof val === 'string' ? val : item.labelKey
        return label.toLowerCase().includes(searchQuery.toLowerCase())
      })
    : []

  // ── Helper: resolve label ─────────────────────────────────────────────
  const getLabel = (labelKey: string): string => {
    const val = (t.dashboard as unknown as Record<string, unknown>)[labelKey]
    return typeof val === 'string' ? val : labelKey
  }

  // ── Helper: is nav item active ────────────────────────────────────────
  const isItemActive = (item: NavItem) => {
    if (item.matchPrefix) return pathname === item.href || pathname.startsWith(item.href + '/')
    return pathname === item.href
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gray-950 border-r border-gray-800/50 flex flex-col z-50 transition-all duration-300 ease-in-out ${
        expanded ? 'w-[220px]' : 'w-[68px]'
      }`}
    >
      {/* ── Header: Logo + Toggle ─────────────────────────────────────────── */}
      <div className={`flex items-center h-14 border-b border-gray-800/50 ${expanded ? 'px-4' : 'justify-center px-2'}`}>
        <Link href="/" className="hover:opacity-80 transition-opacity flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center flex-shrink-0">
            <Image src="/logo-icon.png" alt="Alignment AI" width={28} height={28} className="object-contain" priority />
          </div>
          {expanded && (
            <span className="text-sm font-semibold text-white whitespace-nowrap">Alignment AI</span>
          )}
        </Link>
        <div className="relative group">
          <button
            onClick={toggleExpanded}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-800 hover:text-gray-300 transition-all flex-shrink-0"
            aria-label={expanded ? 'Close sidebar' : 'Open sidebar'}
          >
            {expanded ? <PanelLeftClose className="w-4 h-4" strokeWidth={1.8} /> : <PanelLeft className="w-4 h-4" strokeWidth={1.8} />}
          </button>
          <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl border border-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
            {expanded ? 'Close sidebar' : 'Open sidebar'}
          </span>
        </div>
      </div>

      {/* ── Global Search ─────────────────────────────────────────────────── */}
      <div className={`mt-3 ${expanded ? 'px-3' : 'px-2 flex justify-center'}`} ref={searchRef}>
        {expanded ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
              placeholder={t.dashboard.searchPlaceholder}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearch(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
            {/* Search dropdown */}
            {showSearch && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-[80] overflow-hidden">
                {searchResults.length > 0 ? searchResults.map(item => {
                  const Icon = item.icon
                  const href = item.href.split('?')[0]
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => { setShowSearch(false); setSearchQuery('') }}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-800 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.8} />
                      <span className="text-[12px] text-gray-300">{getLabel(item.labelKey)}</span>
                    </Link>
                  )
                }) : (
                  <div className="px-3 py-3 text-[12px] text-gray-500 text-center">No results</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative group">
            <button
              onClick={() => { setExpanded(true); try { localStorage.setItem(SIDEBAR_KEY, 'true') } catch {} }}
              className="w-11 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-all"
            >
              <Search className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl border border-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
              Search
            </span>
          </div>
        )}
      </div>

      {/* ── Getting Started Progress ────────────────────────────────────────── */}
      {expanded && (
        <div className="mx-3 mt-3 p-2.5 bg-gray-900/60 border border-gray-800/60 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{t.dashboard.gettingStarted}</span>
            <span className="text-[10px] font-bold text-gray-400">{Math.min(completedSteps, TOTAL_STEPS)}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (completedSteps / TOTAL_STEPS) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className={`flex flex-col gap-0.5 flex-1 mt-3 overflow-y-auto scrollbar-none ${expanded ? 'px-2.5' : 'px-2 items-center'}`}>

        {/* Grouped navigation */}
        {navGroups.map((group) => (
          <div key={group.labelKey} className="mb-1">
            {/* Group label */}
            {expanded && (
              <div className="px-1 mb-1">
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                  {getLabel(group.labelKey)}
                </span>
              </div>
            )}
            {!expanded && <div className="w-full h-px bg-gray-800/60 my-2" />}

            {group.items.map((item) => {
              const isActive = isItemActive(item)
              const Icon = item.icon
              const label = getLabel(item.labelKey)
              const href = item.href.includes('?') ? item.href : item.href

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`relative flex items-center gap-3 rounded-lg transition-all duration-200 group mb-0.5 ${
                    expanded ? 'px-3 py-2' : 'w-11 h-10 justify-center'
                  } ${
                    isActive
                      ? 'bg-red-500/15 text-red-400'
                      : 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-300'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-red-500 rounded-r-full" />
                  )}
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  {expanded && (
                    <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-200 flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {label}
                    </span>
                  )}
                  {expanded && item.isNew && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full flex-shrink-0">
                      NEW
                    </span>
                  )}
                  {expanded && item.badge && !item.isNew && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded-full flex-shrink-0 min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {/* Collapsed tooltip */}
                  {!expanded && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl shadow-black/30 border border-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
                      {label}
                      {item.badge && !item.isNew && <span className="ml-1.5 text-[9px] text-gray-400">({item.badge})</span>}
                      {item.isNew && <span className="ml-1.5 text-[8px] text-red-400">NEW</span>}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Admin items (ungrouped, at bottom of nav) */}
        {adminItems.length > 0 && (
          <div className="mt-1">
            {expanded && (
              <div className="px-1 mb-1">
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Admin</span>
              </div>
            )}
            {!expanded && <div className="w-full h-px bg-gray-800/60 my-2" />}
            {adminItems.map((item) => {
              const isActive = item.matchPrefix
                ? pathname === item.href || pathname.startsWith(item.href + '/')
                : pathname === item.href
              const Icon = item.icon
              const label = getLabel(item.labelKey)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 rounded-lg transition-all duration-200 group mb-0.5 ${
                    expanded ? 'px-3 py-2' : 'w-11 h-10 justify-center'
                  } ${
                    isActive
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-gray-600 hover:bg-gray-800/60 hover:text-gray-400'
                  }`}
                >
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.8} />
                  {expanded && <span className="text-[12px] whitespace-nowrap font-medium">{label}</span>}
                  {!expanded && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg shadow-xl border border-gray-800 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60]">
                      {label}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── Bottom: User Avatar ──────────────────────────────────────────────── */}
      <div className={`mt-auto border-t border-gray-800/50 py-3 ${expanded ? 'px-2.5' : 'px-2'}`}>
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className={`flex items-center gap-3 rounded-lg hover:bg-gray-800/60 transition-all duration-200 ${
              expanded ? 'w-full px-3 py-2' : 'w-11 h-11 justify-center mx-auto'
            }`}
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-white">{initial}</span>
              {!expanded && role && role !== 'user' && (
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-950 ${
                  role === 'admin' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
              )}
            </div>
            {expanded && (
              <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-[13px] font-medium text-gray-300 truncate">{displayName}</span>
                  {role && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${roleCfg.color}`}>
                      {roleCfg.label}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-gray-600 truncate w-full">{userEmail || 'Not logged in'}</span>
              </div>
            )}
            {expanded && <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" strokeWidth={1.8} />}
          </button>

          {/* ── Rich User Profile Popup ─────────────────────────────────── */}
          {showUserMenu && (
            <div className="absolute bottom-full mb-2 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-[70] w-[240px] left-0">
              <div className="flex items-center gap-3 p-4 border-b border-gray-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-bold text-white">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-white truncate">{displayName}</span>
                    {role && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-500 truncate block">{userEmail}</span>
                </div>
              </div>

              {/* Credits card */}
              {credits && creditsTotal > 0 && (
                <div className="m-3 p-3 bg-gray-800/60 rounded-xl border border-gray-700/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[12px] font-semibold text-white">{planLabel} Plan</span>
                    {credits.plan !== 'enterprise' && (
                      <Link
                        href="/pricing"
                        onClick={() => setShowUserMenu(false)}
                        className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-md transition-colors"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className={`w-3 h-3 flex-shrink-0 ${creditLow ? 'text-red-400' : 'text-yellow-400'}`} />
                    <span className="text-[11px] text-gray-400">Credits</span>
                    <span className={`text-[11px] font-semibold ml-auto ${creditLow ? 'text-red-400' : 'text-white'}`}>
                      {creditsRemaining.toLocaleString()}
                      <span className="text-gray-600 font-normal"> / {creditsTotal.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        creditPct >= 90 ? 'bg-red-500' : creditPct >= 70 ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${creditPct}%` }}
                    />
                  </div>
                  {creditLow && <p className="text-[10px] text-red-400 mt-1.5">Running low — consider upgrading</p>}
                </div>
              )}

              {/* Navigation links */}
              <div className="py-1.5">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/dashboard/settings') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
                >
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  Account
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/dashboard/settings') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                  Settings
                </button>
                <div className="h-px bg-gray-800 mx-3 my-1" />
                <a
                  href="https://alignmenttech.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <Home className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Homepage</span>
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                </a>
                <a
                  href="mailto:contact@alignmenttech.ai"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Get help</span>
                  <ExternalLink className="w-3 h-3 text-gray-600" />
                </a>
                <div className="h-px bg-gray-800 mx-3 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── Export sidebar width for layout ──
export const SIDEBAR_COLLAPSED_WIDTH = 68
export const SIDEBAR_EXPANDED_WIDTH = 220
