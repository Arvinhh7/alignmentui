'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Gift, Copy, Check, Users, TrendingUp, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/lib/LanguageContext'
import { api, type ReferralOverview } from '@/lib/api'

// ── Official brand icons ───────────────────────────────────────────────────────
function IconEmail() {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#EA4335"/>
      <path d="M5 8.5l7 4.5 7-4.5M5 8.5V17h14V8.5a1 1 0 00-1-1H6a1 1 0 00-1 1z" stroke="white" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function IconSlack() {
  return (
    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  )
}

export default function ReferPage() {
  const { user } = useAuth()
  const { lang } = useLanguage()
  const t = (en: string, zh: string) => (lang === 'zh' ? zh : en)

  const [data, setData] = useState<ReferralOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'link' | 'slack' | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    api.getReferral(user.id)
      .then(res => { if (!cancelled && res.data) setData(res.data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  const shareUrl = data?.share_url ?? ''
  const refereeBonus = data?.referee_bonus ?? 50
  const referrerReward = data?.referrer_reward ?? 100

  const message = t(
    `I've been using Alignment to track how my brand shows up across ChatGPT, Gemini, Perplexity, and AI Overviews — the cleanest read I've found on AI search visibility. Grab ${refereeBonus} bonus credits with my link:`,
    `我一直在用 Alignment 追踪我的品牌在 ChatGPT、Gemini、Perplexity 和 AI Overviews 里的表现 —— 这是我见过最清晰的 AI 搜索可见度工具。用我的链接领取 ${refereeBonus} 积分:`,
  )
  const fullMsg = `${message} ${shareUrl}`

  const copy = useCallback((text: string, which: 'link' | 'slack') => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 1800)
    }).catch(() => {})
  }, [])

  const openShare = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

  const shareButtons: { key: string; label: string; icon: ReactNode; onClick: () => void }[] = [
    { key: 'email',    label: 'Email',     icon: <IconEmail />,    onClick: () => openShare(`mailto:?subject=${encodeURIComponent(t('Track your brand across AI', '追踪你的品牌在 AI 中的表现'))}&body=${encodeURIComponent(fullMsg)}`) },
    { key: 'linkedin', label: 'LinkedIn',  icon: <IconLinkedIn />, onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`) },
    { key: 'x',        label: 'X',         icon: <IconX />,        onClick: () => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`) },
    { key: 'whatsapp', label: 'WhatsApp',  icon: <IconWhatsApp />, onClick: () => openShare(`https://wa.me/?text=${encodeURIComponent(fullMsg)}`) },
    // Slack has no simple web-share intent — copy the message for pasting.
    { key: 'slack',    label: 'Slack',     icon: <IconSlack />,    onClick: () => copy(fullMsg, 'slack') },
  ]

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div className="bg-surface border-b border-divider-light px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sage-bg flex items-center justify-center">
            <Gift className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h1 className="heading-dash">{t('Refer & earn credits', '邀请好友,赚取积分')}</h1>
            <p className="text-sm text-ink-3">
              {t('Share Alignment — they get bonus credits, you earn credits when they subscribe.',
                 '分享 Alignment —— 好友获得积分奖励,他们订阅后你也赚取积分。')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-ink-3 py-12 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('Loading your referral link…', '正在加载你的邀请链接…')}
          </div>
        ) : (
          <>
            {/* Reward summary */}
            <div className="rounded-2xl border border-divider bg-surface p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t('They get', '好友获得')}</div>
                  <div className="mt-1 text-[20px] font-bold text-sage">{refereeBonus} {t('credits', '积分')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t('You earn', '你赚取')}</div>
                  <div className="mt-1 text-[20px] font-bold text-ink">{referrerReward} {t('credits', '积分')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t('Trigger', '触发条件')}</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-2">{t('First paid checkout', '首次付费订阅')}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">{t('Redemption', '到账方式')}</div>
                  <div className="mt-1 text-[13px] font-semibold text-ink-2">{t('Auto · no expiry', '自动 · 永不过期')}</div>
                </div>
              </div>
            </div>

            {/* Share */}
            <div className="rounded-2xl border border-divider bg-surface p-6">
              <div className="text-[13px] font-bold text-ink mb-3">{t('Send via', '分享方式')}</div>
              <div className="flex flex-wrap gap-2 mb-5">
                {shareButtons.map(b => {
                  const isSlackCopied = b.key === 'slack' && copied === 'slack'
                  return (
                    <button
                      key={b.key}
                      onClick={b.onClick}
                      className="inline-flex items-center gap-2 rounded-xl border border-divider-light bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-warm hover:border-divider transition-colors"
                    >
                      {isSlackCopied ? <Check className="w-4 h-4 text-sage" /> : b.icon}
                      {isSlackCopied ? t('Copied', '已复制') : b.label}
                    </button>
                  )
                })}
              </div>

              {/* Pre-filled message */}
              <div className="rounded-xl border border-divider-light bg-surface-warm p-4 text-[13px] leading-relaxed text-ink-2 mb-4">
                {fullMsg}
              </div>

              {/* Link + copy */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 rounded-xl border border-divider-light bg-canvas px-3 py-2.5 text-[12px] text-ink-3 truncate font-mono">
                  {shareUrl || '—'}
                </div>
                <button
                  onClick={() => shareUrl && copy(shareUrl, 'link')}
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-ink-inv hover:bg-ink/80 transition-colors"
                >
                  {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied === 'link' ? t('Copied', '已复制') : t('Copy link', '复制链接')}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={<Users className="w-4 h-4 text-ink-3" />} label={t('Invited', '已邀请')} value={data?.invited ?? 0} />
              <StatCard icon={<TrendingUp className="w-4 h-4 text-sage" />} label={t('Converted', '已转化')} value={data?.converted ?? 0} />
              <StatCard icon={<Gift className="w-4 h-4 text-ink-3" />} label={t('Credits earned', '已赚取积分')} value={data?.credits_earned ?? 0} />
            </div>

            <p className="text-[11px] text-ink-3 text-center">
              {t(`Your referral credits never expire and are spent automatically after your monthly plan credits. Current wallet balance: ${data?.wallet_balance ?? 0} credits.`,
                 `邀请积分永不过期,会在你的月度套餐积分用完后自动使用。当前钱包余额:${data?.wallet_balance ?? 0} 积分。`)}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-divider-light bg-surface p-5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[24px] font-bold text-ink tabular-nums">{value}</div>
    </div>
  )
}
