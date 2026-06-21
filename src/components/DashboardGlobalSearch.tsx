'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, AlertCircle, BarChart3, Bot, Briefcase, Compass, Cpu, Database, ExternalLink,
  History, LineChart, Link2, Search, ShieldCheck, ShoppingCart, Tag, Users, Wrench,
  Megaphone, Share2, X, type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/hooks/useAuth'
import { API_BASE_URL, fetchWithRetry } from '@/lib/api'

type ResultType = 'module' | 'category' | 'brand' | 'topic' | 'source'

interface SearchResult {
  id: string
  type: ResultType
  title: string
  subtitle: string
  href?: string
  icon?: LucideIcon
  disabled?: boolean
  badge?: string
  keywords: string[]
  score: number
  brandDomain?: string | null
}

interface StoredSearchResult {
  id: string
  type: ResultType
  title: string
  subtitle: string
  href: string
  badge?: string
  keywords: string[]
  brandDomain?: string | null
  lastUsedAt: number
  hits: number
}

interface DashboardGlobalSearchProps {
  mobile?: boolean
}

const RECENT_RESULTS_KEY = 'dashboard-global-search-recents-v1'
const MAX_RECENT_RESULTS = 6
const HIDDEN_LAUNCH_PATH_PREFIXES = [
  '/dashboard/ads',
  '/dashboard/gci',
  '/dashboard/geo-content',
  '/dashboard/geo-distribution',
  '/dashboard/agentic-commerce',
  '/dashboard/visibility-proxy',
]

const MODULE_RESULTS: SearchResult[] = [
  { id: 'module-explore', type: 'module', title: 'Explore', subtitle: 'Market categories, topics, brands, and citations', href: '/dashboard/explore', icon: Compass, badge: 'Beta', keywords: ['category', 'categories', 'topic', 'topics', 'brand', 'citation', 'leaderboard'], score: 0 },
  { id: 'module-ai-search', type: 'module', title: 'AI Research', subtitle: 'Diagnose profile, source gaps, prompt gaps, and next actions', href: '/dashboard/ai-search', icon: BarChart3, badge: 'NEW', keywords: ['answer', 'visibility', 'research', 'search', 'chatgpt', 'perplexity', 'gap', 'citation', 'source', 'domain', 'publisher', 'prompt'], score: 0 },
  { id: 'module-shopping', type: 'module', title: 'Shopping', subtitle: 'Product and category intelligence', href: '/dashboard/shopping', icon: ShoppingCart, badge: 'NEW', keywords: ['product', 'commerce', 'shop', 'category'], score: 0 },
  { id: 'module-monitor', type: 'module', title: 'Prompt', subtitle: 'Manage prompts, run scans, and track visibility', href: '/dashboard/geo-monitor', icon: BarChart3, keywords: ['monitor', 'prompt', 'competitor', 'mention', 'fan-out', 'scan'], score: 0 },
  { id: 'module-analysis', type: 'module', title: 'Analysis', subtitle: 'Cross-module reporting and decision support', href: '/dashboard/analysis', icon: LineChart, badge: 'NEW', keywords: ['report', 'analysis', 'insight'], score: 0 },
  { id: 'module-web-infra', type: 'module', title: 'Agent Audit', subtitle: 'Agent audit and technical readiness', href: '/dashboard/geo-audit', icon: ShieldCheck, keywords: ['audit', 'schema', 'technical', 'website'], score: 0 },
  { id: 'module-brand-hub', type: 'module', title: 'Brand Hub', subtitle: 'Brand and domain data management', href: '/dashboard/brand-hub', icon: Database, keywords: ['brand', 'domain', 'entity'], score: 0 },
  { id: 'module-ga4', type: 'module', title: 'GA4 Attribution', subtitle: 'AI traffic and revenue attribution', href: '/dashboard/ga4-attribution', icon: LineChart, keywords: ['ga4', 'analytics', 'attribution', 'roi'], score: 0 },
  { id: 'module-mcp', type: 'module', title: 'MCP Integration', subtitle: 'Connect external MCP tools and agents', icon: Cpu, disabled: true, badge: 'Coming soon', keywords: ['mcp', 'integration', 'tool'], score: 0 },
  { id: 'module-customers', type: 'module', title: 'Customers', subtitle: 'Customer and workspace management', href: '/dashboard/admin/customers', icon: Briefcase, keywords: ['customer', 'workspace', 'client'], score: 0 },
  { id: 'module-managed-service', type: 'module', title: 'Managed Service', subtitle: 'Operations projects and client work', href: '/dashboard/ops', icon: Activity, keywords: ['ops', 'project', 'managed'], score: 0 },
  { id: 'module-admin', type: 'module', title: 'Admin Panel', subtitle: 'Internal admin tools', href: '/dashboard/admin', icon: Wrench, keywords: ['admin', 'token'], score: 0 },
  { id: 'module-domain-checker', type: 'module', title: 'Domain Checker', subtitle: 'Check domain readiness and ownership', href: '/dashboard/admin/domain-checker', icon: Search, keywords: ['domain', 'checker'], score: 0 },
  { id: 'module-team', type: 'module', title: 'Team Management', subtitle: 'Roles and staff permissions', href: '/dashboard/admin/team', icon: Users, keywords: ['team', 'staff', 'permission'], score: 0 },
]

