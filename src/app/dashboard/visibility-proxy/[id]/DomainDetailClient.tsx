'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ProxyDomain, ProxyDomainStatus, ProxyAnalytics } from '@/lib/api'
import {
  Globe, ArrowLeft, CheckCircle, Clock, RefreshCw, XCircle,
  Pause, AlertCircle, Loader2, ExternalLink, Copy, CheckCheck,
  BarChart3, Layers, Settings, Zap, Bot, ArrowRight,
  TrendingUp, Activity,
} from 'lucide-react'

type Tab = 'overview' | 'assets' | 'analytics'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  active:           { label: 'Active',          color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: CheckCircle },
  pending:          { label: 'Pending DNS',      color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: Clock },
  dns_verifying:    { label: 'Verifying DNS',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: RefreshCw },
  ssl_provisioning: { label: 'Provisioning SSL', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: RefreshCw },
  paused:           { label: 'Paused',           color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     icon: Pause },
  error:            { label: 'Error',            color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: XCircle },
}

const MODULE_LABELS: Record<string, string> = {
  brand_identity:        'Brand Identity',
  products_services:     'Products & Services',
  faq_knowledge:         'FAQ Knowledge',
  data_authority:        'Data & Authority',
  competitive_positioning: 'Competitive Positioning',
  content_summaries:     'Content Summaries',
  ai_discovery_files:    'AI Discovery Files',
  technical_config:      'Technical Config',
  html_enhancement:      'HTML Enhancement',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 transition-colors">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  domain,
  status,
  onRefreshStatus,
  refreshingStatus,
  onSync,
  syncing,
  syncResult,
}: {
  domain: ProxyDomain
  status: ProxyDomainStatus | null
  onRefreshStatus: () => void
  refreshingStatus: boolean
  onSync: () => void
  syncing: boolean
  syncResult: string | null
}) {
  const cfg = STATUS_CONFIG[domain.status] ?? STATUS_CONFIG.pending
  const Icon = cfg.icon

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`border rounded-2xl p-5 ${cfg.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${cfg.color}`} />
            <div>
              <div className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</div>
              {domain.status !== 'active' && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Add the CNAME record below to activate your proxy
                </div>
              )}
              {domain.status === 'active' && (
                <div className="text-xs text-green-600 mt-0.5">
                  Proxy is live — AI bots are being served enhanced content
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onRefreshStatus}
            disabled={refreshingStatus}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* DNS Setup */}
      {domain.status !== 'active' && status && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">DNS Configuration Required</h3>
          <div className="bg-gray-950 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800 text-xs font-mono text-gray-500">CNAME Record</div>
            <div className="p-4 space-y-2 font-mono text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-14 flex-shrink-0">Type</span>
                <span className="text-green-400">CNAME</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-14 flex-shrink-0">Name</span>
                <span className="text-blue-300">{domain.domain}</span>
                <CopyButton text={domain.domain} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-14 flex-shrink-0">Target</span>
                <span className="text-yellow-300 text-xs break-all">{status.dns_cname_target}</span>
                <CopyButton text={status.dns_cname_target} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Domain info grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Domain</div>
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {domain.domain}
            {domain.status === 'active' && (
              <a href={`https://${domain.domain}/llms.txt`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-red-500 transition-colors" />
              </a>
            )}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Origin</div>
          <div className="text-sm font-semibold text-gray-900 truncate">{domain.origin_url}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">AI Bots</div>
          <div className={`text-sm font-semibold ${domain.robots_allow_all_ai ? 'text-green-600' : 'text-amber-500'}`}>
            {domain.robots_allow_all_ai ? 'All Allowed' : 'Restricted'}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">noindex Strip</div>
          <div className={`text-sm font-semibold ${domain.strip_noindex ? 'text-green-600' : 'text-gray-500'}`}>
            {domain.strip_noindex ? 'Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {/* Quick links */}
      {domain.status === 'active' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">AI Discovery Files</h3>
          <div className="space-y-2">
            {[
              { path: '/llms.txt', label: 'llms.txt', desc: 'AI language model discovery file' },
              { path: '/.well-known/agent.json', label: 'agent.json', desc: 'AI Agent Discovery Protocol' },
              { path: '/robots.txt', label: 'robots.txt', desc: 'AI-friendly bot access rules' },
            ].map(f => (
              <a
                key={f.path}
                href={`https://${domain.domain}${f.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <div>
                  <div className="text-sm font-mono font-medium text-gray-800">{f.label}</div>
                  <div className="text-xs text-gray-400">{f.desc}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sync to KV */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Sync to Edge Network</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Push your latest brand data to Cloudflare KV. Changes take effect within ~60 seconds.
            </p>
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        {syncResult && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
            {syncResult}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab({ analytics, loading }: { analytics: ProxyAnalytics | null; loading: boolean }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  )

  if (!analytics) return (
    <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
      <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-400">No analytics data yet</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total AI Visits</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.total_ai_visits.toLocaleString()}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Unique Bots</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.by_bot.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Crawled Pages</div>
          <div className="text-2xl font-bold text-gray-900">{analytics.by_path.length}</div>
        </div>
      </div>

      {/* Bot breakdown */}
      {analytics.by_bot.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            AI Bot Breakdown
          </h3>
          <div className="space-y-2">
            {analytics.by_bot.sort((a, b) => b.visit_count - a.visit_count).map(bot => {
              const pct = analytics.total_ai_visits > 0
                ? Math.round((bot.visit_count / analytics.total_ai_visits) * 100)
                : 0
              return (
                <div key={bot.bot_name} className="flex items-center gap-3">
                  <div className="w-24 text-xs font-medium text-gray-700 truncate">{bot.bot_name}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 w-10 text-right">{bot.visit_count}</div>
                  {bot.bot_org && <div className="text-xs text-gray-400 w-20 truncate">{bot.bot_org}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top pages */}
      {analytics.by_path.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Top Crawled Pages
          </h3>
          <div className="space-y-2">
            {analytics.by_path.sort((a, b) => b.visit_count - a.visit_count).slice(0, 10).map(p => (
              <div key={p.path} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <span className="text-sm font-mono text-gray-600 truncate flex-1">{p.path}</span>
                <span className="text-xs text-gray-500 ml-4">{p.visit_count} visits</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent visits */}
      {analytics.recent_visits.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Recent Visits
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Bot</th>
                  <th className="text-left pb-2 font-medium">Path</th>
                  <th className="text-left pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analytics.recent_visits.slice(0, 20).map((v, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-700">{String(v.bot_name ?? '—')}</td>
                    <td className="py-2 pr-4 font-mono text-gray-500">{String(v.path ?? '—')}</td>
                    <td className="py-2 text-gray-400">
                      {v.timestamp ? new Date(String(v.timestamp)).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analytics.total_ai_visits === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <Bot className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No AI visits recorded yet.</p>
          <p className="text-xs text-gray-300 mt-1">Once AI bots crawl your domain, activity appears here.</p>
        </div>
      )}
    </div>
  )
}

// ── Assets Summary Tab ───────────────────────────────────────────────────────
function AssetsSummaryTab({ domainId, userId }: { domainId: string; userId: string }) {
  const [assets, setAssets] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    proxyApi.getAssets(domainId, userId).then(data => {
      setAssets(data.assets as Record<string, unknown>)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [domainId, userId])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
    </div>
  )

  const modules = Object.keys(MODULE_LABELS) as (keyof typeof MODULE_LABELS)[]

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href={`/dashboard/visibility-proxy/${domainId}/assets`}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Layers className="w-4 h-4" />
          Edit All Modules
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {modules.map(mod => {
          const filled = assets && mod in assets
          return (
            <Link
              key={mod}
              href={`/dashboard/visibility-proxy/${domainId}/assets#${mod}`}
              className="flex items-center justify-between bg-white border border-gray-200 hover:border-red-300 rounded-2xl p-4 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${filled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium text-gray-700">{MODULE_LABELS[mod]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${filled ? 'text-green-600' : 'text-gray-400'}`}>
                  {filled ? 'Configured' : 'Empty'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DomainDetailClient() {
  const params = useParams()
  const domainId = params.id as string
  const { user } = useAuth()

  const [domain, setDomain] = useState<ProxyDomain | null>(null)
  const [status, setStatus] = useState<ProxyDomainStatus | null>(null)
  const [analytics, setAnalytics] = useState<ProxyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const loadDomain = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const [d, s] = await Promise.all([
        proxyApi.getDomain(domainId, user.id),
        proxyApi.getDomainStatus(domainId, user.id),
      ])
      setDomain(d)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load domain')
    } finally {
      setLoading(false)
    }
  }, [domainId, user?.id])

  const loadAnalytics = useCallback(async () => {
    if (!user?.id) return
    setAnalyticsLoading(true)
    try {
      const a = await proxyApi.getAnalytics(domainId, user.id)
      setAnalytics(a)
    } catch { /* ignore */ }
    finally { setAnalyticsLoading(false) }
  }, [domainId, user?.id])

  useEffect(() => { loadDomain() }, [loadDomain])

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, loadAnalytics])

  const refreshStatus = async () => {
    if (!user?.id) return
    setRefreshingStatus(true)
    try {
      const s = await proxyApi.getDomainStatus(domainId, user.id)
      setStatus(s)
      const d = await proxyApi.getDomain(domainId, user.id)
      setDomain(d)
    } catch { /* ignore */ }
    finally { setRefreshingStatus(false) }
  }

  const handleSync = async () => {
    if (!user?.id) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await proxyApi.sync(domainId, user.id)
      setSyncResult(result.message)
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  if (error || !domain) return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-red-700">Failed to load domain</div>
          <div className="text-sm text-red-600 mt-1">{error}</div>
          <Link href="/dashboard/visibility-proxy" className="text-xs text-red-500 hover:underline mt-2 inline-block">← Back to domains</Link>
        </div>
      </div>
    </div>
  )

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview',  label: 'Overview',  icon: Settings },
    { key: 'assets',    label: 'Brand Data', icon: Layers },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/visibility-proxy" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{domain.domain}</h1>
            <p className="text-sm text-gray-400">{domain.origin_url}</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            domain={domain}
            status={status}
            onRefreshStatus={refreshStatus}
            refreshingStatus={refreshingStatus}
            onSync={handleSync}
            syncing={syncing}
            syncResult={syncResult}
          />
        )}
        {activeTab === 'assets' && user?.id && (
          <AssetsSummaryTab domainId={domainId} userId={user.id} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} loading={analyticsLoading} />
        )}
      </div>
    </div>
  )
}
