'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/LanguageContext'
import { useAuth, type UserRole, type PermissionsMap } from '@/hooks/useAuth'
import { api, CreditBalance } from '@/lib/api'
import {
  ShieldCheck, Zap, PenTool, Share2, BarChart3, Activity,
  LogOut, Settings, Wrench, PanelLeftClose, PanelLeft,
  Sparkles, ExternalLink, HelpCircle, Home, ChevronRight, CreditCard,
  LineChart, LayoutDashboard, Network, Search, MessageSquare,
  BookOpen, TrendingUp, Database, X, Globe, Users,
} from 'lucide-react'

const SIDEBAR_KEY = 'sidebar_expanded'

// DESIGN.md: admin → amber (caution), staff → blue, demo/user → muted
const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin:  { label: 'ADMIN',  color: 'bg-[rgba(184,134,11,0.12)] text-caution border-[rgba(184,134,11,0.25)]' },
  staff:  { label: 'STAFF',  color: 'bg-[rgba(100,180,255,0.12)] text-[rgba(100,180,255,0.85)] border-[rgba(100,180,255,0.25)]' },
  demo:   { label: 'DEMO',   color: 'bg-[rgba(250,245,236,0.08)] text-[rgba(250,245,236,0.45)] border-[rgba(250,245,236,0.12)]' },
  user:   { label: 'USER',   color: 'bg-[rgba(250,245,236,0.08)] text-[rgba(250,245,236,0.35)] border-[rgba(250,245,236,0.10)]' },
}

const PLAN_DISPLAY: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
  trial: 'Trial',
}

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
  /** Permission key used to filter items for staff accounts */
  permissionKey?: string
}

