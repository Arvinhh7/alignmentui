'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi, ProxyDomain, ProxyDomainStatus, ProxyAnalytics } from '@/lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  Globe, ArrowLeft, CheckCircle, Clock, RefreshCw, XCircle,
  Pause, AlertCircle, Loader2, ExternalLink, Copy, CheckCheck,
  BarChart3, Layers, Settings, Zap, Bot,
  TrendingUp, Activity, Download, FileText,
} from 'lucide-react'

import BrandDataTab from './BrandDataTab'

type Tab = 'overview' | 'assets' | 'analytics'

function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  active:           { label: 'Active',          color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: CheckCircle },
  pending:          { label: 'Pending DNS',      color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: Clock },
  dns_verifying:    { label: 'Verifying DNS',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: RefreshCw },
  ssl_provisioning: { label: 'Provisioning SSL', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: RefreshCw },
  paused:           { label: 'Paused',           color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     icon: Pause },
  error:            { label: 'Error',            color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: XCircle },
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
  lastSynced,
}: {
  domain: ProxyDomain
  status: ProxyDomainStatus | null
  onRefreshStatus: () => void
  refreshingStatus: boolean
  onSync: () => void
  syncing: boolean
  syncResult: string | null
  lastSynced: string | null
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
            {lastSynced && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                Last synced: {formatRelativeTime(lastSynced)}
              </p>
            )}
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

type TimeRange = { label: string; days: number }
const TIME_RANGES: TimeRange[] = [
  { label: 'Today',    days: 1  },
  { label: '7 days',   days: 7  },
  { label: '30 days',  days: 30 },
  { label: 'All time', days: 0  },
]

