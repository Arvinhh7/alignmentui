'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
import Footer from '@/components/Footer'

// ── App Store listing URL (update once Shopify review is approved) ────────────
const SHOPIFY_APP_URL = 'https://apps.shopify.com/alignment-geo'

interface Post {
  slug: string
  date: string
  readTime: string
  tag: string
  title: { en: string; zh: string }
  excerpt: { en: string; zh: string }
  cta?: boolean // show Shopify CTA at end
}

const posts: Post[] = [
  {
    slug: 'what-is-geo-shopify',
    date: '2026-04-27',
    readTime: '6 min read',
    tag: 'GEO for Shopify',
    title: {
      en: 'What Is Generative Engine Optimization (GEO) — and Why Every Shopify Store Needs It in 2026',
      zh: '什么是 Generative Engine Optimization（GEO）—— 为什么每家 Shopify 店铺在 2026 年都需要它',
    },
    excerpt: {
      en: 'ChatGPT, Perplexity, and Google AI Mode now answer shopping questions directly — no clicks, no rankings. Shopify stores that optimise for AI citation get recommended; those that don\'t are invisible. Here\'s what GEO is and how to start.',
      zh: 'ChatGPT、Perplexity 和 Google AI Mode 已经开始直接回答购物问题，不再显示搜索结果列表。做好 GEO 的 Shopify 店铺会被 AI 推荐，没做的则完全透明。本文告诉你 GEO 是什么，以及如何起步。',
    },
    cta: true,
  },
  {
    slug: 'shopify-llms-txt-agent-json-guide',
    date: '2026-04-27',
    readTime: '8 min read',
    tag: 'Technical Guide',
    title: {
      en: 'llms.txt and agent.json: The Two Files That Make Your Shopify Store Visible to AI in 2026',
      zh: 'llms.txt 与 agent.json：让你的 Shopify 店铺在 2026 年被 AI 发现的两个关键文件',
    },
    excerpt: {
      en: 'AI agents crawl llms.txt to understand what your store sells. agent.json tells them your brand identity, product catalog structure, and citation preferences. Stores without these files are skipped entirely. This guide shows you how to add both in under 5 minutes.',
      zh: 'AI Agent 通过 llms.txt 了解你的店铺卖什么，通过 agent.json 获取品牌身份、产品目录结构和引用偏好。没有这两个文件的店铺会被直接跳过。本文教你如何在 5 分钟内完成配置。',
    },
    cta: true,
  },
]

export default function BlogPage() {
  const { t, lang } = useLanguage()

  const navLinks = [
    { label: t.nav.system,     href: '/system/' },
    { label: t.nav.technology, href: '/technology/' },
    { label: t.nav.pricing,    href: '/pricing/' },
    { label: t.nav.docs,       href: '/blog/' },
    { label: t.nav.insights,   href: '/insights/' },
    { label: t.nav.contact,    href: '/contact/' },
  ]

  const isZh = lang === 'zh'

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-divider-light">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <LogoFull width={130} height={43} />
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  item.href === '/blog/'
                    ? 'bg-accent/10 text-accent'
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold bg-ink text-surface rounded-xl hover:bg-ink/90 transition-colors"
            >
              {t.nav.getStarted}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="pt-20 pb-12 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {isZh ? '博客' : 'Blog'}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink mb-4">
            {isZh ? 'GEO 知识库与策略' : 'GEO Playbook & Insights'}
          </h1>
          <p className="text-lg text-ink-2 max-w-xl mx-auto">
            {isZh
              ? '掌握 Generative Engine Optimization 所需的一切 — 从基础概念到 Shopify 实战部署。'
              : 'Everything you need to master Generative Engine Optimization — from first principles to Shopify deployment.'}
          </p>
        </div>
      </section>

      {/* ── Shopify CTA Banner ────────────────────────────────────── */}
      <section className="px-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-[#96BF48]/10 to-[#96BF48]/5 border border-[#96BF48]/30 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-8 h-8 text-[#96BF48] shrink-0" viewBox="0 0 109 124" fill="currentColor">
                <path d="M74.7 14.8s-.3-1.5-1.4-1.5c-1 0-7.5.7-7.5.7s-5-4.9-5.5-5.4c-.5-.5-1.5-.3-1.9-.2L55 10.1C53.4 5.3 50.5.3 45.3.3c-.2 0-.3 0-.5 0C43.5-.8 41.9-.3 40.8.8c-7.8.2-11.5 9.8-12.7 14.7l-8.1 2.5c-2.5.8-2.6.8-2.9 3.2C16.9 23.2 1 143.8 1 143.8l78.8 13.6 34.4-7.3c0 0-38.6-131.8-39.5-134.3zM56.7 11.4l-7.1 2.2c1.2-4.6 3.5-6.8 5.4-7.9.6 1.8 1.4 4.2 1.7 5.7zM44.7 3.9c2.2.4 4.2 3.3 5.7 8.4l-9.4 2.9C42.3 11.8 43.5 5.4 44.7 3.9zM40.4 3.5c.4 0 .7 0 1 .1-.9 1.5-2.4 5.4-3.4 11l-8 2.5C31.3 12.5 34.5 3.7 40.4 3.5z"/>
              </svg>
              <div>
                <p className="font-semibold text-ink text-sm">
                  {isZh ? 'Alignment GEO — Shopify 应用' : 'Alignment GEO — Shopify App'}
                </p>
                <p className="text-xs text-ink-2">
                  {isZh ? '5 分钟内为你的店铺开启 AI 可见性' : 'AI visibility for your store in under 5 minutes'}
                </p>
              </div>
            </div>
            <a
              href={SHOPIFY_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 bg-[#96BF48] hover:bg-[#7FA83A] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              {isZh ? '免费安装' : 'Install Free'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── Post List ─────────────────────────────────────────────── */}
      <main className="px-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-8">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-surface border border-divider-light rounded-2xl p-8 hover:border-accent/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold bg-accent/10 text-accent px-3 py-1 rounded-full">
                  {post.tag}
                </span>
                <span className="text-xs text-ink-3">{post.date}</span>
                <span className="text-xs text-ink-3">·</span>
                <span className="text-xs text-ink-3">{post.readTime}</span>
              </div>
              <h2 className="text-xl font-bold text-ink mb-3 group-hover:text-accent transition-colors leading-snug">
                {isZh ? post.title.zh : post.title.en}
              </h2>
              <p className="text-ink-2 text-sm leading-relaxed mb-6">
                {isZh ? post.excerpt.zh : post.excerpt.en}
              </p>
              {post.cta && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <a
                    href={post.slug === 'shopify-llms-txt-agent-json-guide' || post.slug === 'what-is-geo-shopify'
                      ? SHOPIFY_APP_URL
                      : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#96BF48] hover:bg-[#7FA83A] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                  >
                    {isZh ? '在 Shopify 免费安装 Alignment GEO' : 'Install Alignment GEO on Shopify — Free'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
