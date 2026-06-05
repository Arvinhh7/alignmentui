'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, BarChart3, Bot, Briefcase, Compass, Cpu, Database, ExternalLink,
  LineChart, Link2, Megaphone, Search, ShieldCheck, ShoppingCart, Users, Wrench,
  X, type LucideIcon,
} from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { fetchWithRetry } from '@/lib/api'

type ResultType = 'module' | 'category' | 'brand'

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

const MODULE_RESULTS: SearchResult[] = [
  { id: 'module-explore', type: 'module', title: 'Explore', subtitle: 'Market categories, topics, brands, and citations', href: '/dashboard/explore', icon: Compass, badge: 'Beta', keywords: ['category', 'categories', 'topic', 'topics', 'brand', 'citation', 'leaderboard'], score: 0 },
  { id: 'module-ai-search', type: 'module', title: 'AI Search', subtitle: 'Analyze AI search visibility and answer surfaces', href: '/dashboard/ai-search', icon: BarChart3, badge: 'NEW', keywords: ['answer', 'visibility', 'search', 'chatgpt', 'perplexity'], score: 0 },
  { id: 'module-sources', type: 'module', title: 'Sources', subtitle: 'Citation source intelligence across AI answers', href: '/dashboard/sources', icon: Link2, badge: 'NEW', keywords: ['citation', 'source', 'domain', 'publisher'], score: 0 },
  { id: 'module-shopping', type: 'module', title: 'Shopping', subtitle: 'Product and category intelligence', href: '/dashboard/shopping', icon: ShoppingCart, badge: 'NEW', keywords: ['product', 'commerce', 'shop', 'category'], score: 0 },
  { id: 'module-ads', type: 'module', title: 'Ads', subtitle: 'Paid answer and AI ad intelligence', icon: Megaphone, disabled: true, badge: 'Coming soon', keywords: ['paid', 'advertising', 'media'], score: 0 },
  { id: 'module-gci', type: 'module', title: 'GCI', subtitle: 'Growth content intelligence', href: '/dashboard/gci', icon: Activity, keywords: ['content', 'growth'], score: 0 },
  { id: 'module-monitor', type: 'module', title: 'Monitoring', subtitle: 'Track prompts, competitors, mentions, and citations', href: '/dashboard/geo-monitor', icon: BarChart3, keywords: ['monitor', 'prompt', 'competitor', 'mention', 'fan-out'], score: 0 },
  { id: 'module-analysis', type: 'module', title: 'Analysis', subtitle: 'Cross-module reporting and decision support', href: '/dashboard/analysis', icon: LineChart, badge: 'NEW', keywords: ['report', 'analysis', 'insight'], score: 0 },
  { id: 'module-agent', type: 'module', title: 'Agent', subtitle: 'GEO content and AI assistant workflows', href: '/dashboard/geo-content', icon: Bot, keywords: ['content', 'agent', 'assistant'], score: 0 },
  { id: 'module-web-infra', type: 'module', title: 'Web Infrastructure', subtitle: 'GEO audit and technical readiness', href: '/dashboard/geo-audit', icon: ShieldCheck, keywords: ['audit', 'schema', 'technical', 'website'], score: 0 },
  { id: 'module-brand-hub', type: 'module', title: 'Brand Hub', subtitle: 'Brand and domain data management', href: '/dashboard/brand-hub', icon: Database, keywords: ['brand', 'domain', 'entity'], score: 0 },
  { id: 'module-visibility-proxy', type: 'module', title: 'Visibility Proxy', subtitle: 'AI crawler and proxy visibility infrastructure', href: '/dashboard/visibility-proxy', icon: ExternalLink, badge: 'NEW', keywords: ['proxy', 'crawler', 'bot', 'shopify'], score: 0 },
  { id: 'module-ga4', type: 'module', title: 'GA4 Attribution', subtitle: 'AI traffic and revenue attribution', href: '/dashboard/ga4-attribution', icon: LineChart, keywords: ['ga4', 'analytics', 'attribution', 'roi'], score: 0 },
  { id: 'module-mcp', type: 'module', title: 'MCP Integration', subtitle: 'Connect external MCP tools and agents', icon: Cpu, disabled: true, badge: 'Coming soon', keywords: ['mcp', 'integration', 'tool'], score: 0 },
  { id: 'module-distribute', type: 'module', title: 'GEO Distribute', subtitle: 'Distribute optimized content across channels', href: '/dashboard/geo-distribution', icon: ExternalLink, keywords: ['distribute', 'reddit', 'social', 'content'], score: 0 },
  { id: 'module-agentic-commerce', type: 'module', title: 'Agentic Commerce', subtitle: 'Commerce agent visibility and transactions', href: '/dashboard/agentic-commerce', icon: ShoppingCart, keywords: ['commerce', 'agentic', 'shopify', 'quote'], score: 0 },
  { id: 'module-customers', type: 'module', title: 'Customers', subtitle: 'Customer and workspace management', href: '/dashboard/admin/customers', icon: Briefcase, keywords: ['customer', 'workspace', 'client'], score: 0 },
  { id: 'module-managed-service', type: 'module', title: 'Managed Service', subtitle: 'Operations projects and client work', href: '/dashboard/ops', icon: Activity, keywords: ['ops', 'project', 'managed'], score: 0 },
  { id: 'module-admin', type: 'module', title: 'Admin Panel', subtitle: 'Internal admin tools', href: '/dashboard/admin', icon: Wrench, keywords: ['admin', 'token'], score: 0 },
  { id: 'module-domain-checker', type: 'module', title: 'Domain Checker', subtitle: 'Check domain readiness and ownership', href: '/dashboard/admin/domain-checker', icon: Search, keywords: ['domain', 'checker'], score: 0 },
  { id: 'module-team', type: 'module', title: 'Team Management', subtitle: 'Roles and staff permissions', href: '/dashboard/admin/team', icon: Users, keywords: ['team', 'staff', 'permission'], score: 0 },
]

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
  if (result.disabled) score -= 8
  return score
}

