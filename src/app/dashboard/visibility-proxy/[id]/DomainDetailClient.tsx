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

// Official platform metadata — maps bot_name / referral source → canonical display name + favicon domain
// Covers all 58 global AI platforms (USA·China·France·Germany·Korea·Russia·Browser)
const PLATFORM_META: Record<string, { name: string; domain: string }> = {
  // ── OpenAI / ChatGPT ──────────────────────────────────────────────────────
  'GPTBot':              { name: 'ChatGPT',     domain: 'openai.com' },
  'ChatGPT-User':        { name: 'ChatGPT',     domain: 'openai.com' },
  'ChatGPT':             { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'OAI-Search':          { name: 'SearchGPT',   domain: 'openai.com' },
  'OAI-SearchBot':       { name: 'SearchGPT',   domain: 'openai.com' },
  // ── Anthropic / Claude ────────────────────────────────────────────────────
  'ClaudeBot':           { name: 'Claude',      domain: 'anthropic.com' },
  'Claude-Web':          { name: 'Claude',      domain: 'anthropic.com' },
  'Anthropic':           { name: 'Claude',      domain: 'anthropic.com' },
  'anthropic-ai':        { name: 'Claude',      domain: 'anthropic.com' },
  'Claude':              { name: 'Claude',      domain: 'claude.ai' },
  // ── Google / Gemini ───────────────────────────────────────────────────────
  'Google-Extended':     { name: 'Gemini',      domain: 'gemini.google.com' },
  'GeminiBot':           { name: 'Gemini',      domain: 'gemini.google.com' },
  'Gemini':              { name: 'Gemini',      domain: 'gemini.google.com' },
  'Googlebot':           { name: 'Google',      domain: 'google.com' },
  'GoogleOther':         { name: 'Google',      domain: 'google.com' },
  // ── Perplexity ────────────────────────────────────────────────────────────
  'PerplexityBot':       { name: 'Perplexity',  domain: 'perplexity.ai' },
  'Perplexity':          { name: 'Perplexity',  domain: 'perplexity.ai' },
  // ── Microsoft / Copilot ───────────────────────────────────────────────────
  'Bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'BingPreview':         { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Copilot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Bing AI':             { name: 'Bing AI',     domain: 'bing.com' },
  // ── Meta AI ───────────────────────────────────────────────────────────────
  'Meta-Agent':          { name: 'Meta AI',     domain: 'meta.ai' },
  'FacebookBot':         { name: 'Meta AI',     domain: 'meta.ai' },
  'meta-externalagent':  { name: 'Meta AI',     domain: 'meta.ai' },
  'Meta AI':             { name: 'Meta AI',     domain: 'meta.ai' },
  // ── Apple ─────────────────────────────────────────────────────────────────
  'Applebot-Ext':        { name: 'Apple',       domain: 'apple.com' },
  'Applebot':            { name: 'Apple',       domain: 'apple.com' },
  // ── xAI / Grok ────────────────────────────────────────────────────────────
  'Grok':                { name: 'Grok',        domain: 'x.ai' },
  'xAI':                 { name: 'Grok',        domain: 'x.ai' },
  // ── Cohere ────────────────────────────────────────────────────────────────
  'Cohere':              { name: 'Cohere',      domain: 'cohere.com' },
  'cohere-ai':           { name: 'Cohere',      domain: 'cohere.com' },
  // ── You.com ───────────────────────────────────────────────────────────────
  'YouBot':              { name: 'You.com',     domain: 'you.com' },
  'You.com':             { name: 'You.com',     domain: 'you.com' },
  // ── Brave ─────────────────────────────────────────────────────────────────
  'Brave-Search':        { name: 'Brave',       domain: 'search.brave.com' },
  'Brave':               { name: 'Brave',       domain: 'search.brave.com' },
  // ── Amazon ────────────────────────────────────────────────────────────────
  'Amazonbot':           { name: 'Amazon',      domain: 'amazon.com' },
  // ── DuckDuckGo ────────────────────────────────────────────────────────────
  'DuckDuckBot':         { name: 'DuckDuckGo',  domain: 'duckduckgo.com' },
  'DuckDuckGo':          { name: 'DuckDuckGo',  domain: 'duckduckgo.com' },
  // ── Mistral AI ────────────────────────────────────────────────────────────
  'MistralBot':          { name: 'Mistral AI',  domain: 'mistral.ai' },
  'Mistral AI':          { name: 'Mistral AI',  domain: 'mistral.ai' },
  'Le Chat':             { name: 'Mistral AI',  domain: 'mistral.ai' },
  // ── Common Crawl ──────────────────────────────────────────────────────────
  'CCBot':               { name: 'CommonCrawl', domain: 'commoncrawl.org' },
  // ── Kagi ──────────────────────────────────────────────────────────────────
  'KagiBot':             { name: 'Kagi',        domain: 'kagi.com' },
  'Kagi':                { name: 'Kagi',        domain: 'kagi.com' },
  // ── Phind ─────────────────────────────────────────────────────────────────
  'Phind':               { name: 'Phind',       domain: 'phind.com' },
  // ── Inflection AI (Pi) ────────────────────────────────────────────────────
  'Pi':                  { name: 'Pi',          domain: 'pi.ai' },
  'Inflection-AI':       { name: 'Pi',          domain: 'pi.ai' },
  // ── Writer.ai ─────────────────────────────────────────────────────────────
  'Writer':              { name: 'Writer',      domain: 'writer.com' },
  'WriterBot':           { name: 'Writer',      domain: 'writer.com' },
  // ── Arc Browser ───────────────────────────────────────────────────────────
  'Arc Browser':         { name: 'Arc Browser', domain: 'arc.net' },

  // ── ByteDance / Doubao ────────────────────────────────────────────────────
  'Bytespider':          { name: 'Doubao',      domain: 'doubao.com' },
  'Doubao':              { name: 'Doubao',      domain: 'doubao.com' },
  // ── DeepSeek ──────────────────────────────────────────────────────────────
  'DeepSeekBot':         { name: 'DeepSeek',    domain: 'deepseek.com' },
  'DeepSeek':            { name: 'DeepSeek',    domain: 'deepseek.com' },
  // ── Moonshot AI / Kimi ────────────────────────────────────────────────────
  'MoonshotBot':         { name: 'Kimi',        domain: 'kimi.moonshot.cn' },
  'Kimi':                { name: 'Kimi',        domain: 'kimi.moonshot.cn' },
  // ── Alibaba / Tongyi (Qwen) ───────────────────────────────────────────────
  'Qwen':                { name: 'Tongyi',      domain: 'tongyi.aliyun.com' },
  'Tongyi':              { name: 'Tongyi',      domain: 'tongyi.aliyun.com' },
  // ── Baidu AI ──────────────────────────────────────────────────────────────
  'BaiduBot':            { name: 'Baidu AI',    domain: 'baidu.com' },
  'Baiduspider':         { name: 'Baidu AI',    domain: 'baidu.com' },
  'Baidu AI':            { name: 'Baidu AI',    domain: 'baidu.com' },
  // ── Tencent / Hunyuan ─────────────────────────────────────────────────────
  'Hunyuan':             { name: 'Hunyuan',     domain: 'hunyuan.tencent.com' },
  // ── iFlytek / Xinghuo ─────────────────────────────────────────────────────
  'SparkBot':            { name: 'Xinghuo',     domain: 'xinghuo.xfyun.cn' },
  'Xinghuo':             { name: 'Xinghuo',     domain: 'xinghuo.xfyun.cn' },
  // ── Zhipu AI (ChatGLM) ────────────────────────────────────────────────────
  'ZhipuAI':             { name: 'Zhipu AI',    domain: 'zhipuai.cn' },
  'Zhipu AI':            { name: 'Zhipu AI',    domain: 'zhipuai.cn' },
  // ── 360 AI ────────────────────────────────────────────────────────────────
  '360 AI':              { name: '360 AI',      domain: 'so.com' },
  // ── Baichuan AI ───────────────────────────────────────────────────────────
  'Baichuan':            { name: 'Baichuan',    domain: 'baichuan-ai.com' },
  // ── MiniMax ───────────────────────────────────────────────────────────────
  'MiniMax':             { name: 'MiniMax',     domain: 'minimax.chat' },

  // ── Naver / Clova X (Korea) ───────────────────────────────────────────────
  'Yeti':                { name: 'Clova X',     domain: 'clova.ai' },
  'Clova X':             { name: 'Clova X',     domain: 'clova.ai' },
  // ── Kakao i (Korea) ───────────────────────────────────────────────────────
  'DaumBot':             { name: 'Kakao i',     domain: 'kakao.com' },
  'Kakao i':             { name: 'Kakao i',     domain: 'kakao.com' },

  // ── Yandex AI (Russia) ────────────────────────────────────────────────────
  'YandexBot':           { name: 'Yandex AI',   domain: 'yandex.ru' },
  'Yandex AI':           { name: 'Yandex AI',   domain: 'yandex.ru' },
  // ── Sber / GigaChat (Russia) ──────────────────────────────────────────────
  'SberBot':             { name: 'GigaChat',    domain: 'sber.ru' },
  'GigaChat':            { name: 'GigaChat',    domain: 'sber.ru' },

  // ── DeepL (Germany) ───────────────────────────────────────────────────────
  'DeepLBot':            { name: 'DeepL',       domain: 'deepl.com' },
  'DeepL':               { name: 'DeepL',       domain: 'deepl.com' },
}

function getPlatformMeta(key: string): { name: string; domain: string } {
  return PLATFORM_META[key] ?? { name: key, domain: '' }
}

function PlatformLogo({ id, size = 16 }: { id: string; size?: number }) {
  const meta = getPlatformMeta(id)
  if (!meta.domain) return null
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${meta.domain}&sz=32`}
      alt={meta.name}
      width={size}
      height={size}
      className="rounded-sm shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

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

  // ── Sidebar (always visible) ───────────────────────────────
  const Sidebar = (
    <div className="space-y-4 w-full">
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">What These Numbers Mean</h3>
        <ul className="space-y-2.5 text-xs text-gray-500">
          <li><span className="font-medium text-gray-700">AI Visits</span> — AI platforms like ChatGPT, Claude, and Perplexity regularly scan your site&apos;s AI profile to learn your brand, products, and FAQ.</li>
          <li><span className="font-medium text-gray-700">AI Referral</span> — When an AI platform recommends your site and a real visitor clicks through, that counts as an AI referral.</li>
          <li>Numbers update in real time — more visits = more AI awareness of your brand.</li>
        </ul>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Improve Your AI Discoverability</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          <li className="flex gap-2"><span className="text-green-500 shrink-0">•</span>Add more FAQ pairs — direct answers increase AI citation frequency</li>
          <li className="flex gap-2"><span className="text-green-500 shrink-0">•</span>Keep Brand Story and Products up to date — AI platforms re-crawl regularly</li>
          <li className="flex gap-2"><span className="text-green-500 shrink-0">•</span>Add key metrics and awards — AI uses authoritative signals to recommend brands</li>
        </ul>
      </div>
    </div>
  )

  if (!analytics) return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No analytics data yet</p>
          <p className="text-xs text-gray-400 mt-1">Most sites see their first AI crawl within 24–72 hours of completing setup.</p>
        </div>
      </div>
      <div className="w-64 shrink-0 hidden lg:block">{Sidebar}</div>
    </div>
  )

  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + (analytics.ai_referral_visits ?? 0)
  // Filter out UnknownBot — unidentified traffic with no official logo/name
  const namedBots = [...analytics.by_bot]
    .filter(b => b.bot_name !== 'UnknownBot')
    .sort((a, b) => b.visit_count - a.visit_count)
  const referralSources = [...(analytics.ai_referral_sources ?? [])].sort((a, b) => b.visit_count - a.visit_count)
  const referralLandingPages = [...(analytics.top_referral_landing_pages ?? [])].sort((a, b) => b.visit_count - a.visit_count)

  // AI Platform Intelligence: merge bots + referrals by canonical platform name
  const platformMap: Record<string, { crawls: number; referrals: number }> = {}
  namedBots.forEach(b => {
    const key = getPlatformMeta(b.bot_name).name
    if (!platformMap[key]) platformMap[key] = { crawls: 0, referrals: 0 }
    platformMap[key].crawls += b.visit_count
  })
  referralSources.forEach(s => {
    const key = getPlatformMeta(s.source).name
    if (!platformMap[key]) platformMap[key] = { crawls: 0, referrals: 0 }
    platformMap[key].referrals += s.visit_count
  })
  const platformIntel = Object.entries(platformMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.crawls + b.referrals) - (a.crawls + a.referrals))

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-4">

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
            {days === 0 && analytics.date_range_days && (
              <span className="text-xs text-gray-400">{rangeLabel}</span>
            )}
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <FileText className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </button>
            <button
              onClick={() => exportCSV(analytics, rangeLabel)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Row 1 — 3 KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">TOTAL AI TRAFFIC</div>
            <div className="text-2xl font-bold text-gray-900">{totalAiTraffic.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-0.5">bot visits + referrals</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">AI VISITS</div>
            <div className="text-2xl font-bold text-indigo-600">
              {(analytics.total_ai_visits ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">AI crawlers read your profile</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="text-xs text-gray-400 mb-1">AI REFERRAL</div>
            <div className="text-2xl font-bold text-emerald-600">
              {(analytics.ai_referral_visits ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">clicks from AI platforms</div>
          </div>
        </div>

        {/* Traffic Trend */}
        {(analytics.daily_trend ?? []).length > 1 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Traffic Trend
            </h3>
            <p className="text-xs text-gray-400 mb-3">Showing {rangeLabel.toLowerCase()}</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={analytics.daily_trend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelFormatter={(l: string) => `Date: ${l}`} />
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

        {/* AI Platforms Reading Your Store */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            AI Platforms Reading Your Store
          </h3>
          <p className="text-xs text-gray-400 mb-3">AI platforms that scanned your site&apos;s AI profile — {rangeLabel.toLowerCase()}.</p>
          {namedBots.length === 0 ? (
            <p className="text-xs text-gray-400">Data appears once AI bots start visiting your site. Most sites see their first crawl within 24–72 hours of completing setup.</p>
          ) : (
            <div className="space-y-2.5">
              {namedBots.map(bot => {
                const meta = getPlatformMeta(bot.bot_name)
                const pct = analytics.total_ai_visits > 0 ? Math.round((bot.visit_count / analytics.total_ai_visits) * 100) : 0
                return (
                  <div key={bot.bot_name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <PlatformLogo id={bot.bot_name} size={16} />
                      <span className="text-xs font-medium text-gray-700 truncate">{meta.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 w-8 text-right">{bot.visit_count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* AI Platforms Sending You Traffic */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" />
              AI Platforms Sending You Traffic
            </h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              Total AI referrals — {rangeLabel.toLowerCase()}: {(analytics.ai_referral_visits ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">Visitors who arrived at your site after an AI platform recommended you.</p>
          {referralSources.length === 0 ? (
            <p className="text-xs text-gray-400">Referral data appears once AI platforms start sending visitors to your site. This typically follows after bots have indexed your brand profile.</p>
          ) : (
            <div className="space-y-2.5">
              {referralSources.map(src => {
                const meta = getPlatformMeta(src.source)
                const total = (analytics.ai_referral_visits ?? 1) || 1
                const pct = Math.round((src.visit_count / total) * 100)
                return (
                  <div key={src.source} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <PlatformLogo id={src.source} size={16} />
                      <span className="text-xs font-medium text-gray-700 truncate">{meta.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-gray-500 w-8 text-right">{src.visit_count}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Landing Pages from AI Referrals */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top Landing Pages from AI Referrals</h3>
          <p className="text-xs text-gray-400 mb-3">Pages on your site receiving the most AI-referred visitors — {rangeLabel.toLowerCase()}.</p>
          {referralLandingPages.length === 0 ? (
            <p className="text-xs text-gray-400">Landing page data appears once AI platforms start sending visitors to your site.</p>
          ) : (
            <div className="space-y-1.5">
              {referralLandingPages.map(p => (
                <div key={p.path} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-mono text-gray-600 truncate flex-1">{p.path}</span>
                  <span className="text-xs text-gray-400 ml-3 shrink-0">{p.visit_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Platform Intelligence */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400" />
            AI Platform Intelligence
          </h3>
          <p className="text-xs text-gray-400 mb-3">How each AI platform interacts with your site — {rangeLabel.toLowerCase()}.</p>
          {platformIntel.length === 0 ? (
            <p className="text-xs text-gray-400">Platform intelligence appears once AI bots start visiting your site.</p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-xs text-gray-400 font-medium pb-2 border-b border-gray-100">
                <span>Platform</span>
                <span className="text-center">Crawls</span>
                <span className="text-center">Referrals</span>
              </div>
              {platformIntel.map(p => {
                const meta = getPlatformMeta(p.name)
                return (
                  <div key={p.name} className="grid grid-cols-3 text-xs py-2 border-b border-gray-50 last:border-0 items-center">
                    <div className="flex items-center gap-2">
                      <PlatformLogo id={p.name} size={14} />
                      <span className="font-medium text-gray-700 truncate">{meta.name}</span>
                    </div>
                    <span className="text-center text-indigo-600 font-medium">{p.crawls > 0 ? p.crawls.toLocaleString() : '—'}</span>
                    <span className="text-center text-emerald-600 font-medium">{p.referrals > 0 ? p.referrals.toLocaleString() : '—'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Data source badge */}
        <div className="text-right">
          <span className="text-xs text-gray-300">
            Source: {analytics.data_source === 'analytics_engine' ? 'Cloudflare Analytics Engine' : 'Supabase (fallback)'}
          </span>
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <div className="w-64 shrink-0 hidden lg:block">{Sidebar}</div>
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