function exportCSV(analytics: ProxyAnalytics, rangeLabel: string) {
  const lines: string[] = []
  lines.push(`Alignment Visibility Analytics — ${analytics.domain}`)
  lines.push(`Period: ${rangeLabel}`)
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('Metric,Value')
  lines.push(`Total Requests,${analytics.total_requests}`)
  lines.push(`Confirmed AI Visits,${analytics.confirmed_ai_visits ?? analytics.total_ai_visits}`)
  lines.push(`Suspected AI Visits,${analytics.suspected_ai_visits ?? 0}`)
  lines.push(`AI Referral Visits,${analytics.ai_referral_visits}`)
  lines.push(`AI Ratio,${Math.round((analytics.ai_ratio ?? 0) * 100)}%`)
  lines.push(`llms.txt Hits,${analytics.discovery_hits?.llms_txt ?? 0}`)
  lines.push(`robots.txt Hits,${analytics.discovery_hits?.robots_txt ?? 0}`)
  lines.push(`agent.json Hits,${analytics.discovery_hits?.agent_json ?? 0}`)
  lines.push('')
  lines.push('## AI Bot Distribution')
  lines.push('Bot Name,Org,Visits,Confidence')
  for (const b of analytics.by_bot) {
    const conf = b.bot_name === 'UnknownBot' ? 'suspected' : 'confirmed'
    lines.push(`${b.bot_name},${b.bot_org ?? ''},${b.visit_count},${conf}`)
  }
  lines.push('')
  lines.push('## Top Crawled Pages')
  lines.push('Path,Visits')
  for (const p of analytics.by_path) {
    lines.push(`${p.path},${p.visit_count}`)
  }
  lines.push('')
  lines.push('## Daily Trend')
  lines.push('Date,Total,AI Visits,AI Referrals')
  for (const d of analytics.daily_trend ?? []) {
    lines.push(`${d.date},${d.total},${d.ai_visits},${d.ai_referrals}`)
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alignment-${analytics.domain}-${rangeLabel.replace(/[\s/]+/g, '-')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function buildSummaryText(analytics: ProxyAnalytics, rangeLabel: string): string {
  const confirmed = analytics.confirmed_ai_visits ?? analytics.total_ai_visits
  const suspected = analytics.suspected_ai_visits ?? 0
  const ratio = Math.round((analytics.ai_ratio ?? 0) * 100)
  const topBots = [...analytics.by_bot]
    .filter(b => b.bot_name !== 'UnknownBot')
    .slice(0, 3)
    .map(b => `${b.bot_name} (${b.visit_count})`)
    .join(', ')
  const dh = analytics.discovery_hits
  const discTotal = (dh?.llms_txt ?? 0) + (dh?.robots_txt ?? 0) + (dh?.agent_json ?? 0)
  return [
    `Alignment Visibility Report — ${analytics.domain}`,
    `Period: ${rangeLabel}`,
    ``,
    `Total Requests: ${analytics.total_requests.toLocaleString()}`,
    `Confirmed AI Visits: ${confirmed.toLocaleString()}${topBots ? ` (${topBots})` : ''}`,
    suspected > 0 ? `Suspected AI Visits: ${suspected.toLocaleString()} (UnknownBot)` : '',
    `AI Ratio: ${ratio}%`,
    `Discovery File Hits: ${discTotal} (llms.txt: ${dh?.llms_txt ?? 0}, robots.txt: ${dh?.robots_txt ?? 0}, agent.json: ${dh?.agent_json ?? 0})`,
  ].filter(Boolean).join('\n')
}

function AnalyticsTab({
  analytics, loading, days, onDaysChange, domain,
}: {
  analytics: ProxyAnalytics | null
  loading: boolean
  days: number
  onDaysChange: (d: number) => void
  domain: ProxyDomain | null
}) {
  const [copied, setCopied] = useState(false)

  const rangeLabel = (() => {
    if (days === 1) return 'Today'
    if (days === 0 && analytics?.date_range_days) {
      const since = new Date(Date.now() - analytics.date_range_days * 86400000)
      return `Since ${since.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return `Last ${days} days`
  })()

  const handleCopySummary = () => {
    if (!analytics) return
    navigator.clipboard.writeText(buildSummaryText(analytics, rangeLabel)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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

  const aiRatioPct = Math.round((analytics.ai_ratio ?? 0) * 100)
  const sortedBots = [...analytics.by_bot].sort((a, b) => b.visit_count - a.visit_count)
  const sortedPaths = [...analytics.by_path].sort((a, b) => b.visit_count - a.visit_count)
  const confirmedAi = analytics.confirmed_ai_visits ?? 0
  const suspectedAi = analytics.suspected_ai_visits ?? 0

  return (
    <div className="space-y-4">

      {/* Time range selector + Export toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {TIME_RANGES.map(r => (
            <button
              key={r.days}
              onClick={() => onDaysChange(r.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === r.days
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Show the resolved range label for all-time */}
          {days === 0 && analytics.date_range_days && (
            <span className="text-xs text-gray-400">{rangeLabel}</span>
          )}
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
            title="Copy summary for reports"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <FileText className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
          <button
            onClick={() => exportCSV(analytics, rangeLabel)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{(analytics.total_requests ?? 0).toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-0.5">all visitors</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Confirmed AI Hits</div>
          <div className="text-2xl font-bold text-indigo-600">{confirmedAi > 0 ? confirmedAi.toLocaleString() : analytics.total_ai_visits.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {confirmedAi > 0 ? `+${suspectedAi} suspected` : `${sortedBots.length} unique bots`}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">AI Ratio</div>
          <div className="text-2xl font-bold text-emerald-600">{aiRatioPct}%</div>
          <div className="text-xs text-gray-400 mt-0.5">{confirmedAi > 0 ? 'confirmed AI only' : 'of all traffic'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-xs text-gray-400 mb-1">Discovery Files</div>
          <div className="text-2xl font-bold text-amber-600">
            {((analytics.discovery_hits?.llms_txt ?? 0) + (analytics.discovery_hits?.robots_txt ?? 0) + (analytics.discovery_hits?.agent_json ?? 0)).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">llms / robots / agent</div>
        </div>
      </div>

      {/* P1: 置信度分层说明条（有 suspected 数据时显示）*/}
      {suspectedAi > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            <span className="text-xs font-medium text-gray-700">{confirmedAi.toLocaleString()} Confirmed</span>
            <span className="text-xs text-gray-400">(UA-matched AI bots)</span>
          </div>
          <span className="text-gray-300">·</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span className="text-xs font-medium text-gray-700">{suspectedAi.toLocaleString()} Suspected</span>
            <span className="text-xs text-gray-400">(behavioral heuristic, lower confidence)</span>
          </div>
        </div>
      )}

      {/* Row 2 — Daily Trend Chart */}
      {(analytics.daily_trend ?? []).length > 1 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Daily Traffic Trend
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={analytics.daily_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(l: string) => `Date: ${l}`}
              />
              <Line type="monotone" dataKey="total" stroke="#e5e7eb" strokeWidth={1.5} dot={false} name="Total" />
              <Line type="monotone" dataKey="ai_visits" stroke="#6366f1" strokeWidth={2} dot={false} name="AI Bots" />
              <Line type="monotone" dataKey="ai_referrals" stroke="#10b981" strokeWidth={2} dot={false} name="AI Referrals" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 justify-end">
            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-0.5 bg-gray-300 inline-block" />Total</span>
            <span className="flex items-center gap-1 text-xs text-indigo-500"><span className="w-3 h-0.5 bg-indigo-500 inline-block" />AI Bots</span>
            <span className="flex items-center gap-1 text-xs text-emerald-500"><span className="w-3 h-0.5 bg-emerald-500 inline-block" />AI Referrals</span>
          </div>
        </div>
      )}

      {/* Row 3 — Bot Breakdown + AI Referral Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Bot breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            AI Bot Distribution
          </h3>
          {sortedBots.length === 0 ? (
            <p className="text-xs text-gray-400">No bot visits yet</p>
          ) : (
            <div className="space-y-2">
              {sortedBots.map(bot => {
                const pct = analytics.total_ai_visits > 0
                  ? Math.round((bot.visit_count / analytics.total_ai_visits) * 100)
                  : 0
                const isSuspected = bot.bot_name === 'UnknownBot'
                return (
                  <div key={bot.bot_name} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-gray-700 truncate">{bot.bot_name}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isSuspected ? 'bg-amber-400' : 'bg-indigo-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 w-10 text-right">{bot.visit_count}</div>
                    {isSuspected
                      ? <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">suspected</span>
                      : <div className="text-xs text-gray-400 w-20 truncate">{bot.bot_org}</div>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AI Referral Sources */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            AI Referral Sources
          </h3>
          {(analytics.ai_referral_sources ?? []).length === 0 ? (
            <p className="text-xs text-gray-400">No AI-referred visitors yet</p>
          ) : (
            <div className="space-y-2">
              {[...(analytics.ai_referral_sources ?? [])].sort((a, b) => b.visit_count - a.visit_count).map(src => {
                const total = (analytics.ai_referral_visits ?? 1) || 1
                const pct = Math.round((src.visit_count / total) * 100)
                return (
                  <div key={src.source} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-medium text-gray-700 truncate">{src.source}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 w-10 text-right">{src.visit_count}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Discovery hits breakdown */}
          {analytics.discovery_hits && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
              <div className="text-xs text-gray-500 font-medium mb-2">Discovery File Hits</div>
              {[
                { label: 'llms.txt', value: analytics.discovery_hits.llms_txt },
                { label: 'robots.txt', value: analytics.discovery_hits.robots_txt },
                { label: 'agent.json', value: analytics.discovery_hits.agent_json },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="font-mono text-gray-500">{item.label}</span>
                  <span className="text-gray-700 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4 — Top Pages + Recent Visits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top crawled pages */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Crawled Pages</h3>
          {sortedPaths.length === 0 ? (
            <p className="text-xs text-gray-400">No page data yet</p>
          ) : (
            <div className="space-y-1.5">
              {sortedPaths.slice(0, 10).map(p => (
                <div key={p.path} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-600 truncate flex-1">{p.path}</span>
                  <span className="text-xs text-gray-400 ml-3 shrink-0">{p.visit_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent visits feed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Visits</h3>
          {analytics.recent_visits.length === 0 ? (
            <p className="text-xs text-gray-400">No visits yet</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {analytics.recent_visits.slice(0, 20).map((v, i) => (
                <div key={i} className="flex items-start gap-2 py-1 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-indigo-600">{String(v.bot_name ?? '—')}</span>
                      {v.bot_org != null && <span className="text-xs text-gray-400">· {String(v.bot_org)}</span>}
                    </div>
                    <div className="text-xs font-mono text-gray-500 truncate">{String(v.path ?? '—')}</div>
                  </div>
                  <div className="text-xs text-gray-300 shrink-0 whitespace-nowrap">
                    {v.timestamp ? new Date(String(v.timestamp)).toLocaleTimeString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {analytics.total_ai_visits === 0 && (analytics.total_requests ?? 0) === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <Bot className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No traffic recorded yet.</p>
          <p className="text-xs text-gray-300 mt-1">Once AI bots or visitors reach your domain, activity appears here.</p>
        </div>
      )}

      {/* Data source badge */}
      <div className="text-right">
        <span className="text-xs text-gray-300">
          Source: {analytics.data_source === 'analytics_engine' ? 'Cloudflare Analytics Engine' : 'Supabase (fallback)'}
        </span>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DomainDetailClient() {
  const params = useParams()
  const { user } = useAuth()

  // In static export mode the Cloudflare Worker serves placeholder/index.html
  // for ALL UUID paths (pathname = …/placeholder). Resolve the real domain ID
  // with three fallbacks in priority order:
  //   1. ?id= query param  — set by navigation Links from the domain list
  //   2. UUID from pathname — works when user loads the canonical UUID URL directly
  //   3. params.id         — fallback (may be 'placeholder' in static export)
  const rawId = params.id as string
  const domainId = (() => {
    if (typeof window === 'undefined') return rawId
    const qp = new URLSearchParams(window.location.search).get('id')
    if (qp) return qp
    const match = window.location.pathname.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    )
    return match ? match[0] : rawId
  })()

  const [domain, setDomain] = useState<ProxyDomain | null>(null)
  const [status, setStatus] = useState<ProxyDomainStatus | null>(null)
  const [analytics, setAnalytics] = useState<ProxyAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)  // 0=all time, 1=today, 7, 30
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  // Load last synced timestamp from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`proxy_last_synced_${domainId}`)
    if (stored) setLastSynced(stored)
  }, [domainId])

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

  const loadAnalytics = useCallback(async (days: number = analyticsDays) => {
    if (!user?.id) return
    setAnalyticsLoading(true)
    try {
      const a = await proxyApi.getAnalytics(domainId, user.id, days)
      setAnalytics(a)
    } catch { /* ignore */ }
    finally { setAnalyticsLoading(false) }
  }, [domainId, user?.id, analyticsDays])

  useEffect(() => { loadDomain() }, [loadDomain])

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics()
  }, [activeTab, loadAnalytics])

  // Re-fetch when time range changes (only if tab is already active)
  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics(analyticsDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsDays])

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
      const now = new Date().toISOString()
      setLastSynced(now)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`proxy_last_synced_${domainId}`, now)
      }
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
            lastSynced={lastSynced}
          />
        )}
        {activeTab === 'assets' && (
          <BrandDataTab domainId={domainId} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analytics={analytics}
            loading={analyticsLoading}
            days={analyticsDays}
            onDaysChange={setAnalyticsDays}
            domain={domain}
          />
        )}
      </div>
    </div>
  )
}
