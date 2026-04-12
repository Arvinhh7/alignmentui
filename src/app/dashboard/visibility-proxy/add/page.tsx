'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi } from '@/lib/api'
import {
  Globe, ArrowLeft, ArrowRight, Copy, CheckCheck,
  CheckCircle, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react'

type Step = 'form' | 'dns' | 'done'

const CNAME_TARGET = 'fallback.getalignment.us'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-ink-3 hover:text-ink-2 bg-surface-warm hover:bg-surface-muted rounded-lg transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Strip protocol, trailing slash, and path — keep only the bare hostname */
function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split('?')[0]
}

export default function AddDomainPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [step,           setStep]           = useState<Step>('form')
  const [domain,         setDomain]         = useState('')
  const [originUrl,      setOriginUrl]      = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [createdId,      setCreatedId]      = useState<string | null>(null)
  const [fillStatus,     setFillStatus]     = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  /** Poll /assets every 8s until brand_identity content appears or 3-min timeout */
  const startFillPolling = (domainId: string, userId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    const deadline = Date.now() + 3 * 60 * 1000
    pollRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollRef.current!)
        setFillStatus('error')
        return
      }
      try {
        const assets = await proxyApi.getAssets(domainId, userId)
        const bi = assets.assets['brand_identity']
        if (bi && typeof bi === 'object' && !Array.isArray(bi) && Object.keys(bi).length > 0) {
          clearInterval(pollRef.current!)
          setFillStatus('done')
        }
      } catch { /* ignore transient errors */ }
    }, 8000)
  }

  const handleDomainChange = (raw: string) => {
    // Auto-strip protocol and path so the field always shows a clean hostname
    setDomain(cleanDomain(raw))
  }

  const handleCreate = async () => {
    const cleanedDomain = cleanDomain(domain)
    if (!user?.id || !cleanedDomain || !originUrl.trim()) return
    if (!cleanedDomain.includes('.')) {
      setError('Please enter a valid domain, e.g. acme.com or shop.acme.com')
      return
    }

    setLoading(true)
    setError(null)

    // Normalise origin URL
    let origin = originUrl.trim()
    if (!origin.startsWith('http')) origin = `https://${origin}`
    // Strip trailing slash from origin
    origin = origin.replace(/\/$/, '')

    try {
      const created = await proxyApi.createDomain(user.id, cleanedDomain, origin, 'full')
      setCreatedId(created.id)
      setDomain(cleanedDomain) // ensure state matches cleaned version
      setStep('dns')

      // Fire auto-fill immediately — backend returns at once (BackgroundTasks),
      // then we poll /assets every 8s to detect when brand data is actually ready.
      setFillStatus('running')
      proxyApi.autoFill(created.id, user.id)
        .then(() => startFillPolling(created.id, user.id!))
        .catch(() => setFillStatus('error'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create domain')
    } finally {
      setLoading(false)
    }
  }

  // The bare hostname for CNAME Name (e.g. "store.acmecorp.com")
  const cleanedDomain = cleanDomain(domain)

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/visibility-proxy" className="text-ink-3 hover:text-ink-2 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-surface-warm flex items-center justify-center">
            <Globe className="w-5 h-5 text-ink-2" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">Add Domain</h1>
            <p className="text-sm text-ink-3">Connect your domain to the Alignment Visibility Proxy</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {(['form', 'dns', 'done'] as Step[]).map((s, i) => {
            const labels = ['Enter Domain', 'Configure DNS', 'Done']
            const done = step === 'dns' && i === 0 || step === 'done' && i <= 1
            const active = step === s
            return (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-sage text-ink-inv' : active ? 'bg-ink text-ink-inv' : 'bg-surface-muted text-ink-3'
                }`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-ink-3'}`}>{labels[i]}</span>
                {i < 2 && <div className={`flex-1 h-px mx-1 ${done ? 'bg-sage/50' : 'bg-divider'}`} />}
              </div>
            )
          })}
        </div>

        {/* ── Step 1: Form ──────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="bg-surface border border-divider rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm font-semibold text-ink-2 mb-1.5 block">Your Domain</label>
              <input
                type="text"
                value={domain}
                onChange={e => handleDomainChange(e.target.value)}
                placeholder="acme.com"
                className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ink focus:bg-surface transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1.5">
                The domain to proxy — paste any URL and the hostname is extracted automatically.
                e.g. <code className="bg-surface-warm px-1 rounded">acme.com</code> or <code className="bg-surface-warm px-1 rounded">shop.acme.com</code>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink-2 mb-1.5 block">Origin URL</label>
              <input
                type="text"
                value={originUrl}
                onChange={e => setOriginUrl(e.target.value)}
                placeholder="https://acme.com"
                className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ink focus:bg-surface transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1.5">
                Where our proxy forwards traffic to — usually the same as your domain above (e.g. <code className="bg-surface-warm px-1 rounded">https://acme.com</code>)
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-soft-bg border border-red-soft/30 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-soft flex-shrink-0" />
                <span className="text-sm text-red-soft">{error}</span>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !cleanedDomain || !originUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-ink hover:bg-[#2d2d2c] disabled:opacity-50 disabled:cursor-not-allowed text-ink-inv text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Continue to DNS Setup'}
            </button>
          </div>
        )}

        {/* ── Step 2: DNS Instructions ─────────────────────────────── */}
        {step === 'dns' && (
          <div className="space-y-4">
            <div className="bg-surface border border-divider rounded-2xl p-6">
              <h2 className="text-base font-semibold text-ink mb-1">Add this CNAME record to your DNS</h2>
              <p className="text-sm text-ink-3 mb-5">
                Log in to your DNS provider (Cloudflare, GoDaddy, Route 53, etc.) and add the following record:
              </p>

              <div className="bg-ink rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-white/40">DNS Record</span>
                  <CopyButton text={`CNAME ${cleanedDomain} ${CNAME_TARGET}`} />
                </div>
                <div className="p-4 space-y-2 font-mono text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 w-16 flex-shrink-0">Type</span>
                    <span className="text-green-400">CNAME</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 w-16 flex-shrink-0">Name</span>
                    <span className="text-blue-300">{cleanedDomain}</span>
                    <CopyButton text={cleanedDomain} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 w-16 flex-shrink-0">Target</span>
                    <span className="text-yellow-300 break-all">{CNAME_TARGET}</span>
                    <CopyButton text={CNAME_TARGET} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-white/40 w-16 flex-shrink-0">TTL</span>
                    <span className="text-white/30">Auto (or 300)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-caution-bg border border-caution/30 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-caution flex-shrink-0 mt-0.5" />
              <div className="text-sm text-ink">
                <div className="font-semibold mb-0.5">If your domain is already on Cloudflare</div>
                <div className="text-ink-2">Set the CNAME to <strong>DNS only</strong> (grey cloud, not orange) to avoid a proxy loop.</div>
              </div>
            </div>

            {/* Auto-fill status — runs in parallel while DNS propagates */}
            <div className={`border rounded-2xl p-4 flex items-start gap-3 ${
              fillStatus === 'done'  ? 'bg-sage-bg border-sage/20' :
              fillStatus === 'error' ? 'bg-red-soft-bg border-red-soft/20' :
              'bg-surface border-divider-light'
            }`}>
              {fillStatus === 'running' && <Loader2 className="w-4 h-4 text-ink-3 animate-spin flex-shrink-0 mt-0.5" />}
              {fillStatus === 'done'    && <CheckCircle className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />}
              {fillStatus === 'error'   && <AlertCircle className="w-4 h-4 text-red-soft flex-shrink-0 mt-0.5" />}
              {fillStatus === 'idle'    && <AlertCircle className="w-4 h-4 text-ink-3 flex-shrink-0 mt-0.5" />}
              <div>
                <div className={`text-sm font-semibold ${
                  fillStatus === 'done' ? 'text-sage' : fillStatus === 'error' ? 'text-red-soft' : 'text-ink-2'
                }`}>
                  {fillStatus === 'running' && 'Auto-filling brand data…'}
                  {fillStatus === 'done'    && 'Brand data ready — synced to edge network ✓'}
                  {fillStatus === 'error'   && 'Auto-fill failed — you can retry from Brand Data tab'}
                  {fillStatus === 'idle'    && 'Brand data fill pending…'}
                </div>
                <div className="text-xs text-ink-3 mt-0.5">
                  {fillStatus === 'running' && `Crawling ${originUrl} and extracting brand signals — takes ~1 minute`}
                  {fillStatus === 'done'    && 'Once DNS goes active, run End-to-End Verification to confirm everything works'}
                  {fillStatus === 'error'   && `Could not crawl ${originUrl} — check the origin URL and retry`}
                  {fillStatus === 'idle'    && 'Will crawl origin URL and fill brand data automatically'}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-divider rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-ink-2 mb-3">DNS Propagation</h3>
              <p className="text-sm text-ink-3 mb-4">
                After adding the CNAME, DNS changes typically propagate within <strong>1–5 minutes</strong> (up to 48 hours in rare cases). Once the CNAME is live, our system automatically detects and activates your domain.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('done')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  I've Added the CNAME
                </button>
                <Link
                  href={`/dashboard/visibility-proxy/${createdId}?domain=${encodeURIComponent(cleanedDomain)}&origin=${encodeURIComponent(originUrl.trim().replace(/\/$/, ''))}&status=pending&fresh=1`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 text-sm font-medium rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Domain
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ─────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="space-y-4">
            {/* Success header */}
            <div className="bg-surface border border-divider rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sage-bg flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-sage" />
              </div>
              <h2 className="text-xl font-bold text-ink mb-2">Domain Added!</h2>
              <p className="text-sm text-ink-3 max-w-sm mx-auto">
                <strong>{cleanedDomain}</strong> is registered. Once you add the CNAME and DNS propagates, the proxy activates automatically.
              </p>
            </div>

            {/* Auto-fill status — persists from Step 2, shows live progress */}
            <div className={`border rounded-2xl p-4 flex items-start gap-3 ${
              fillStatus === 'done'  ? 'bg-sage-bg border-sage/20' :
              fillStatus === 'error' ? 'bg-red-soft-bg border-red-soft/20' :
              'bg-surface border-divider-light'
            }`}>
              {fillStatus === 'running' && <Loader2 className="w-4 h-4 text-ink-3 animate-spin flex-shrink-0 mt-0.5" />}
              {fillStatus === 'done'    && <CheckCircle className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />}
              {fillStatus === 'error'   && <AlertCircle className="w-4 h-4 text-red-soft flex-shrink-0 mt-0.5" />}
              {fillStatus === 'idle'    && <AlertCircle className="w-4 h-4 text-ink-3 flex-shrink-0 mt-0.5" />}
              <div>
                <div className={`text-sm font-semibold ${
                  fillStatus === 'done' ? 'text-sage' : fillStatus === 'error' ? 'text-red-soft' : 'text-ink-2'
                }`}>
                  {fillStatus === 'running' && 'Auto-filling brand data…'}
                  {fillStatus === 'done'    && 'Brand data ready — synced to edge network ✓'}
                  {fillStatus === 'error'   && 'Auto-fill failed — retry from Brand Data tab'}
                  {fillStatus === 'idle'    && 'Brand data fill pending…'}
                </div>
                <div className="text-xs text-ink-3 mt-0.5">
                  {fillStatus === 'running' && 'Still crawling origin URL — this takes ~1 minute. Go to View Domain to monitor DNS status.'}
                  {fillStatus === 'done'    && 'Once DNS goes active, run End-to-End Verification to confirm all 5 checks pass.'}
                  {fillStatus === 'error'   && `Could not crawl ${originUrl}. Go to Brand Data tab and click Auto-fill to retry.`}
                  {fillStatus === 'idle'    && 'Will crawl origin URL and fill brand data automatically.'}
                </div>
              </div>
            </div>

            {/* What's next */}
            <div className="bg-surface border border-divider-light rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-ink-2 mb-3">What's next</h3>
              <ol className="space-y-2 text-sm text-ink-3">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-bold text-ink-3 flex-shrink-0 mt-0.5">1</span>
                  Go back and add the CNAME record to your DNS provider if you haven't yet
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-bold text-ink-3 flex-shrink-0 mt-0.5">2</span>
                  The domain status auto-updates every 30s — it will switch to <strong className="text-ink">Active</strong> once DNS propagates
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center text-[10px] font-bold text-ink-3 flex-shrink-0 mt-0.5">3</span>
                  Once Active, run <strong className="text-ink">End-to-End Verification</strong> — all 5 must pass before notifying the customer
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/dashboard/visibility-proxy/${createdId}?domain=${encodeURIComponent(cleanedDomain)}&origin=${encodeURIComponent(originUrl.trim().replace(/\/$/, ''))}&status=pending&fresh=1`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl transition-colors"
              >
                View Domain
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/visibility-proxy"
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 text-sm font-medium rounded-xl transition-colors"
              >
                Back to Domains
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