function groupLabel(type: ResultType): string {
  if (type === 'module') return 'Modules'
  if (type === 'category') return 'Explore categories'
  return 'Explore brands'
}

export default function DashboardGlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [remoteResults, setRemoteResults] = useState<SearchResult[]>([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
      if (event.key === 'Escape') setOpen(false)
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
    const syncInputValue = () => {
      const current = inputRef.current?.value ?? ''
      setQuery(prev => prev === current ? prev : current)
    }
    syncInputValue()
    const interval = window.setInterval(syncInputValue, 120)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      setRemoteResults([])
      setLoadingRemote(false)
      return
    }
    let cancelled = false
    const base = process.env.NEXT_PUBLIC_API_URL || ''
    const timer = window.setTimeout(() => {
      setLoadingRemote(true)
      fetchWithRetry(`${base}/api/global-search?q=${encodeURIComponent(q)}&limit=16`, {}, { timeoutMs: 6000, budgetMs: 12000 })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(data => {
          if (cancelled) return
          const next = (data?.results || []).map((result: SearchResult) => ({
            ...result,
            icon: result.type === 'category' ? Compass : undefined,
            keywords: result.keywords || [result.title, result.subtitle],
            score: 0,
          }))
          setRemoteResults(next)
        })
        .catch(() => {
          if (!cancelled) setRemoteResults([])
        })
        .finally(() => {
          if (!cancelled) setLoadingRemote(false)
        })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const results = useMemo(() => {
    const q = query.trim()
    const pool = [...MODULE_RESULTS, ...remoteResults]
    if (!q) return MODULE_RESULTS.slice(0, 8).map((r, idx) => ({ ...r, score: 80 - idx }))
    return pool
      .map(result => ({ ...result, score: scoreResult(result, q) }))
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 12)
  }, [remoteResults, query])

  useEffect(() => setActiveIndex(0), [query])

  const goTo = (result: SearchResult) => {
    if (result.disabled || !result.href) return
    setOpen(false)
    setQuery('')
    if (inputRef.current) inputRef.current.value = ''
    router.push(result.href)
  }

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true)
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
      if (event.key.length === 1) {
        setQuery(prev => `${prev}${event.key}`)
      } else if (event.key === 'Backspace') {
        setQuery(prev => prev.slice(0, -1))
      } else if (event.key === 'Delete') {
        setQuery('')
      }
      window.setTimeout(() => {
        const current = inputRef.current?.value ?? ''
        setQuery(prev => prev === current ? prev : current)
      }, 30)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, Math.max(0, results.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(prev => Math.max(0, prev - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const active = results[activeIndex]
      if (active) goTo(active)
    }
  }

  const grouped = results.reduce<Record<ResultType, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<ResultType, SearchResult[]>)

  return (
    <div ref={wrapperRef} className="relative w-full max-w-[560px]">
      <div
        data-global-search-trigger="true"
        className={`group relative flex h-10 items-center rounded-xl border bg-surface transition-all duration-200 hover:scale-[1.015] hover:border-ink-2 hover:shadow-sm ${
          open ? 'border-ink-2 shadow-sm' : 'border-divider-light'
        }`}
      >
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-ink-3 transition-colors group-hover:text-ink-2" />
        <input
          ref={inputRef}
          type="search"
          data-global-search-field="true"
          onChange={event => { setQuery(event.target.value); setOpen(true) }}
          onInput={event => { setQuery(event.currentTarget.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search Alignment..."
          className="h-full w-full bg-transparent pl-10 pr-20 text-[13px] text-ink placeholder:text-ink-3 focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ''
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute right-12 flex h-7 w-7 items-center justify-center rounded-lg text-ink-3 transition-all hover:scale-110 hover:bg-surface-muted hover:text-ink"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <span className="pointer-events-none absolute right-3 rounded-md border border-divider-light bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
          ⌘K
        </span>
      </div>

      {open && (
        <div
          data-global-search-results="true"
          className="absolute left-0 right-0 top-full z-[90] mt-2 overflow-hidden rounded-2xl border border-divider-light bg-surface shadow-elevation-lg"
        >
          <div className="max-h-[520px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] font-semibold text-ink">No results</p>
                <p className="mt-1 text-[12px] text-ink-3">Try a module, category, brand, or citation source.</p>
              </div>
            ) : (
              (['module', 'category', 'brand'] as ResultType[]).map(type => {
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
                        const Icon = result.icon
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(Math.max(0, absoluteIndex))}
                            onClick={() => goTo(result)}
                            disabled={result.disabled}
                            className={`flex min-h-[50px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all duration-150 ${
                              result.disabled
                                ? 'cursor-not-allowed opacity-55'
                                : 'cursor-pointer hover:scale-[1.01]'
                            } ${
                              active && !result.disabled ? 'bg-canvas shadow-sm' : 'hover:bg-canvas'
                            }`}
                          >
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-divider-light bg-surface">
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
                            {!result.disabled && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-ink-3" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {loadingRemote && (
            <div className="border-t border-divider-light px-4 py-2 text-[11px] font-medium text-ink-3">
              Searching Alignment...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
