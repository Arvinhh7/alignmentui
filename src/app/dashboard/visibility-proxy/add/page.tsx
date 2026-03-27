'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { proxyApi } from '@/lib/api'
import {
  Globe, ArrowLeft, ArrowRight, Copy, CheckCheck,
  CheckCircle, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react'

type Step = 'form' | 'dns' | 'done'

const CNAME_TARGET = 'alignment-proxy.qiulimu1030.workers.dev'

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
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function AddDomainPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [step, setStep] = useState<Step>('form')
  const [domain, setDomain] = useState('')
  const [originUrl, setOriginUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!user?.id || !domain.trim() || !originUrl.trim()) return
    setLoading(true)
    setError(null)

    // Normalise origin URL
    let origin = originUrl.trim()
    if (!origin.startsWith('http')) origin = `https://${origin}`

    try {
      const created = await proxyApi.createDomain(user.id, domain.trim().toLowerCase(), origin)
      setCreatedId(created.id)
      setStep('dns')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create domain')
    } finally {
      setLoading(false)
    }
  }

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
            <h1 className="text-xl font-bold text-gray-900">Add Domain</h1>
            <p className="text-sm text-gray-400">Connect your domain to the Alignment Visibility Proxy</p>
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
                  done ? 'bg-green-500 text-white' : active ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>{labels[i]}</span>
                {i < 2 && <div className={`flex-1 h-px mx-1 ${done ? 'bg-green-300' : 'bg-gray-200'}`} />}
              </div>
            )
          })}
        </div>

        {/* ── Step 1: Form ──────────────────────────────────────────── */}
        {step === 'form' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Your Domain</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="acme.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                The domain you want to proxy — e.g. <code className="bg-gray-100 px-1 rounded">acme.com</code> or <code className="bg-gray-100 px-1 rounded">shop.acme.com</code>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Origin URL</label>
              <input
                type="text"
                value={originUrl}
                onChange={e => setOriginUrl(e.target.value)}
                placeholder="https://origin.acme.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-400 focus:bg-white transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Where our proxy should forward traffic to — your original web server or CDN URL.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !domain.trim() || !originUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Continue to DNS Setup'}
            </button>
          </div>
        )}

        {/* ── Step 2: DNS Instructions ─────────────────────────────── */}
        {step === 'dns' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Add this CNAME record to your DNS</h2>
              <p className="text-sm text-gray-400 mb-5">
                Log in to your DNS provider (Cloudflare, GoDaddy, Route 53, etc.) and add the following record:
              </p>

              <div className="bg-gray-950 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500">DNS Record</span>
                  <CopyButton text={`CNAME ${domain} ${CNAME_TARGET}`} />
                </div>
                <div className="p-4 space-y-2 font-mono text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 w-16 flex-shrink-0">Type</span>
                    <span className="text-green-400">CNAME</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 w-16 flex-shrink-0">Name</span>
                    <span className="text-blue-300">{domain}</span>
                    <CopyButton text={domain} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 w-16 flex-shrink-0">Target</span>
                    <span className="text-yellow-300 break-all">{CNAME_TARGET}</span>
                    <CopyButton text={CNAME_TARGET} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 w-16 flex-shrink-0">TTL</span>
                    <span className="text-gray-400">Auto (or 300)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <div className="font-semibold mb-0.5">If your domain is already on Cloudflare</div>
                <div className="text-amber-700">Set the CNAME to <strong>DNS only</strong> (grey cloud, not orange) to avoid a proxy loop.</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">DNS Propagation</h3>
              <p className="text-sm text-gray-500 mb-4">
                After adding the CNAME, DNS changes typically propagate within <strong>1–5 minutes</strong> (up to 48 hours in rare cases). Once the CNAME is live, our system automatically detects and activates your domain.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('done')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  I've Added the CNAME
                </button>
                <Link
                  href={`/dashboard/visibility-proxy/${createdId}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
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
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Domain Added!</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              <strong>{domain}</strong> is now registered. Once DNS propagates, the proxy activates automatically. You can upload your brand data now.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/dashboard/visibility-proxy/${createdId}/assets`}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Upload Brand Data
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard/visibility-proxy"
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
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
