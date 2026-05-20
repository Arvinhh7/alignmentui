'use client'

/**
 * SdkAdminTab — SDK Mode configuration panel (v3).
 *
 * Adds:
 *  - Auto-fill API token (matches Token Management by domain or origin hostname)
 *  - "Generate Token" CTA when no token is linked to this domain
 *  - "Send Test Event" button — instant validation of token + endpoint
 *  - "Probe Theme" button — fetches the live HTML and confirms the snippet is in <head>
 *  - Shop/domain mismatch warning banner
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Copy, CheckCheck, Code2, CheckCircle2, XCircle, Clock, AlertCircle,
  Zap, Wand2, Sparkles, AlertTriangle,
} from 'lucide-react'
import { adminApi, type ProxyDomain, type ProxyTokenInfo, type ThemeProbeResult } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SdkHealthKpis {
  ai_referrals: number
  schemas_delivered: number
  page_views: number
}

interface SdkAdminTabProps {
  domain: ProxyDomain
  userId: string
}

function extractHostname(input: string | undefined | null): string | null {
  if (!input) return null
  try {
    const raw = input.startsWith('http') ? input : `https://${input}`
    return new URL(raw).hostname.toLowerCase()
  } catch {
    return null
  }
}

export default function SdkAdminTab({ domain, userId }: SdkAdminTabProps) {
  const [copied, setCopied] = useState(false)

  // Token state — auto-fetched from Token Management
  const [token, setToken] = useState<ProxyTokenInfo | null>(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // Health diagnostics
  const [health, setHealth] = useState<SdkHealthKpis | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  // Test event state
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle')
  const [testDetail, setTestDetail] = useState<string | null>(null)

  // Probe state
  const [probeStatus, setProbeStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [probe, setProbe] = useState<ThemeProbeResult | null>(null)

  const customDomain = domain.domain
  const originHost = useMemo(() => extractHostname(domain.origin_url), [domain.origin_url])

  // ── Auto-fetch token by matching shop to domain → origin → any user shop ──
  const refreshToken = useCallback(async () => {
    setTokenLoading(true)
    try {
      const candidates = [customDomain, originHost].filter((s): s is string => !!s)
      let found: ProxyTokenInfo | null = null
      for (const shop of candidates) {
        const tokens = await adminApi.listProxyTokens(shop)
        const active = tokens.find(t => t.status === 'active')
        if (active) { found = active; break }
      }
      setToken(found)
    } catch {
      setToken(null)
    } finally {
      setTokenLoading(false)
    }
  }, [customDomain, originHost])

  useEffect(() => { void refreshToken() }, [refreshToken])

  // ── Refresh insights (used to update health) ───────────────────────────────
  const refreshHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const r = await fetch(
        `${API_BASE}/v1/sdk/insights/admin?shop=${encodeURIComponent(token?.shop ?? customDomain)}&user_id=${encodeURIComponent(userId)}&period=7d`,
      )
      const data = r.ok ? await r.json() : null
      setHealth(data?.kpis ?? null)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [token?.shop, customDomain, userId])

  useEffect(() => { void refreshHealth() }, [refreshHealth])

  // ── Snippet preview ────────────────────────────────────────────────────────
  const snippetShopId = token?.shop ?? originHost ?? customDomain
  const snippetToken = token?.token ?? '[API_TOKEN]'
  const snippet = `<script
  src="https://alignmenttech.ai/sdk/v1/loader.js"
  data-shop-id="${snippetShopId}"
  data-api-key="${snippetToken}"
  data-api-base="https://api.alignmenttech.ai"
  async
></script>`

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── Generate token (bound to origin hostname) ──────────────────────────────
  const generateToken = async () => {
    const bindShop = originHost ?? customDomain
    if (!bindShop) return
    setGenerating(true)
    try {
      const label = `${customDomain} SDK`
      await adminApi.createProxyToken(bindShop, 'optimize', label)
      await refreshToken()
    } catch (err) {
      console.error('createProxyToken failed', err)
    } finally {
      setGenerating(false)
    }
  }

  // ── Send Test Event ────────────────────────────────────────────────────────
  const sendTestEvent = async () => {
    if (!token) return
    setTestStatus('running')
    setTestDetail(null)
    try {
      const res = await fetch(`${API_BASE}/v1/sdk/telemetry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json',
          'X-Shop-Domain': token.shop,
        },
        body: JSON.stringify({
          event_type: 'page_view',
          page_url: `https://${customDomain}/__alignment_sdk_test__`,
          timestamp_ms: Date.now(),
          sdk_version: 'admin-test',
        }),
      })
      if (res.ok) {
        setTestStatus('success')
        setTestDetail('Telemetry endpoint accepted the event (HTTP 202). Refreshing health…')
        setTimeout(() => { void refreshHealth() }, 1500)
      } else {
        setTestStatus('failed')
        const err = await res.text().catch(() => '')
        setTestDetail(`HTTP ${res.status} — ${err.slice(0, 140) || 'no body'}`)
      }
    } catch (err) {
      setTestStatus('failed')
      setTestDetail(err instanceof Error ? err.message : 'Network error')
    }
  }

  // ── Probe Theme (fetch HTML, check for loader.js) ──────────────────────────
  const probeTheme = async () => {
    setProbeStatus('running')
    setProbe(null)
    try {
      const result = await adminApi.probeTheme(customDomain)
      setProbe(result)
    } catch (err) {
      setProbe({
        installed: false,
        shop_id_present: false,
        token_present: false,
        shop_id_value: null,
        token_preview: null,
        url: customDomain,
        host: customDomain,
        status_code: 0,
        error: err instanceof Error ? err.message : 'Probe failed',
      })
    } finally {
      setProbeStatus('done')
    }
  }

  const isConnected = !!health && (
    health.schemas_delivered > 0 || health.page_views > 0 || health.ai_referrals > 0
  )

  // ── Mismatch detection ─────────────────────────────────────────────────────
  // If we found a token but its shop doesn't match either the custom domain or
  // the origin hostname, surface a warning — the SDK won't reach this dashboard.
  const tokenShop = token?.shop?.toLowerCase()
  const mismatch = !!tokenShop && tokenShop !== customDomain.toLowerCase() && tokenShop !== originHost

  return (
    <div className="space-y-5">

      {/* ── Token Status / Generate ───────────────────────────────────────── */}
      {!tokenLoading && !token && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">No API token linked to this domain</h3>
              <p className="text-xs text-amber-800 mt-1">
                Generate one bound to <code className="bg-amber-100 px-1 py-0.5 rounded">{originHost ?? customDomain}</code> so SDK telemetry routes to this dashboard.
              </p>
              <button
                onClick={generateToken}
                disabled={generating}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {generating ? 'Generating…' : 'Generate Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mismatch && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-900">Token / domain mismatch</h3>
              <p className="text-xs text-rose-800 mt-1">
                The linked token is bound to <code className="bg-rose-100 px-1 py-0.5 rounded">{token?.shop}</code>,
                which doesn&apos;t match this proxy&apos;s domain (<code className="bg-rose-100 px-1 py-0.5 rounded">{customDomain}</code>)
                or origin (<code className="bg-rose-100 px-1 py-0.5 rounded">{originHost ?? '—'}</code>).
                Data will still be written under the token&apos;s shop and may not appear in this dashboard.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Embed Snippet ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-ink-3" />
            <h3 className="text-sm font-semibold text-ink-2">Embed Snippet</h3>
            {token && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                <Sparkles className="w-3 h-3" /> Auto-filled
              </span>
            )}
          </div>
          <button
            onClick={copySnippet}
            className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink-2 transition-colors"
          >
            {copied
              ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied</span></>
              : <><Copy className="w-3.5 h-3.5" />Copy</>
            }
          </button>
        </div>
        <pre className="text-xs font-mono bg-canvas rounded-xl p-4 overflow-x-auto text-ink-3 leading-relaxed border border-divider-light">
          {snippet}
        </pre>
        <p className="text-xs text-ink-3 mt-2.5">
          {token
            ? <>Paste before <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{'</head>'}</code> of your theme. Token is pre-filled from Token Management.</>
            : <>Add to <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{'<head>'}</code> of client theme. Replace <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">[API_TOKEN]</code> with a generated token.</>
          }
        </p>
      </div>

      {/* ── Installation Test & Probe ─────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-4">Verify Installation</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Send Test Event */}
          <div className="border border-divider-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-ink-3" />
                <p className="text-xs font-semibold text-ink-2">Send Test Event</p>
              </div>
              <button
                onClick={sendTestEvent}
                disabled={!token || testStatus === 'running'}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-ink-1 hover:bg-ink-2 disabled:bg-ink-4/40 text-white transition-colors"
              >
                {testStatus === 'running' ? 'Sending…' : 'Run'}
              </button>
            </div>
            <p className="text-[11px] text-ink-3 leading-relaxed">
              Posts a synthetic <code className="bg-canvas px-1 py-0.5 rounded">page_view</code> to verify token + endpoint authenticate end-to-end.
            </p>
            {testStatus === 'success' && testDetail && (
              <div className="mt-2 text-[11px] text-green-700 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{testDetail}</span>
              </div>
            )}
            {testStatus === 'failed' && testDetail && (
              <div className="mt-2 text-[11px] text-rose-700 flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{testDetail}</span>
              </div>
            )}
          </div>

          {/* Probe Theme */}
          <div className="border border-divider-light rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-ink-3" />
                <p className="text-xs font-semibold text-ink-2">Probe Theme</p>
              </div>
              <button
                onClick={probeTheme}
                disabled={probeStatus === 'running'}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-ink-1 hover:bg-ink-2 disabled:bg-ink-4/40 text-white transition-colors"
              >
                {probeStatus === 'running' ? 'Probing…' : 'Run'}
              </button>
            </div>
            <p className="text-[11px] text-ink-3 leading-relaxed">
              Fetches <code className="bg-canvas px-1 py-0.5 rounded">{customDomain}</code> and checks if the SDK snippet is in the HTML.
            </p>
            {probe && (
              <div className="mt-2 space-y-1 text-[11px]">
                <div className={`flex items-start gap-1.5 ${probe.installed ? 'text-green-700' : 'text-rose-700'}`}>
                  {probe.installed ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  <span>
                    {probe.installed ? 'loader.js script tag found' : 'loader.js script tag NOT found'}
                    {probe.error && ` — ${probe.error}`}
                  </span>
                </div>
                {probe.installed && (
                  <>
                    <div className={`flex items-start gap-1.5 ${probe.shop_id_present ? 'text-green-700' : 'text-amber-700'}`}>
                      {probe.shop_id_present ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                      <span>data-shop-id: <code className="bg-canvas px-1 py-0.5 rounded">{probe.shop_id_value ?? 'missing'}</code></span>
                    </div>
                    <div className={`flex items-start gap-1.5 ${probe.token_present ? 'text-green-700' : 'text-amber-700'}`}>
                      {probe.token_present ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                      <span>data-api-key: <code className="bg-canvas px-1 py-0.5 rounded">{probe.token_preview ?? '[API_TOKEN] placeholder'}</code></span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Installation Health (7-day) ───────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-4">Installation Health (7-day)</h3>
        <div className="space-y-4">

          {/* SDK Connection */}
          <div className="flex items-start gap-3">
            {healthLoading
              ? <Clock className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" />
              : isConnected
                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-xs font-semibold text-ink-2">SDK Connection</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {healthLoading
                  ? 'Checking…'
                  : isConnected
                    ? `Connected · ${health!.page_views.toLocaleString()} page views tracked in the last 7 days`
                    : 'Awaiting first SDK event — install the snippet above'
                }
              </p>
            </div>
          </div>

          {/* Schema Delivery */}
          <div className="flex items-start gap-3">
            {isConnected
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              : <Clock className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-xs font-semibold text-ink-2">Schema Delivery</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {isConnected
                  ? `${health!.schemas_delivered.toLocaleString()} schemas delivered in the last 7 days`
                  : 'Schemas will be delivered automatically once the SDK is connected'
                }
              </p>
            </div>
          </div>

          {/* API Token status */}
          <div className="flex items-start gap-3">
            {token
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-xs font-semibold text-ink-2">API Token</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {token
                  ? <>Linked: <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{token.token.slice(0, 12)}…</code> · tier <span className="font-medium text-ink-2">{token.tier}</span> · shop <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{token.shop}</code></>
                  : 'No active token linked — click "Generate Token" above'
                }
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
