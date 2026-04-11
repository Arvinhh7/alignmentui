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

  const [step,      setStep]      = useState<Step>('form')
  const [domain,    setDomain]    = useState('')
  const [originUrl, setOriginUrl] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const handleDomainChange = (raw: string) => {
    // Auto-strip protocol and path so the field always shows a clean hostname
    setDomain(cleanDomain(raw))
  }

  const handleCreate = async () => {
    const cleanedDomain = cleanDomain(domain)
    if (!user?.id || !cleanedDomain || !originUrl.trim()) return
    if (!cleanedDomain.includes('.')) {
      setError('请输入有效域名，例如 acme.com 或 shop.acme.com')
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
              <label className="text-sm font-semibold text-ink-2 mb-1.5 block">客户域名</label>
              <input
                type="text"
                value={domain}
                onChange={e => handleDomainChange(e.target.value)}
                placeholder="acme.com"
                className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ink focus:bg-surface transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1.5">
                填入客户官网域名，支持粘贴完整 URL（自动提取域名）—
                例如 <code className="bg-surface-warm px-1 rounded">acme.com</code> 或 <code className="bg-surface-warm px-1 rounded">shop.acme.com</code>
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink-2 mb-1.5 block">Origin URL <span className="text-xs font-normal text-ink-3">（原站地址）</span></label>
              <input
                type="text"
                value={originUrl}
                onChange={e => setOriginUrl(e.target.value)}
                placeholder="https://acme.com"
                className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-xl text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ink focus:bg-surface transition-colors"
              />
              <p className="text-xs text-ink-3 mt-1.5">
                代理将流量转发到此地址 — 通常与上方域名相同（如 <code className="bg-surface-warm px-1 rounded">https://acme.com</code>）
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
              <h2 className="text-base font-semibold text-ink mb-1">在 DNS 后台添加 CNAME 记录</h2>
              <p className="text-sm text-ink-3 mb-5">
                登录客户的 DNS 管理后台（Cloudflare、GoDaddy、阿里云等），添加以下记录：
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
                <div className="font-semibold mb-0.5">如果客户域名已在 Cloudflare</div>
                <div className="text-ink-2">将 CNAME 的代理状态设为 <strong>DNS only</strong>（灰色云朵，非橙色），否则会产生代理循环。</div>
              </div>
            </div>

            <div className="bg-surface border border-divider rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-ink-2 mb-3">DNS Propagation</h3>
              <p className="text-sm text-ink-3 mb-4">
                添加 CNAME 后，DNS 通常在 <strong>1–5 分钟</strong>内生效（极少数情况下最长 48 小时）。
                生效后系统自动检测并激活代理。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('done')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  已添加 CNAME
                </button>
                <Link
                  href={`/dashboard/visibility-proxy/${createdId}`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface-warm hover:bg-surface-muted text-ink-2 text-sm font-medium rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  查看域名
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ─────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="bg-surface border border-divider rounded-2xl p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sage-bg flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-sage" />
            </div>
            <h2 className="text-xl font-bold text-ink mb-2">域名已添加</h2>
            <p className="text-sm text-ink-3 mb-6 max-w-sm mx-auto">
              <strong>{cleanedDomain}</strong> 已注册。DNS 生效后代理自动激活，
              现在可以先上传品牌数据。
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href={`/dashboard/visibility-proxy/${createdId}/assets`}
                className="flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-semibold rounded-xl transition-colors"
              >
                Upload Brand Data
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
