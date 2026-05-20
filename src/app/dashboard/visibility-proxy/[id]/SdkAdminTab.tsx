'use client'

/**
 * SdkAdminTab — SDK Mode configuration panel (v2).
 *
 * Config-only view — no analytics here.
 * All metrics (AI Referrals, Schemas Delivered, Page Views) belong in the
 * unified Analytics tab. This tab owns only:
 *  1. Embed snippet (copy-ready)
 *  2. Installation health diagnostic
 */

import { useState, useEffect } from 'react'
import { Copy, CheckCheck, Code2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import type { ProxyDomain } from '@/lib/api'

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

export default function SdkAdminTab({ domain, userId }: SdkAdminTabProps) {
  const [copied, setCopied] = useState(false)
  const [health, setHealth] = useState<SdkHealthKpis | null>(null)

  const shopId = domain.domain

  // Light health check — 7-day totals to determine if SDK is active
  useEffect(() => {
    fetch(
      `${API_BASE}/v1/sdk/insights/admin?shop=${encodeURIComponent(shopId)}&user_id=${encodeURIComponent(userId)}&period=7d`
    )
      .then(r => (r.ok ? r.json() : null))
      .then(d => setHealth(d?.kpis ?? null))
      .catch(() => setHealth(null))
  }, [shopId, userId])

  const snippet = `<script
  src="https://alignmenttech.ai/sdk/v1/loader.js"
  data-shop-id="${shopId}"
  data-api-key="[API_TOKEN]"
  data-api-base="https://api.alignmenttech.ai"
  async
></script>`

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const isConnected = health !== null && (
    health.schemas_delivered > 0 || health.page_views > 0 || health.ai_referrals > 0
  )

  return (
    <div className="space-y-5">

      {/* ── Embed Snippet ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-ink-3" />
            <h3 className="text-sm font-semibold text-ink-2">Embed Snippet</h3>
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
          Add to <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">{'<head>'}</code> of client theme.
          Replace <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">[API_TOKEN]</code> with the generated token after contract signing.
        </p>
      </div>

      {/* ── Installation Health ───────────────────────────────────────────── */}
      <div className="bg-surface border border-divider-light rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-ink-2 mb-4">Installation Health</h3>
        <div className="space-y-4">

          {/* SDK Connection */}
          <div className="flex items-start gap-3">
            {isConnected
              ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-xs font-semibold text-ink-2">SDK Connection</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {isConnected
                  ? `Connected · ${health!.page_views.toLocaleString()} page views tracked in the last 7 days`
                  : 'Awaiting first SDK event — install the snippet above and replace [API_TOKEN]'
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

          {/* API Token reminder */}
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-ink-2">API Token</p>
              <p className="text-xs text-ink-3 mt-0.5">
                Replace <code className="text-ink-2 bg-canvas px-1 py-0.5 rounded">[API_TOKEN]</code> in the snippet with the token generated after contract signing.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