const ADMIN_PRODUCT_LAB_RESULTS: SearchResult[] = [
  { id: 'module-ads', type: 'module', title: 'Ads', subtitle: 'AI ads card observation and advertiser intelligence', href: '/dashboard/ads', icon: Megaphone, badge: 'Admin', keywords: ['ads', 'advertiser', 'ad cards', 'creative', 'criteo'], score: 0 },
  { id: 'module-gci', type: 'module', title: 'GCI', subtitle: 'Growth and commerce intelligence workspace', href: '/dashboard/gci', icon: Activity, badge: 'Admin', keywords: ['gci', 'growth', 'commerce', 'intelligence'], score: 0 },
  { id: 'module-agent', type: 'module', title: 'Agent', subtitle: 'Agent workflow and GEO content product lab', href: '/dashboard/geo-content', icon: Bot, badge: 'Admin', keywords: ['agent', 'geo content', 'automation', 'workflow'], score: 0 },
  { id: 'module-geo-distribute', type: 'module', title: 'GEO Distribute', subtitle: 'Distribution and publishing product lab', href: '/dashboard/geo-distribution', icon: Share2, badge: 'Admin', keywords: ['geo distribute', 'distribution', 'publish', 'syndication'], score: 0 },
  { id: 'module-visibility-proxy', type: 'module', title: 'Visibility Proxy', subtitle: 'AI crawler and proxy visibility infrastructure', href: '/dashboard/visibility-proxy', icon: ExternalLink, badge: 'Admin', keywords: ['proxy', 'crawler', 'bot', 'shopify'], score: 0 },
]

function isLaunchVisibleResult(result: SearchResult): boolean {
  const href = result.href
  if (!href) return true
  return !HIDDEN_LAUNCH_PATH_PREFIXES.some(prefix => href === prefix || href.startsWith(prefix + '/'))
}

function isVisibleSearchResult(value: SearchResult | null): value is SearchResult {
  return value !== null && isLaunchVisibleResult(value)
}

function iconForType(type: ResultType): LucideIcon | undefined {
  if (type === 'category') return Compass
  if (type === 'topic') return Tag
  if (type === 'source') return Link2
  return undefined
}

function scoreResult(result: SearchResult, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const title = result.title.toLowerCase()
  const subtitle = result.subtitle.toLowerCase()
  const keywords = result.keywords.join(' ').toLowerCase()
  let score = 0
  if (title === q) score += 100
  if (title.startsWith(q)) score += 70
  if (title.includes(q)) score += 45
  if (subtitle.includes(q)) score += 18
  if (keywords.includes(q)) score += 28
  if (score > 0 && result.type === 'module') score += 10
  if (score > 0 && result.type === 'category') score += 6
  if (score > 0 && result.type === 'brand') score += 4
  if (score > 0 && result.type === 'topic') score += 5
  if (score > 0 && result.type === 'source') score += 3
  if (result.disabled) score -= 8
  return score
}

