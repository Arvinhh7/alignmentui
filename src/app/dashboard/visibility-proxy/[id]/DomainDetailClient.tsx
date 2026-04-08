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
  TrendingUp, Activity, Download, FileText, Save, Wrench, ChevronRight,
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

// ── Technical Config (used inside Overview Tab) ───────────────────────────────

function ToggleRow({
  label,
  desc,
  value,
  onChange,
  warning,
  disabled,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
  warning?: string
  disabled?: boolean
}) {
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <div className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
        </div>
        <button
          type="button"
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          } ${value ? 'bg-red-500' : 'bg-gray-200'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {warning && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {warning}
        </div>
      )}
    </div>
  )
}

function TechnicalConfigSection({
  domain,
  userId,
  onDomainUpdate,
}: {
  domain: ProxyDomain
  userId: string
  onDomainUpdate: (d: ProxyDomain) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [cfg, setCfg] = useState({
    strip_noindex: domain.strip_noindex,
    inject_canonical: domain.inject_canonical,
    robots_allow_all_ai: domain.robots_allow_all_ai,
    date_modified_auto: domain.date_modified_auto,
    bypass_paywall: domain.bypass_paywall,
    prerender_csr: domain.prerender_csr,
    custom_robots_rules: domain.custom_robots_rules,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const toggle = (key: keyof typeof cfg, value: boolean) =>
    setCfg(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await proxyApi.updateDomain(domain.id, userId, cfg)
      onDomainUpdate(updated)
      setSaved(true)
      setIsOpen(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Technical Config</span>
          <span className="text-xs text-gray-400 ml-1">Proxy behavior flags</span>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="divide-y divide-gray-100 mt-3">
            <ToggleRow
              label="Strip noindex for AI"
              desc="Remove noindex meta tags when AI bots visit"
              value={cfg.strip_noindex}
              onChange={v => toggle('strip_noindex', v)}
            />
            <ToggleRow
              label="Inject Canonical Tag"
              desc='Add <link rel="canonical"> pointing to your domain'
              value={cfg.inject_canonical}
              onChange={v => toggle('inject_canonical', v)}
            />
            <ToggleRow
              label="Allow All AI Bots in robots.txt"
              desc="Generate AI-friendly robots.txt allowing 34+ known bots"
              value={cfg.robots_allow_all_ai}
              onChange={v => toggle('robots_allow_all_ai', v)}
            />
            <ToggleRow
              label="Auto-inject dateModified"
              desc="Inject current timestamp as JSON-LD dateModified"
              value={cfg.date_modified_auto}
              onChange={v => toggle('date_modified_auto', v)}
            />
            <ToggleRow
              label="Bypass Paywall for AI"
              desc="Serve full content to AI bots (requires written authorization)"
              value={cfg.bypass_paywall}
              onChange={v => toggle('bypass_paywall', v)}
              warning={cfg.bypass_paywall ? 'This may conflict with your content distribution agreements. Ensure you have written authorization before enabling.' : undefined}
            />
            <ToggleRow
              label="Pre-render CSR Pages"
              desc="Serve server-side rendered HTML to AI crawlers — coming soon"
              value={cfg.prerender_csr}
              onChange={v => toggle('prerender_csr', v)}
              disabled
              warning={cfg.prerender_csr ? 'Adds latency to every AI bot request. Test on staging first.' : undefined}
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-600">Custom robots.txt Rules</label>
            <p className="text-xs text-gray-400 mt-0.5 mb-1.5">
              Appended to the generated robots.txt. Overrides &quot;Allow All AI Bots&quot; for matching User-agents.
            </p>
            <textarea
              value={cfg.custom_robots_rules}
              onChange={e => setCfg(prev => ({ ...prev, custom_robots_rules: e.target.value }))}
              rows={3}
              placeholder={'# Additional rules\nUser-agent: *\nDisallow: /private/'}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 resize-y"
            />
          </div>

          {saveError && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Config'}
            </button>
          </div>
        </div>
      )}
    </div>
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
  userId,
  onDomainUpdate,
}: {
  domain: ProxyDomain
  status: ProxyDomainStatus | null
  onRefreshStatus: () => void
  refreshingStatus: boolean
  onSync: () => void
  syncing: boolean
  syncResult: string | null
  lastSynced: string | null
  userId: string
  onDomainUpdate: (d: ProxyDomain) => void
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

      {/* Technical Config */}
      <TechnicalConfigSection
        domain={domain}
        userId={userId}
        onDomainUpdate={onDomainUpdate}
      />

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
  // ── OpenAI / ChatGPT (all OpenAI bots merge under "ChatGPT") ────────────
  'GPTBot':              { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'ChatGPT-User':        { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'ChatGPT':             { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'OAI-Search':          { name: 'ChatGPT',     domain: 'chatgpt.com' },
  'OAI-SearchBot':       { name: 'ChatGPT',     domain: 'chatgpt.com' },
  // ── Anthropic / Claude ────────────────────────────────────────────────────
  'ClaudeBot':           { name: 'Claude',      domain: 'claude.ai' },
  'Claude-Web':          { name: 'Claude',      domain: 'claude.ai' },
  'Anthropic':           { name: 'Claude',      domain: 'claude.ai' },
  'anthropic-ai':        { name: 'Claude',      domain: 'claude.ai' },
  'Claude':              { name: 'Claude',      domain: 'claude.ai' },
  // ── Google / Gemini (all Google AI bots → "Gemini") ──────────────────────
  // Consistent with Shopify App: GoogleOther, Google-Extended, Gemini all
  // belong to "Google Gemini" AI platform.
  'Google-Extended':     { name: 'Gemini',      domain: 'gemini.google.com' },
  'GeminiBot':           { name: 'Gemini',      domain: 'gemini.google.com' },
  'Gemini':              { name: 'Gemini',      domain: 'gemini.google.com' },
  'Googlebot':           { name: 'Gemini',      domain: 'gemini.google.com' },
  'GoogleOther':         { name: 'Gemini',      domain: 'gemini.google.com' },
  // ── Perplexity ────────────────────────────────────────────────────────────
  'PerplexityBot':       { name: 'Perplexity',  domain: 'perplexity.ai' },
  'Perplexity':          { name: 'Perplexity',  domain: 'perplexity.ai' },
  // ── Microsoft / Copilot ───────────────────────────────────────────────────
  'Bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'bingbot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'BingPreview':         { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Copilot':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
  'Bing AI':             { name: 'Copilot',     domain: 'copilot.microsoft.com' },
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

  // ── Canonical-name shortcuts (for merged display lookup) ──────────────────
  // These allow getPlatformMeta(canonicalName) to resolve logo domains
  // when "AI Platforms Reading Your Store" groups by canonical name.
  'Apple':               { name: 'Apple',        domain: 'apple.com' },
  'Amazon':              { name: 'Amazon',       domain: 'amazon.com' },
  'CommonCrawl':         { name: 'CommonCrawl',  domain: 'commoncrawl.org' },
  'SearchGPT':           { name: 'ChatGPT',      domain: 'chatgpt.com' },

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
  { label: 'Last 24h',    days: 1  },
  { label: 'Last 7 days', days: 7  },
  { label: 'Last 30 days',days: 30 },
  { label: 'All time',    days: 0  },
]

function buildPlatformIntel(analytics: ProxyAnalytics) {
  const map: Record<string, { crawls: number; referrals: number }> = {}
  const namedBots = analytics.by_bot.filter(b => b.bot_name !== 'UnknownBot')
  namedBots.forEach(b => {
    const key = getPlatformMeta(b.bot_name).name
    if (!map[key]) map[key] = { crawls: 0, referrals: 0 }
    map[key].crawls += b.visit_count
  })
  ;(analytics.ai_referral_sources ?? []).forEach(s => {
    const key = getPlatformMeta(s.source).name
    if (!map[key]) map[key] = { crawls: 0, referrals: 0 }
    map[key].referrals += s.visit_count
  })
  return Object.entries(map)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => (b.crawls + b.referrals) - (a.crawls + a.referrals))
}

// ── Page path helpers ─────────────────────────────────────────────────────────

// Technical / internal paths that should never appear in "pages AI read"
const TECHNICAL_PATH_RE = [
  /^\/sitemap/i,          // sitemap.xml, sitemap_*.xml, etc.
  /^\/robots\.txt$/i,
  /^\/llms/i,             // llms.txt, llms-full.txt
  /^\/meta\.json$/i,
  /^\/api\//i,            // /api/jsonld and any other API routes
  /^\/.well-known\//i,
  /^\/cdn-cgi\//i,
]

function isHumanPagePath(path: string): boolean {
  return !TECHNICAL_PATH_RE.some(re => re.test(path))
}

function slugToTitle(slug: string): string {
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface PageInfo {
  name: string
  type: 'home' | 'product' | 'collection' | 'page' | 'blog' | 'other'
  badge: string
}

function pathToPageInfo(path: string): PageInfo {
  const clean = (path ?? '/').replace(/\?.*$/, '').replace(/\/$/, '') || '/'
  if (clean === '/') return { name: 'Homepage', type: 'home', badge: 'Home' }
  const parts  = clean.split('/').filter(Boolean)
  const first  = parts[0]?.toLowerCase()
  if (first === 'products' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'product',    badge: 'Product'    }
  if (first === 'collections' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'collection', badge: 'Collection' }
  if (first === 'pages' && parts.length >= 2)
    return { name: slugToTitle(parts[1]), type: 'page',       badge: 'Page'       }
  if ((first === 'blogs' || first === 'blog') && parts.length >= 2) {
    const title = parts.length >= 3 ? parts[2] : parts[1]
    return { name: slugToTitle(title),   type: 'blog',        badge: 'Blog'       }
  }
  return { name: parts.map(slugToTitle).join(' › '), type: 'other', badge: 'Page' }
}

const PAGE_BADGE_STYLE: Record<string, string> = {
  home:       'bg-gray-100 text-gray-600',
  product:    'bg-indigo-50 text-indigo-600',
  collection: 'bg-purple-50 text-purple-600',
  page:       'bg-teal-50 text-teal-600',
  blog:       'bg-amber-50 text-amber-600',
  other:      'bg-gray-50 text-gray-500',
}

function exportCSV(analytics: ProxyAnalytics, rangeLabel: string) {
  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + (analytics.ai_referral_visits ?? 0)
  const intel = buildPlatformIntel(analytics)
  const lines: string[] = []
  lines.push(`Alignment Visibility Analytics — ${analytics.domain}`)
  lines.push(`Period: ${rangeLabel}`)
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('Metric,Value')
  lines.push(`Total AI Traffic,${totalAiTraffic}`)
  lines.push(`AI Visits,${analytics.total_ai_visits ?? 0}`)
  lines.push(`AI Referral,${analytics.ai_referral_visits ?? 0}`)
  lines.push('')
  lines.push('## AI Platform Breakdown')
  lines.push('Platform,Crawls,Referrals,Total')
  for (const p of intel) {
    lines.push(`${p.name},${p.crawls},${p.referrals},${p.crawls + p.referrals}`)
  }
  lines.push('')
  lines.push('## Top Referral Landing Pages')
  lines.push('Page,Visits')
  for (const p of analytics.top_referral_landing_pages ?? []) {
    lines.push(`${p.path === '/' ? '/ (Homepage)' : p.path},${p.visit_count}`)
  }
  lines.push('')
  lines.push('## Daily Trend')
  lines.push('Date,AI Visits,AI Referrals,Total AI Traffic')
  for (const d of analytics.daily_trend ?? []) {
    lines.push(`${d.date},${d.ai_visits},${d.ai_referrals},${d.ai_visits + d.ai_referrals}`)
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
  const totalAiTraffic = (analytics.total_ai_visits ?? 0) + (analytics.ai_referral_visits ?? 0)
  const intel = buildPlatformIntel(analytics)
  const platformLines = intel.slice(0, 5).map(p => {
    const parts: string[] = []
    if (p.crawls > 0) parts.push(`${p.crawls} crawls`)
    if (p.referrals > 0) parts.push(`${p.referrals} referrals`)
    return `  ${p.name}: ${parts.join(', ')}`
  })
  return [
    `Alignment Visibility Report — ${analytics.domain}`,
    `Period: ${rangeLabel}`,
    ``,
    `Total AI Traffic: ${totalAiTraffic.toLocaleString()}`,
    `AI Visits: ${(analytics.total_ai_visits ?? 0).toLocaleString()}`,
    `AI Referral: ${(analytics.ai_referral_visits ?? 0).toLocaleString()}`,
    ``,
    `Top Platforms:`,
    ...platformLines,
  ].join('\n')
}

// ── World Geo Map Component ──────────────────────────────────────────────────

function flagEmoji(iso: string): string {
  if (iso.length !== 2) return '🌐'
  const base = 0x1F1E6 - 65
  return String.fromCodePoint(iso.charCodeAt(0) + base) + String.fromCodePoint(iso.charCodeAt(1) + base)
}

function ll2xy(lat: number, lon: number): [number, number] {
  return [(lon + 180) * (960 / 360), (90 - lat) * (500 / 180)]
}

const COUNTRY_LATLNG: Record<string, [number, number]> = {
  'US': [38, -97],   'CA': [60, -95],   'MX': [23, -102],
  'GB': [55, -3],    'DE': [51, 10],    'FR': [46, 2],
  'IT': [43, 12],    'ES': [40, -4],    'PT': [39, -8],
  'NL': [52, 5],     'BE': [50, 4],     'CH': [47, 8],
  'AT': [47, 14],    'PL': [52, 20],    'CZ': [50, 15],
  'SE': [62, 18],    'NO': [65, 13],    'DK': [56, 10],
  'FI': [64, 25],    'RO': [46, 25],    'GR': [39, 22],
  'UA': [49, 32],    'TR': [39, 35],    'HU': [47, 19],
  'RU': [60, 90],    'BY': [53, 28],
  'CN': [35, 103],   'JP': [36, 138],   'KR': [36, 128],
  'IN': [20, 77],    'PK': [30, 70],    'BD': [23, 90],
  'VN': [16, 108],   'TH': [15, 101],   'MY': [3, 112],
  'SG': [1, 104],    'ID': [-5, 120],   'PH': [12, 122],
  'HK': [22, 114],   'TW': [23, 121],
  'AU': [-27, 133],  'NZ': [-41, 174],
  'BR': [-15, -53],  'AR': [-35, -65],  'CL': [-35, -71],
  'CO': [4, -74],    'PE': [-10, -75],
  'ZA': [-29, 25],   'NG': [8, 8],      'EG': [27, 30],
  'KE': [-1, 38],    'MA': [32, -6],    'ET': [8, 38],
  'IL': [31, 35],    'SA': [24, 45],    'AE': [24, 54],
  'IR': [32, 53],    'IQ': [33, 44],
  'KZ': [48, 68],    'UZ': [41, 64],
  'MN': [46, 105],   'NP': [28, 84],
  'SK': [49, 19],    'HR': [45, 16],    'BG': [43, 25],
  'RS': [44, 21],    'LT': [56, 24],    'LV': [57, 25],
  'EE': [58, 25],    'IS': [65, -18],   'IE': [53, -8],
  'MD': [47, 29],    'KW': [29, 48],    'QA': [25, 51],
  'DZ': [28, 2],     'TZ': [-6, 35],    'GH': [8, -1],
}

// Simplified continent outlines — equirectangular 960×500 projection
const GEO_LAND_PATHS = [
  // Greenland
  'M 280,14 L 320,7 L 360,14 L 373,28 L 360,42 L 333,53 L 307,53 L 280,42 Z',
  // North America
  'M 53,75 L 107,61 L 160,47 L 213,47 L 267,61 L 320,83 L 333,106 L 320,128 L 307,128 L 293,136 L 267,175 L 253,208 L 267,225 L 267,242 L 253,250 L 240,225 L 213,211 L 187,186 L 160,150 L 147,111 L 120,89 L 80,75 Z',
  // South America
  'M 267,242 L 280,236 L 307,228 L 347,236 L 387,264 L 393,278 L 373,311 L 347,353 L 320,397 L 307,417 L 293,417 L 280,400 L 267,353 L 253,306 L 253,275 L 260,253 Z',
  // Eurasia (Europe + Asia combined)
  'M 440,97 L 453,83 L 467,83 L 480,97 L 507,97 L 520,83 L 540,72 L 573,61 L 627,47 L 693,33 L 760,22 L 840,22 L 893,33 L 933,47 L 933,83 L 907,97 L 867,100 L 853,122 L 853,150 L 840,167 L 813,181 L 787,194 L 773,208 L 747,208 L 720,222 L 707,222 L 693,236 L 680,236 L 653,250 L 640,264 L 607,272 L 587,253 L 573,236 L 560,236 L 547,208 L 547,175 L 560,167 L 567,150 L 547,133 L 520,122 L 507,133 L 493,133 L 467,122 L 453,122 L 440,111 Z',
  // India Peninsula
  'M 607,167 L 640,181 L 653,211 L 647,236 L 627,264 L 613,250 L 600,236 L 593,211 L 600,181 Z',
  // SE Asia / Indochina
  'M 720,222 L 747,222 L 753,236 L 747,264 L 720,264 L 707,253 L 707,239 Z',
  // Africa
  'M 453,122 L 480,111 L 520,111 L 547,122 L 553,147 L 567,167 L 573,181 L 600,208 L 607,236 L 593,275 L 573,311 L 553,347 L 527,375 L 500,383 L 473,375 L 453,353 L 440,325 L 433,289 L 440,253 L 453,222 L 440,200 L 440,167 L 453,150 Z',
  // Australia
  'M 720,300 L 760,283 L 800,275 L 827,286 L 840,308 L 840,336 L 827,358 L 800,375 L 760,375 L 727,361 L 720,333 Z',
]

const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany',
  'FR': 'France', 'CA': 'Canada', 'AU': 'Australia', 'JP': 'Japan',
  'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'RU': 'Russia',
  'KR': 'South Korea', 'SG': 'Singapore', 'NL': 'Netherlands',
  'SE': 'Sweden', 'IT': 'Italy', 'ES': 'Spain', 'PL': 'Poland',
  'NZ': 'New Zealand', 'ZA': 'South Africa', 'MX': 'Mexico',
  'ID': 'Indonesia', 'TH': 'Thailand', 'PH': 'Philippines',
  'VN': 'Vietnam', 'MY': 'Malaysia', 'HK': 'Hong Kong',
  'TW': 'Taiwan', 'NG': 'Nigeria', 'UA': 'Ukraine', 'TR': 'Turkey',
  'SA': 'Saudi Arabia', 'IL': 'Israel', 'AE': 'UAE', 'AR': 'Argentina',
  'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'EG': 'Egypt',
  'PK': 'Pakistan', 'BD': 'Bangladesh', 'DK': 'Denmark', 'NO': 'Norway',
  'FI': 'Finland', 'CH': 'Switzerland', 'AT': 'Austria', 'BE': 'Belgium',
  'PT': 'Portugal', 'CZ': 'Czech Republic', 'RO': 'Romania', 'GR': 'Greece',
  'IR': 'Iran', 'IQ': 'Iraq', 'KE': 'Kenya', 'ET': 'Ethiopia',
  'MA': 'Morocco', 'KZ': 'Kazakhstan', 'UZ': 'Uzbekistan',
  'MN': 'Mongolia', 'NP': 'Nepal', 'BY': 'Belarus', 'HU': 'Hungary',
  'SK': 'Slovakia', 'HR': 'Croatia', 'BG': 'Bulgaria', 'RS': 'Serbia',
  'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia', 'IS': 'Iceland',
  'IE': 'Ireland', 'MD': 'Moldova', 'KW': 'Kuwait', 'QA': 'Qatar',
  'DZ': 'Algeria', 'TZ': 'Tanzania', 'GH': 'Ghana',
}

interface GeoDataItem {
  country: string
  visit_count: number
  bot_count: number
  referral_count: number
}

type GeoFilter = 'traffic' | 'visits' | 'referral'

const GEO_COLORS = {
  bot:      '#ef4444',
  referral: '#eab308',
  both:     '#f97316',
} as const

function geoColor(d: GeoDataItem): string {
  const hasBots = d.bot_count > 0
  const hasRef  = d.referral_count > 0
  return (hasBots && hasRef) ? GEO_COLORS.both : hasBots ? GEO_COLORS.bot : GEO_COLORS.referral
}

function GeoWorldMap({ geoData }: { geoData: GeoDataItem[] }) {
  const [hovered, setHovered] = useState<(GeoDataItem & { px: number; py: number }) | null>(null)
  const [filter, setFilter]   = useState<GeoFilter>('traffic')

  const isEmpty     = geoData.length === 0
  const unknownData = geoData.filter(d => !COUNTRY_LATLNG[d.country])

  const metricOf = (d: GeoDataItem) =>
    filter === 'visits'   ? d.bot_count
    : filter === 'referral' ? d.referral_count
    : d.visit_count

  const visibleData = geoData.filter(d => COUNTRY_LATLNG[d.country] && metricOf(d) > 0)
  const maxCount    = Math.max(...visibleData.map(d => metricOf(d)), 1)
  const totalVisits = geoData.reduce((s, d) => s + d.visit_count, 0)
  const sortedGeo   = [...geoData].sort((a, b) => metricOf(b) - metricOf(a))

  const FILTER_BTNS: { key: GeoFilter; label: string }[] = [
    { key: 'traffic',  label: 'AI Traffic'  },
    { key: 'visits',   label: 'AI Visits'   },
    { key: 'referral', label: 'AI Referral' },
  ]

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          Global AI Traffic Distribution
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {FILTER_BTNS.map(btn => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === btn.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          {filter === 'traffic' && (
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: GEO_COLORS.bot }} />Bot
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: GEO_COLORS.referral }} />Referral
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: GEO_COLORS.both }} />Both
              </span>
            </div>
          )}
          {filter === 'visits' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: GEO_COLORS.bot }} />AI Bot crawls
            </span>
          )}
          {filter === 'referral' && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: GEO_COLORS.referral }} />AI-referred visits
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        {isEmpty
          ? 'Geographic data will appear once new AI bot traffic is logged — usually within a few hours.'
          : `${totalVisits.toLocaleString()} total visits from ${geoData.length} ${geoData.length === 1 ? 'country' : 'countries'}`}
      </p>

      {/* SVG World Map */}
      <div className="rounded-xl overflow-hidden border border-gray-100" style={{ aspectRatio: '960/500' }}>
        <svg viewBox="0 0 960 500" className="w-full h-full" style={{ display: 'block' }}>
          {/* Ocean */}
          <rect width="960" height="500" fill="#daeaf5" />
          {/* Latitude grid */}
          <line x1="0" y1="250" x2="960" y2="250" stroke="#b0cce0" strokeWidth="0.8" />
          <line x1="0" y1="125" x2="960" y2="125" stroke="#c0d4e6" strokeWidth="0.4" strokeDasharray="6,10" />
          <line x1="0" y1="375" x2="960" y2="375" stroke="#c0d4e6" strokeWidth="0.4" strokeDasharray="6,10" />
          <line x1="480" y1="0" x2="480" y2="500" stroke="#c0d4e6" strokeWidth="0.4" strokeDasharray="6,10" />
          <text x="486" y="245" fill="#88aabb" fontSize="9" fontFamily="system-ui,sans-serif">Equator</text>
          {/* Land masses */}
          {GEO_LAND_PATHS.map((d, i) => (
            <path key={i} d={d} fill="#c8d8a0" stroke="#a8bc78" strokeWidth="0.8" />
          ))}
          {/* Empty state */}
          {isEmpty && (
            <text x="480" y="265" textAnchor="middle" fill="#94a3b8" fontSize="13" fontFamily="system-ui,sans-serif">
              No geographic data yet — bot visits will appear here
            </text>
          )}
          {/* Country bubbles */}
          {visibleData.map(d => {
            const latlng = COUNTRY_LATLNG[d.country]!
            const [px, py] = ll2xy(latlng[0], latlng[1])
            const count  = metricOf(d)
            const pct    = count / maxCount
            const r      = Math.max(5, Math.sqrt(pct) * 22)
            const color  = filter === 'visits' ? GEO_COLORS.bot
              : filter === 'referral' ? GEO_COLORS.referral
              : geoColor(d)
            const opacity = 0.35 + pct * 0.65
            const isHov   = hovered?.country === d.country
            return (
              <g key={d.country} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered({ ...d, px, py })}
                onMouseLeave={() => setHovered(null)}
              >
                <circle
                  cx={px} cy={py}
                  r={isHov ? r * 1.3 : r}
                  fill={color}
                  opacity={isHov ? 0.92 : opacity}
                  style={{ transition: 'all 0.15s ease', filter: isHov ? `drop-shadow(0 0 5px ${color})` : 'none' }}
                />
                {r > 11 && (
                  <text x={px} y={py + 4} textAnchor="middle"
                    fontSize={Math.min(r * 0.7, 11)} fill="white" fontWeight="bold"
                    fontFamily="system-ui,sans-serif" pointerEvents="none"
                  >
                    {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                  </text>
                )}
              </g>
            )
          })}
          {/* Tooltip */}
          {hovered && (
            <g pointerEvents="none">
              {(() => {
                const tx = Math.min(hovered.px + 8, 755)
                const ty = Math.max(hovered.py - 56, 4)
                const name = COUNTRY_NAMES[hovered.country] ?? hovered.country
                return (
                  <>
                    <rect x={tx} y={ty} width="205" height="54" rx="6" fill="rgba(15,23,42,0.90)" />
                    <text x={tx + 10} y={ty + 19} fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui,sans-serif">
                      {flagEmoji(hovered.country)} {name}
                    </text>
                    <text x={tx + 10} y={ty + 35} fill="#94a3b8" fontSize="10" fontFamily="system-ui,sans-serif">
                      {`Bots: ${hovered.bot_count.toLocaleString()}`}
                    </text>
                    <text x={tx + 110} y={ty + 35} fill="#fde68a" fontSize="10" fontFamily="system-ui,sans-serif">
                      {`Ref: ${hovered.referral_count.toLocaleString()}`}
                    </text>
                    <text x={tx + 10} y={ty + 49} fill="#d1d5db" fontSize="10" fontFamily="system-ui,sans-serif">
                      {`Total: ${hovered.visit_count.toLocaleString()}`}
                    </text>
                  </>
                )
              })()}
            </g>
          )}
        </svg>
      </div>

      {/* Unknown countries */}
      {unknownData.length > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">
          Also from: {unknownData.map(d => `${d.country} (${d.visit_count})`).join(', ')}
        </p>
      )}

      {/* Country grid with flags */}
      {!isEmpty && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          {sortedGeo.filter(d => metricOf(d) > 0).slice(0, 12).map((d, i) => (
            <div key={d.country} className="flex items-center gap-2 text-xs">
              <span className="text-gray-300 w-4 shrink-0 text-right">{i + 1}</span>
              <span className="text-base leading-none">{flagEmoji(d.country)}</span>
              <span className="font-medium text-gray-700 truncate flex-1">
                {COUNTRY_NAMES[d.country] ?? d.country}
              </span>
              <span className="text-gray-400 shrink-0 font-mono">{metricOf(d).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
    if (days === 1) return 'Last 24h'
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

  // Merge bots by canonical platform name to avoid duplicate bars
  // (e.g. GPTBot + OAI-Search both → "ChatGPT")
  const botCanonicalMap: Record<string, number> = {}
  analytics.by_bot
    .filter(b => b.bot_name !== 'UnknownBot')
    .forEach(b => {
      const canonical = getPlatformMeta(b.bot_name).name
      botCanonicalMap[canonical] = (botCanonicalMap[canonical] ?? 0) + b.visit_count
    })
  const mergedBotList = Object.entries(botCanonicalMap)
    .map(([name, visit_count]) => ({ name, visit_count }))
    .sort((a, b) => b.visit_count - a.visit_count)

  const referralSources = [...(analytics.ai_referral_sources ?? [])].sort((a, b) => b.visit_count - a.visit_count)
  const referralLandingPages = [...(analytics.top_referral_landing_pages ?? [])].sort((a, b) => b.visit_count - a.visit_count)

  // AI Platform Intelligence: merge bots + referrals by canonical platform name
  const platformIntel = buildPlatformIntel(analytics)

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
        {(analytics.daily_trend ?? []).length > 1 && (() => {
          // Build CUMULATIVE chart data so the last point = KPI total
          // This eliminates confusion: "daily peak 123 ≠ KPI 330"
          // Cumulative: last point AI Bots = 310, Referrals = 20, Total = 330 ← matches KPI exactly
          let cumAiVisits = 0, cumReferrals = 0
          const chartData = (analytics.daily_trend ?? []).map(d => {
            cumAiVisits   += d.ai_visits
            cumReferrals  += d.ai_referrals
            return {
              date:         d.date,
              total:        cumAiVisits + cumReferrals,
              ai_visits:    cumAiVisits,
              ai_referrals: cumReferrals,
              // keep daily values for tooltip
              day_visits:   d.ai_visits,
              day_referrals: d.ai_referrals,
            }
          })
          const fmtD = (iso: string) =>
            new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          const firstDay = chartData[0]?.date
          const lastDay  = chartData[chartData.length - 1]?.date
          const chartSubtitle = firstDay && lastDay
            ? `${fmtD(firstDay)} – ${fmtD(lastDay)} · cumulative AI traffic`
            : rangeLabel.toLowerCase()
          return (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                Traffic Trend
              </h3>
              <div className="text-right shrink-0">
                <div className="text-xs text-gray-400">Period total</div>
                <div className="text-sm font-bold text-gray-800">{totalAiTraffic.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">{chartSubtitle}</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(l: string) => `Date: ${l}`}
                  formatter={(value: number, name: string, props: { payload?: { day_visits?: number; day_referrals?: number } }) => {
                    const daily = name === 'AI Bots'
                      ? props.payload?.day_visits
                      : name === 'AI Referrals'
                        ? props.payload?.day_referrals
                        : undefined
                    const dailyStr = daily !== undefined ? ` (+${daily} today)` : ''
                    return [`${value.toLocaleString()}${dailyStr}`, name]
                  }}
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
          )
        })()}

        {/* AI Platforms Reading Your Store */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <Bot className="w-4 h-4 text-gray-400" />
            AI Platforms Reading Your Store
          </h3>
          <p className="text-xs text-gray-400 mb-3">AI platforms that scanned your site&apos;s AI profile — {rangeLabel.toLowerCase()}.</p>
          {mergedBotList.length === 0 ? (
            <p className="text-xs text-gray-400">Data appears once AI bots start visiting your site. Most sites see their first crawl within 24–72 hours of completing setup.</p>
          ) : (
            <div className="space-y-2.5">
              {mergedBotList.map(bot => {
                // canonical name IS the display name; look it up for the favicon domain
                const meta = getPlatformMeta(bot.name)
                const total = analytics.total_ai_visits > 0 ? analytics.total_ai_visits : 1
                const pct = Math.round((bot.visit_count / total) * 100)
                return (
                  <div key={bot.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <PlatformLogo id={bot.name} size={16} />
                      <span className="text-xs font-medium text-gray-700 truncate">{bot.name}</span>
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

        {/* Global AI Traffic Distribution — World Geo Map (always visible) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <GeoWorldMap geoData={analytics.geo_distribution ?? []} />
        </div>

        {/* Top Landing Pages from AI Traffic */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Top Landing Pages from AI Traffic</h3>
          <p className="text-xs text-gray-400 mb-4">Which pages AI bots read and where human visitors land after clicking AI recommendations — {rangeLabel.toLowerCase()}.</p>
          <div className="grid grid-cols-2 gap-5">

            {/* Left: AI VISITS — actual pages bots crawled, technical paths excluded */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">AI Visits</span>
                <span className="text-xs text-gray-400">— AI bots read</span>
              </div>
              {(() => {
                const pages = (analytics.by_path ?? [])
                  .filter(p => isHumanPagePath(p.path))
                  .slice(0, 8)
                if (pages.length === 0) return (
                  <p className="text-xs text-gray-400 italic">No page crawl data yet.</p>
                )
                return (
                  <div className="space-y-2">
                    {pages.map(p => {
                      const info = pathToPageInfo(p.path)
                      return (
                        <div key={p.path} className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PAGE_BADGE_STYLE[info.type]}`}>
                            {info.badge}
                          </span>
                          <span className="text-xs text-gray-700 truncate flex-1" title={info.name}>{info.name}</span>
                          <span className="text-xs font-bold text-indigo-500 shrink-0 tabular-nums">{p.visit_count.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* Right: AI REFERRALS — pages where humans from AI platforms landed */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">AI Referrals</span>
                <span className="text-xs text-gray-400">— humans landed</span>
              </div>
              {referralLandingPages.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Appears once AI platforms send visitors.</p>
              ) : (
                <div className="space-y-2">
                  {referralLandingPages.slice(0, 8).map(p => {
                    const info = pathToPageInfo(p.path)
                    return (
                      <div key={p.path} className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PAGE_BADGE_STYLE[info.type]}`}>
                          {info.badge}
                        </span>
                        <span className="text-xs text-gray-700 truncate flex-1" title={info.name}>{info.name}</span>
                        <span className="text-xs font-bold text-emerald-500 shrink-0 tabular-nums">{p.visit_count.toLocaleString()}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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
            userId={user!.id}
            onDomainUpdate={setDomain}
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