interface NavGroup {
  labelKey: string
  items: NavItem[]
}

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const { user, role, signOut, permissions } = useAuth()
  const [expandedPref, setExpandedPref] = useState(false)
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

  // ── Auto-collapse on tablet (768–1024px) ──────────────────────────────
  const [viewportCollapsed, setViewportCollapsed] = useState(false)
  // Derived: on tablet, always collapse regardless of user preference
  const expanded = expandedPref && !viewportCollapsed

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      setViewportCollapsed(w >= 768 && w < 1024)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Persist sidebar state ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY)
      if (saved === 'true') setExpandedPref(true)
    } catch {}
    setCompletedSteps(getCompletedSteps())
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
    setExpandedPref(prev => {
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
        { href: '/dashboard/overview',    icon: LayoutDashboard, labelKey: 'overviewNav',    permissionKey: 'overview' },
        { href: '/dashboard/geo-monitor', icon: TrendingUp,      labelKey: 'answerEngineNav', permissionKey: 'geo-monitor' },
      ],
    },
    {
      labelKey: 'navGroupAction',
      items: [
        { href: '/dashboard/agentic-commerce', icon: Network, labelKey: 'agenticCommerceNav', isNew: true, matchPrefix: true, permissionKey: 'agentic-commerce' },
        { href: '/dashboard/geo-audit',   icon: ShieldCheck, labelKey: 'geoAuditNav',             permissionKey: 'geo-audit' },
        { href: '/dashboard/geo-content', icon: PenTool,     labelKey: 'geoContentNav',           permissionKey: 'geo-content' },
      ],
    },
    {
      labelKey: 'navGroupContext',
      items: [
        { href: '/dashboard/prompts',   icon: MessageSquare, labelKey: 'promptsNav', badge: promptCount > 0 ? String(promptCount) : undefined, permissionKey: 'prompts' },
        { href: '/dashboard/brand-hub', icon: Database,      labelKey: 'brandNav',                                                             permissionKey: 'brand-hub' },
      ],
    },
    {
      labelKey: 'navGroupProxy',
      items: [
        { href: '/dashboard/visibility-proxy', icon: Globe, labelKey: 'visibilityProxyNav', matchPrefix: true, isNew: true, permissionKey: 'visibility-proxy' },
      ],
    },
  ]

  // Advanced features — admin sees all; staff sees permitted ones only
  const advancedFeatureItems: NavItem[] = [
    { href: '/dashboard/geo-optimization', icon: Zap,       labelKey: 'geoOptimizationNav',              permissionKey: 'geo-optimization' },
    { href: '/dashboard/geo-distribution', icon: Share2,    labelKey: 'geoDistributionNav',              permissionKey: 'geo-distribution' },
    { href: '/dashboard/ga4-attribution',  icon: LineChart, labelKey: 'GA4 Attribution' as never,        permissionKey: 'ga4-attribution' },
    { href: '/dashboard/ops',              icon: Activity,  labelKey: 'Managed Service' as never, matchPrefix: true, permissionKey: 'ops' },
  ]

  // Admin-only items (never shown to staff)
  const adminOnlyItems: NavItem[] = [
    { href: '/dashboard/admin',                icon: Wrench, labelKey: 'Admin Panel' as never },
    { href: '/dashboard/admin/domain-checker', icon: Search, labelKey: 'Domain Checker' as never },
    { href: '/dashboard/admin/team',           icon: Users,  labelKey: 'Team Management' as never },
  ]

  // Combine for the "Admin" section (amber-styled, admin only)
  const adminItems: NavItem[] = role === 'admin'
    ? [...advancedFeatureItems, ...adminOnlyItems]
    : []

  // For staff: filter nav groups + advanced features by permissions
  const displayNavGroups = role === 'staff'
    ? navGroups
        .map(g => ({
          ...g,
          items: g.items.filter(item => !item.permissionKey || !!permissions[item.permissionKey]),
        }))
        .filter(g => g.items.length > 0)
    : navGroups

  const staffAdvancedItems: NavItem[] = role === 'staff'
    ? advancedFeatureItems.filter(item => item.permissionKey && !!permissions[item.permissionKey])
    : []

  // ── Credits display ────────────────────────────────────────────────────
  const creditsRemaining = credits?.credits_remaining ?? 0
  const creditsTotal     = credits?.credits_total     ?? 0
  const creditPct        = creditsTotal > 0 ? Math.min(100, Math.round(((creditsTotal - creditsRemaining) / creditsTotal) * 100)) : 0
  const creditLow        = creditsTotal > 0 && creditsRemaining <= Math.round(creditsTotal * 0.2)
  const planLabel        = PLAN_DISPLAY[credits?.plan ?? ''] ?? (credits?.plan ?? 'Free')

  // ── Search results ─────────────────────────────────────────────────────
  const allNavItems = displayNavGroups.flatMap(g => g.items)
  const searchResults = searchQuery.trim()
    ? allNavItems.filter(item => {
        const val = (t.dashboard as unknown as Record<string, unknown>)[item.labelKey]
        const label = typeof val === 'string' ? val : item.labelKey
        return label.toLowerCase().includes(searchQuery.toLowerCase())
      })
    : []

  const getLabel = (labelKey: string): string => {
    const val = (t.dashboard as unknown as Record<string, unknown>)[labelKey]
    return typeof val === 'string' ? val : labelKey
  }

  const isItemActive = (item: NavItem) => {
    if (item.matchPrefix) return pathname === item.href || pathname.startsWith(item.href + '/')
    return pathname === item.href
  }

  const handleNavClick = () => { onMobileClose?.() }

  return (
    <>
    {/* Mobile overlay backdrop */}
    {mobileOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onMobileClose}
        aria-hidden="true"
      />
    )}
    <aside
      className={`fixed left-0 top-0 h-screen bg-ink border-r border-[rgba(250,245,236,0.08)] flex flex-col z-50 transition-all duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0 w-[240px]' : '-translate-x-full md:translate-x-0'
      } ${
        !mobileOpen ? (expanded ? 'md:w-[240px]' : 'md:w-[68px]') : ''
      }`}
    >
      {/* ── Header: Logo + Toggle ─────────────────────────────────────────── */}
      <div className={`flex items-center h-14 border-b border-[rgba(250,245,236,0.08)] ${mobileOpen ? 'px-4' : expanded ? 'px-4' : 'justify-center px-2'}`}>
        <Link href="/" onClick={handleNavClick} className="hover:opacity-80 transition-opacity flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[rgba(250,245,236,0.08)] p-1 flex items-center justify-center flex-shrink-0">
            <Image src="/logo-icon.png" alt="Alignment AI" width={28} height={28} className="object-contain" priority />
          </div>
          {(expanded || mobileOpen) && (
            <span className="text-sm font-semibold text-ink-inv whitespace-nowrap">Alignment AI</span>
          )}
        </Link>
        {/* Mobile close button — only shown when drawer is open */}
        {mobileOpen ? (
          <button
            onClick={onMobileClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[rgba(250,245,236,0.35)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.7)] transition-all flex-shrink-0 md:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" strokeWidth={1.8} />
          </button>
        ) : (
          <div className="relative group">
            <button
              onClick={toggleExpanded}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[rgba(250,245,236,0.35)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.7)] transition-all flex-shrink-0"
              aria-label={expanded ? 'Close sidebar' : 'Open sidebar'}
            >
              {expanded ? <PanelLeftClose className="w-4 h-4" strokeWidth={1.8} /> : <PanelLeft className="w-4 h-4" strokeWidth={1.8} />}
            </button>
            <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
              {expanded ? 'Close sidebar' : 'Open sidebar'}
            </span>
          </div>
        )}
      </div>

      {/* ── Global Search ─────────────────────────────────────────────────── */}
      <div className={`mt-3 ${(expanded || mobileOpen) ? 'px-3' : 'px-2 flex justify-center'}`} ref={searchRef}>
        {(expanded || mobileOpen) ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(250,245,236,0.3)]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
              placeholder={t.dashboard.searchPlaceholder}
              className="w-full bg-[rgba(250,245,236,0.04)] border border-[rgba(250,245,236,0.08)] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[rgba(250,245,236,0.7)] placeholder-[rgba(250,245,236,0.25)] focus:outline-none focus:border-[rgba(250,245,236,0.2)] transition-colors"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearch(false) }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-[rgba(250,245,236,0.3)]" />
              </button>
            )}
            {showSearch && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-ink border border-[rgba(250,245,236,0.08)] rounded-xl shadow-elevation-lg z-[80] overflow-hidden">
                {searchResults.length > 0 ? searchResults.map(item => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      scroll={false}
                      onClick={() => { setShowSearch(false); setSearchQuery('') }}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[rgba(250,245,236,0.06)] transition-colors"
                    >
                      <Icon className="w-4 h-4 text-[rgba(250,245,236,0.4)] flex-shrink-0" strokeWidth={1.8} />
                      <span className="text-[12px] text-[rgba(250,245,236,0.7)]">{getLabel(item.labelKey)}</span>
                    </Link>
                  )
                }) : (
                  <div className="px-3 py-3 text-[12px] text-[rgba(250,245,236,0.3)] text-center">No results</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative group">
            <button
              onClick={() => { setExpandedPref(true); try { localStorage.setItem(SIDEBAR_KEY, 'true') } catch {} }}
              className="w-11 h-8 flex items-center justify-center rounded-lg text-[rgba(250,245,236,0.3)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.6)] transition-all"
            >
              <Search className="w-4 h-4" strokeWidth={1.8} />
            </button>
            <span className="absolute left-full ml-3 px-3 py-1.5 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
              Search
            </span>
          </div>
        )}
      </div>

      {/* ── Getting Started Progress ────────────────────────────────────────── */}
      {(expanded || mobileOpen) && (
        <div className="mx-3 mt-3 p-2.5 bg-[rgba(250,245,236,0.03)] border border-[rgba(250,245,236,0.06)] rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[rgba(250,245,236,0.3)] uppercase tracking-wider">{t.dashboard.gettingStarted}</span>
            <span className="text-[10px] font-bold text-[rgba(250,245,236,0.45)]">{Math.min(completedSteps, TOTAL_STEPS)}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-1 bg-[rgba(250,245,236,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[rgba(250,245,236,0.3)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (completedSteps / TOTAL_STEPS) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className={`flex flex-col gap-0.5 flex-1 mt-3 overflow-y-auto scrollbar-none ${(expanded || mobileOpen) ? 'px-2.5' : 'px-2 items-center'}`}>

        {displayNavGroups.map((group) => (
          <div key={group.labelKey} className="mb-1">
            {(expanded || mobileOpen) && (
              <div className="px-1 mb-1">
                <span className="text-[9px] font-bold text-[rgba(250,245,236,0.25)] uppercase tracking-widest">
                  {getLabel(group.labelKey)}
                </span>
              </div>
            )}
            {!expanded && !mobileOpen && <div className="w-full h-px bg-[rgba(250,245,236,0.06)] my-2" />}

            {group.items.map((item) => {
              const isActive = isItemActive(item)
              const Icon = item.icon
              const label = getLabel(item.labelKey)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={handleNavClick}
                  className={`relative flex items-center gap-3 rounded-lg transition-all duration-200 group mb-0.5 ${
                    mobileOpen ? 'px-3 py-2' : expanded ? 'px-3 py-2' : 'w-11 h-10 justify-center'
                  } ${
                    isActive
                      ? 'bg-[rgba(250,245,236,0.08)] text-ink-inv'
                      : 'text-[rgba(250,245,236,0.45)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.75)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[rgba(250,245,236,0.5)] rounded-r-full" />
                  )}
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  {(expanded || mobileOpen) && (
                    <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-200 flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {label}
                    </span>
                  )}
                  {(expanded || mobileOpen) && item.isNew && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-caution-bg text-caution border border-[rgba(184,134,11,0.2)] rounded-full flex-shrink-0">
                      NEW
                    </span>
                  )}
                  {(expanded || mobileOpen) && item.badge && !item.isNew && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[rgba(250,245,236,0.08)] text-[rgba(250,245,236,0.45)] rounded-full flex-shrink-0 min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                  {/* Collapsed tooltip */}
                  {!expanded && !mobileOpen && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
                      {label}
                      {item.badge && !item.isNew && <span className="ml-1.5 text-[9px] text-[rgba(250,245,236,0.4)]">({item.badge})</span>}
                      {item.isNew && <span className="ml-1.5 text-[8px] text-caution">NEW</span>}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink" />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* Staff advanced items — shown only when role=staff and permissions granted */}
        {staffAdvancedItems.length > 0 && (
          <div className="mt-1">
            {(expanded || mobileOpen) && (
              <div className="px-1 mb-1">
                <span className="text-[9px] font-bold text-[rgba(250,245,236,0.25)] uppercase tracking-widest">Advanced</span>
              </div>
            )}
            {!expanded && !mobileOpen && <div className="w-full h-px bg-[rgba(250,245,236,0.06)] my-2" />}
            {staffAdvancedItems.map((item) => {
              const isActive = item.matchPrefix
                ? pathname === item.href || pathname.startsWith(item.href + '/')
                : pathname === item.href
              const Icon = item.icon
              const label = getLabel(item.labelKey)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  scroll={false}
                  onClick={handleNavClick}
                  className={`relative flex items-center gap-3 rounded-lg transition-all duration-200 group mb-0.5 ${
                    mobileOpen || expanded ? 'px-3 py-2' : 'w-11 h-10 justify-center'
                  } ${
                    isActive
                      ? 'bg-[rgba(250,245,236,0.08)] text-ink-inv'
                      : 'text-[rgba(250,245,236,0.45)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.75)]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[rgba(250,245,236,0.5)] rounded-r-full" />
                  )}
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  {(expanded || mobileOpen) && (
                    <span className={`text-[12.5px] whitespace-nowrap transition-opacity duration-200 flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {label}
                    </span>
                  )}
                  {!expanded && !mobileOpen && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60]">
                      {label}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink" />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}

        {/* Admin items */}
        {adminItems.length > 0 && (
          <div className="mt-1">
            {(expanded || mobileOpen) && (
              <div className="px-1 mb-1">
                <span className="text-[9px] font-bold text-[rgba(250,245,236,0.25)] uppercase tracking-widest">Admin</span>
              </div>
            )}
            {!expanded && !mobileOpen && <div className="w-full h-px bg-[rgba(250,245,236,0.06)] my-2" />}
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
                  scroll={false}
                  onClick={handleNavClick}
                  className={`relative flex items-center gap-3 rounded-lg transition-all duration-200 group mb-0.5 ${
                    mobileOpen || expanded ? 'px-3 py-2' : 'w-11 h-10 justify-center'
                  } ${
                    isActive
                      ? 'bg-caution-bg text-caution'
                      : 'text-[rgba(250,245,236,0.35)] hover:bg-[rgba(250,245,236,0.06)] hover:text-[rgba(250,245,236,0.6)]'
                  }`}
                >
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.8} />
                  {(expanded || mobileOpen) && <span className="text-[12px] whitespace-nowrap font-medium">{label}</span>}
                  {!expanded && !mobileOpen && (
                    <span className="absolute left-full ml-3 px-3 py-1.5 bg-ink text-ink-inv text-xs font-medium rounded-lg shadow-elevation-lg border border-[rgba(250,245,236,0.08)] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[60]">
                      {label}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink" />
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── Bottom: User Card ──────────────────────────────────────────────── */}
      <div className={`mt-auto border-t border-[rgba(250,245,236,0.08)] py-3 ${expanded ? 'px-2.5' : 'px-2'}`}>
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu(prev => !prev)}
            className={`flex items-center gap-3 rounded-lg hover:bg-[rgba(250,245,236,0.06)] transition-all duration-200 ${
              expanded ? 'w-full px-3 py-2' : 'w-11 h-11 justify-center mx-auto'
            }`}
          >
            <div className="relative w-8 h-8 rounded-full bg-[rgba(250,245,236,0.10)] flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-ink-inv">{initial}</span>
              {!expanded && role && role !== 'user' && (
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-ink ${
                  role === 'admin' ? 'bg-caution' :
                  role === 'staff' ? 'bg-[rgba(100,180,255,0.85)]' :
                  'bg-[rgba(250,245,236,0.4)]'
                }`} />
              )}
            </div>
            {expanded && (
              <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0">
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-[13px] font-medium text-[rgba(250,245,236,0.8)] truncate">{displayName}</span>
                  {role && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${roleCfg.color}`}>
                      {roleCfg.label}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[rgba(250,245,236,0.3)] truncate w-full">{userEmail || 'Not logged in'}</span>
              </div>
            )}
            {expanded && <ChevronRight className="w-3.5 h-3.5 text-[rgba(250,245,236,0.25)] flex-shrink-0" strokeWidth={1.8} />}
          </button>

          {/* ── User Profile Popup ─────────────────────────────────────── */}
          {showUserMenu && (
            <div className="absolute bottom-full mb-2 bg-ink border border-[rgba(250,245,236,0.08)] rounded-2xl shadow-elevation-lg overflow-hidden z-[70] w-[240px] left-0">
              <div className="flex items-center gap-3 p-4 border-b border-[rgba(250,245,236,0.08)]">
                <div className="w-10 h-10 rounded-full bg-[rgba(250,245,236,0.10)] flex items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-bold text-ink-inv">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-ink-inv truncate">{displayName}</span>
                    {role && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[rgba(250,245,236,0.35)] truncate block">{userEmail}</span>
                </div>
              </div>

              {/* Credits card */}
              {credits && creditsTotal > 0 && (
                <div className="m-3 p-3 bg-[rgba(250,245,236,0.04)] rounded-xl border border-[rgba(250,245,236,0.06)]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[12px] font-semibold text-ink-inv">{planLabel} Plan</span>
                    {credits.plan !== 'enterprise' && (
                      <Link
                        href="/pricing"
                        onClick={() => setShowUserMenu(false)}
                        className="text-[10px] font-bold text-ink bg-ink-inv hover:bg-surface-muted px-2 py-0.5 rounded-md transition-colors"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className={`w-3 h-3 flex-shrink-0 ${creditLow ? 'text-red-soft' : 'text-caution'}`} />
                    <span className="text-[11px] text-[rgba(250,245,236,0.4)]">Credits</span>
                    <span className={`text-[11px] font-semibold ml-auto ${creditLow ? 'text-red-soft' : 'text-ink-inv'}`}>
                      {creditsRemaining.toLocaleString()}
                      <span className="text-[rgba(250,245,236,0.3)] font-normal"> / {creditsTotal.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="h-1 bg-[rgba(250,245,236,0.08)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        creditPct >= 90 ? 'bg-red-soft' : creditPct >= 70 ? 'bg-caution' : 'bg-sage'
                      }`}
                      style={{ width: `${creditPct}%` }}
                    />
                  </div>
                  {creditLow && <p className="text-[10px] text-red-soft mt-1.5">Running low — consider upgrading</p>}
                </div>
              )}

              {/* Navigation links */}
              <div className="py-1.5">
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/dashboard/settings') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-[rgba(250,245,236,0.5)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv transition-colors text-left"
                >
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  Account
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); router.push('/dashboard/settings') }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-[rgba(250,245,236,0.5)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                  Settings
                </button>
                <div className="h-px bg-[rgba(250,245,236,0.08)] mx-3 my-1" />
                <a
                  href="https://alignmenttech.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[rgba(250,245,236,0.5)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv transition-colors"
                >
                  <Home className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Homepage</span>
                  <ExternalLink className="w-3 h-3 text-[rgba(250,245,236,0.25)]" />
                </a>
                <a
                  href="mailto:contact@alignmenttech.ai"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-[rgba(250,245,236,0.5)] hover:bg-[rgba(250,245,236,0.06)] hover:text-ink-inv transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">Get help</span>
                  <ExternalLink className="w-3 h-3 text-[rgba(250,245,236,0.25)]" />
                </a>
                <div className="h-px bg-[rgba(250,245,236,0.08)] mx-3 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[13px] text-red-soft hover:bg-[rgba(250,245,236,0.06)] hover:text-[#c9564b] transition-colors text-left"
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
    </>
  )
}

// ── Export sidebar width for layout ──
export const SIDEBAR_COLLAPSED_WIDTH = 68
export const SIDEBAR_EXPANDED_WIDTH = 240