function groupLabel(type: ResultType): string {
  if (type === 'module') return 'Modules'
  if (type === 'category') return 'Explore categories'
  if (type === 'brand') return 'Explore brands'
  if (type === 'topic') return 'Explore topics'
  return 'Citation sources'
}

function sanitizeRecentResult(raw: unknown): SearchResult | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<StoredSearchResult>
  if (!value.id || !value.type || !value.title || !value.subtitle || !value.href) return null
  if (!['module', 'category', 'brand', 'topic', 'source'].includes(value.type)) return null
  return {
    id: value.id,
    type: value.type,
    title: value.title,
    subtitle: value.subtitle,
    href: value.href,
    badge: value.badge,
    keywords: Array.isArray(value.keywords) && value.keywords.length ? value.keywords.filter(Boolean) : [value.title, value.subtitle],
    brandDomain: value.brandDomain ?? null,
    icon: value.type === 'brand' ? undefined : iconForType(value.type),
    score: 0,
  }
}

function loadRecentResults(): SearchResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_RESULTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(sanitizeRecentResult)
      .filter(isVisibleSearchResult)
      .slice(0, MAX_RECENT_RESULTS)
  } catch {
    return []
  }
}

function saveRecentResult(result: SearchResult) {
  if (typeof window === 'undefined' || !result.href || result.disabled) return
  try {
    const existingRaw = window.localStorage.getItem(RECENT_RESULTS_KEY)
    const parsed = existingRaw ? JSON.parse(existingRaw) : []
    const existing = Array.isArray(parsed) ? (parsed as StoredSearchResult[]) : []
    const current = existing.find(row => row.id === result.id)
    const nextRow: StoredSearchResult = {
      id: result.id,
      type: result.type,
      title: result.title,
      subtitle: result.subtitle,
      href: result.href,
      badge: result.badge,
      keywords: result.keywords,
      brandDomain: result.brandDomain ?? null,
      lastUsedAt: Date.now(),
      hits: (current?.hits || 0) + 1,
    }
    const merged = [nextRow, ...existing.filter(row => row.id !== result.id)]
      .sort((a, b) => (b.hits || 0) - (a.hits || 0) || (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      .slice(0, MAX_RECENT_RESULTS)
    window.localStorage.setItem(RECENT_RESULTS_KEY, JSON.stringify(merged))
  } catch {}
}

function firstSelectableIndex(results: SearchResult[]): number {
  return Math.max(0, results.findIndex(result => !result.disabled && result.href))
}

function moveActiveIndex(results: SearchResult[], startIndex: number, direction: 1 | -1): number {
  if (!results.length) return 0
  let next = startIndex
  for (let step = 0; step < results.length; step += 1) {
    next = (next + direction + results.length) % results.length
    if (!results[next].disabled && results[next].href) return next
  }
  return startIndex
}

function SearchRow({
  result,
  active,
  resultId,
  onMouseEnter,
  onClick,
}: {
  result: SearchResult
  active: boolean
  resultId: string
  onMouseEnter: () => void
  onClick: () => void
}) {
  const Icon = result.icon
  return (
    <button
      id={resultId}
      type="button"
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      disabled={result.disabled}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150 ${
        result.disabled
          ? 'cursor-not-allowed opacity-55'
          : 'cursor-pointer hover:bg-canvas'
      } ${
        active ? 'bg-canvas shadow-sm ring-1 ring-divider-light' : ''
      }`}
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-divider-light bg-surface">
        {result.type === 'brand'
          ? <BrandLogo domain={result.brandDomain || undefined} name={result.title} size={22} />
          : Icon ? <Icon className="h-4 w-4 text-ink-2" /> : <Search className="h-4 w-4 text-ink-2" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-ink">{result.title}</span>
          {result.badge && (
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
              result.disabled ? 'bg-surface-muted text-ink-3' : 'bg-sage-bg text-sage'
            }`}>
              {result.badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-3">{result.subtitle}</span>
      </span>
      {result.disabled ? (
        <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-ink-3">Unavailable</span>
      ) : (
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-ink-3" />
      )}
    </button>
  )
}

export default function DashboardGlobalSearch({ mobile = false }: DashboardGlobalSearchProps) {
  const router = useRouter()
  const listboxId = useId()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([])
  const [recentResults, setRecentResults] = useState<SearchResult[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [remoteError, setRemoteError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecentResults(loadRecentResults())
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      setRemoteResults([])
      setLoadingRemote(false)
      setRemoteError(false)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoadingRemote(true)
      setRemoteError(false)
      fetchWithRetry(`${API_BASE_URL}/api/global-search?q=${encodeURIComponent(q)}&limit=16`, {}, { timeoutMs: 4500, budgetMs: 4500 })
        .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
        .then(data => {
          if (cancelled) return
          const next = (data?.results || []).map((result: SearchResult) => ({
            ...result,
            icon: result.type === 'brand' ? undefined : iconForType(result.type),
            keywords: result.keywords || [result.title, result.subtitle],
            score: 0,
          })).filter((result: SearchResult) => isAdmin || isLaunchVisibleResult(result))
          setRemoteResults(next)
        })
        .catch(() => {
          if (cancelled) return
          setRemoteResults([])
          setRemoteError(true)
        })
        .finally(() => {
          if (!cancelled) setLoadingRemote(false)
        })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isAdmin, open, query])

  const moduleResults = useMemo(
    () => isAdmin ? [...MODULE_RESULTS, ...ADMIN_PRODUCT_LAB_RESULTS] : MODULE_RESULTS,
    [isAdmin],
  )

  const quickAccessResults = useMemo(
    () => moduleResults.slice(0, mobile ? 5 : 8).map((result, index) => ({ ...result, score: 80 - index })),
    [mobile, moduleResults],
  )

  const moduleBrowseResults = useMemo(
    () => quickAccessResults.filter(result => !recentResults.some(recent => recent.id === result.id)),
    [quickAccessResults, recentResults],
  )

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) {
      const deduped = new Map<string, SearchResult>()
      for (const result of [...recentResults, ...quickAccessResults]) {
        if (!deduped.has(result.id)) deduped.set(result.id, result)
      }
      return Array.from(deduped.values())
    }

    const deduped = new Map<string, SearchResult>()
    for (const result of [...moduleResults, ...recentResults, ...remoteResults]) {
      if (!deduped.has(result.id)) deduped.set(result.id, result)
    }

    return Array.from(deduped.values())
      .map(result => ({ ...result, score: scoreResult(result, q) }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 12)
  }, [query, quickAccessResults, moduleResults, recentResults, remoteResults])

  useEffect(() => {
    setActiveIndex(firstSelectableIndex(results))
  }, [results])

  const grouped = results.reduce<Record<ResultType, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<ResultType, SearchResult[]>)

  const activeResult = results[activeIndex]
  const trimmedQuery = query.trim()

  const goTo = (result: SearchResult) => {
    if (result.disabled || !result.href) return
    saveRecentResult(result)
    setRecentResults(loadRecentResults())
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(prev => moveActiveIndex(results, prev, 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(prev => moveActiveIndex(results, prev, -1))
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(firstSelectableIndex(results))
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      for (let index = results.length - 1; index >= 0; index -= 1) {
        if (!results[index].disabled && results[index].href) {
          setActiveIndex(index)
          break
        }
      }
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeResult) goTo(activeResult)
      return
    }
    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className={`relative w-full ${mobile ? 'max-w-none' : 'max-w-[560px]'}`}>
      <div
        data-global-search-trigger="true"
        className={`group relative flex items-center rounded-2xl border bg-surface transition-all duration-200 ${
          mobile ? 'h-11' : 'h-11'
        } ${open ? 'border-ink-2 shadow-sm' : 'border-divider-light hover:border-ink-2 hover:shadow-sm'}`}
      >
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-3 transition-colors group-hover:text-ink-2" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeResult ? `${listboxId}-${activeResult.id}` : undefined}
          aria-label="Search dashboard"
          data-global-search-field="true"
          onChange={event => {
            setQuery(event.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder={mobile ? 'Search dashboard' : 'Search Alignment...'}
          className={`h-full w-full bg-transparent text-[13px] text-ink placeholder:text-ink-3 focus:outline-none ${
            mobile ? 'pl-10 pr-11' : 'pl-10 pr-20'
          }`}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setRemoteError(false)
              inputRef.current?.focus()
            }}
            className={`absolute flex items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink ${
              mobile ? 'right-2 h-8 w-8' : 'right-12 h-8 w-8'
            }`}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {!mobile && (
          <span className="pointer-events-none absolute right-3 rounded-md border border-divider-light bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
            ⌘K
          </span>
        )}
      </div>

      {open && (
        <div
          data-global-search-results="true"
          className={`absolute left-0 right-0 top-full z-[90] mt-2 overflow-hidden rounded-2xl border border-divider-light bg-surface shadow-elevation-lg ${
            mobile ? 'max-h-[min(70vh,540px)]' : ''
          }`}
        >
          <div id={listboxId} role="listbox" className="max-h-[520px] overflow-y-auto p-2">
            {!trimmedQuery && recentResults.length > 0 && (
              <div className="mb-2">
                <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
                  Recent and frequent
                </div>
                <div className="space-y-1">
                  {recentResults.map(result => {
                    const absoluteIndex = results.findIndex(item => item.id === result.id)
                    const active = absoluteIndex === activeIndex
                    return (
                      <SearchRow
                        key={`recent-${result.id}`}
                        result={{ ...result, icon: result.type === 'brand' ? undefined : iconForType(result.type) }}
                        active={active}
                        resultId={`${listboxId}-${result.id}`}
                        onMouseEnter={() => setActiveIndex(Math.max(0, absoluteIndex))}
                        onClick={() => goTo(result)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {!trimmedQuery && moduleBrowseResults.length > 0 && (
              <div className="mb-2 last:mb-0">
                <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
                  Quick access
                </div>
                <div className="space-y-1">
                  {moduleBrowseResults.map(result => {
                    const absoluteIndex = results.findIndex(item => item.id === result.id)
                    const active = absoluteIndex === activeIndex
                    return (
                      <SearchRow
                        key={result.id}
                        result={result}
                        active={active}
                        resultId={`${listboxId}-${result.id}`}
                        onMouseEnter={() => setActiveIndex(Math.max(0, absoluteIndex))}
                        onClick={() => goTo(result)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {trimmedQuery && results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                {loadingRemote ? (
                  <>
                    <p className="text-[13px] font-semibold text-ink">Searching Alignment...</p>
                    <p className="mt-1 text-[12px] text-ink-3">Checking modules, Explore data, and saved results.</p>
                  </>
                ) : remoteError ? (
                  <>
                    <p className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ink">
                      <AlertCircle className="h-4 w-4 text-caution" />
                      Search is partially unavailable
                    </p>
                    <p className="mt-1 text-[12px] text-ink-3">Module results and recent destinations still work. Explore data will retry on the next query.</p>
                  </>
                ) : trimmedQuery ? (
                  <>
                    <p className="text-[13px] font-semibold text-ink">No results</p>
                    <p className="mt-1 text-[12px] text-ink-3">Try a module, category, topic, brand, or citation source.</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ink">
                      <History className="h-4 w-4 text-ink-3" />
                      Start typing to search
                    </p>
                    <p className="mt-1 text-[12px] text-ink-3">You can jump across modules or drill into Explore data.</p>
                  </>
                )}
              </div>
            ) : trimmedQuery ? (
              (['module', 'category', 'brand', 'topic', 'source'] as ResultType[]).map(type => {
                const items = grouped[type] || []
                if (!items.length) return null
                return (
                  <div key={type} className="mb-2 last:mb-0">
                    <div className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-3">
                      {groupLabel(type)}
                    </div>
                    <div className="space-y-1">
                      {items.map(result => {
                        const absoluteIndex = results.findIndex(item => item.id === result.id)
                        const active = absoluteIndex === activeIndex
                        return (
                          <SearchRow
                            key={result.id}
                            result={result}
                            active={active}
                            resultId={`${listboxId}-${result.id}`}
                            onMouseEnter={() => setActiveIndex(Math.max(0, absoluteIndex))}
                            onClick={() => goTo(result)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : null}
          </div>
          {loadingRemote && trimmedQuery && (
            <div className="border-t border-divider-light px-4 py-2 text-[11px] font-medium text-ink-3">
              Searching Alignment...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
