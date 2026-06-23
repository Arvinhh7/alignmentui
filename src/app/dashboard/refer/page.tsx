'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gift, Mail, Linkedin, Twitter, MessageCircle, Slack, Copy, Check, Users, TrendingUp, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/lib/LanguageContext'
import { api, type ReferralOverview } from '@/lib/api'

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

  const shareButtons = [
    { key: 'email', label: 'Email', icon: Mail, onClick: () => openShare(`mailto:?subject=${encodeURIComponent(t('Track your brand across AI', '追踪你的品牌在 AI 中的表现'))}&body=${encodeURIComponent(fullMsg)}`) },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, onClick: () => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`) },
    { key: 'x', label: 'X', icon: Twitter, onClick: () => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`) },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, onClick: () => openShare(`https://wa.me/?text=${encodeURIComponent(fullMsg)}`) },
    // Slack has no simple web-share intent — copy the message for pasting.
    { key: 'slack', label: 'Slack', icon: Slack, onClick: () => copy(fullMsg, 'slack') },
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
                  const Icon = b.icon
                  const isSlackCopied = b.key === 'slack' && copied === 'slack'
                  return (
                    <button
                      key={b.key}
                      onClick={b.onClick}
                      className="inline-flex items-center gap-2 rounded-xl border border-divider-light bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:bg-surface-warm hover:border-divider transition-colors"
                    >
                      {isSlackCopied ? <Check className="w-4 h-4 text-sage" /> : <Icon className="w-4 h-4" />}
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
