'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/LanguageContext'
import { LogoFull } from '@/components/Logo'
import Footer from '@/components/Footer'
import PublicNavbar from '@/components/PublicNavbar'
import { BookOpen, ExternalLink } from 'lucide-react'

// ── Shopify App Store URL ─────────────────────────────────────────────────────
const SHOPIFY_APP_URL = 'https://apps.shopify.com/alignment-geo'

interface Post {
  slug: string
  date: string
  readTime: string
  tag: string
  tagColor: 'sage' | 'caution' | 'ink'
  title: { en: string; zh: string }
  excerpt: { en: string; zh: string }
  cta?: boolean
}

const posts: Post[] = [
  {
    slug: 'what-is-geo-shopify',
    date: '2026-04-27',
    readTime: '6 min read',
    tag: 'GEO for Shopify',
    tagColor: 'sage',
    title: {
      en: 'What Is Generative Engine Optimization (GEO) — and Why Every Shopify Store Needs It in 2026',
      zh: '什么是 Generative Engine Optimization（GEO）—— 为什么每家 Shopify 店铺在 2026 年都需要它',
    },
    excerpt: {
      en: 'ChatGPT, Perplexity, and Google AI Mode now answer shopping questions directly — no clicks, no rankings. Shopify stores that optimise for AI citation get recommended; those that don\'t are invisible. Here\'s what GEO is and how to start.',
      zh: 'ChatGPT、Perplexity 和 Google AI Mode 已经开始直接回答购物问题。做好 GEO 的 Shopify 店铺会被 AI 推荐，没做的则完全透明。本文告诉你 GEO 是什么，以及如何起步。',
    },
    cta: true,
  },
  {
    slug: 'shopify-llms-txt-agent-json-guide',
    date: '2026-04-27',
    readTime: '8 min read',
    tag: 'Technical Guide',
    tagColor: 'caution',
    title: {
      en: 'llms.txt and agent.json: The Two Files That Make Your Shopify Store Visible to AI in 2026',
      zh: 'llms.txt 与 agent.json：让你的 Shopify 店铺在 2026 年被 AI 发现的两个关键文件',
    },
    excerpt: {
      en: 'AI agents crawl llms.txt to understand what your store sells. agent.json tells them your brand identity, product catalog structure, and citation preferences. Stores without these files are skipped entirely. This guide shows you how to add both in under 5 minutes.',
      zh: 'AI Agent 通过 llms.txt 了解你的店铺卖什么，通过 agent.json 获取品牌身份和引用偏好。没有这两个文件的店铺会被直接跳过。本文教你如何在 5 分钟内完成配置。',
    },
    cta: true,
  },
]

const TAG_STYLES = {
  sage:    'bg-sage-bg text-sage',
  caution: 'bg-caution-bg text-caution',
  ink:     'bg-surface-warm text-ink-2',
}

export default function BlogPage() {
  const { t, lang } = useLanguage()
  const isZh = lang === 'zh'


  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <PublicNavbar activeHref="/blog/" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-14 overflow-hidden">
        {/* Subtle warm glow — same as other marketing pages */}
        <div className="absolute inset-0 bg-stripe-gradient pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-muted border border-divider rounded-full text-ink-2 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            {isZh ? '博客' : 'Blog'}
          </div>
          <h1 className="heading-section mb-4">
            {isZh ? 'GEO 知识库与策略' : 'GEO Playbook & Insights'}
          </h1>
          <p className="text-lead max-w-xl mx-auto">
            {isZh
              ? '掌握 Generative Engine Optimization 所需的一切 — 从基础概念到 Shopify 实战部署。'
              : 'Everything you need to master Generative Engine Optimization — from first principles to Shopify deployment.'}
          </p>
        </div>
      </section>

      {/* ── Shopify App CTA Banner ────────────────────────────────────── */}
      <section className="px-6 pb-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-sage-bg border border-sage/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shadow-elevation-sm flex-shrink-0">
                <svg className="w-6 h-6 text-sage" viewBox="0 0 109 124" fill="currentColor">
                  <path d="M74.7 14.8s-.3-1.5-1.4-1.5c-1 0-7.5.7-7.5.7s-5-4.9-5.5-5.4c-.5-.5-1.5-.3-1.9-.2L55 10.1C53.4 5.3 50.5.3 45.3.3c-.2 0-.3 0-.5 0C43.5-.8 41.9-.3 40.8.8c-7.8.2-11.5 9.8-12.7 14.7l-8.1 2.5c-2.5.8-2.6.8-2.9 3.2C16.9 23.2 1 143.8 1 143.8l78.8 13.6 34.4-7.3c0 0-38.6-131.8-39.5-134.3zM56.7 11.4l-7.1 2.2c1.2-4.6 3.5-6.8 5.4-7.9.6 1.8 1.4 4.2 1.7 5.7zM44.7 3.9c2.2.4 4.2 3.3 5.7 8.4l-9.4 2.9C42.3 11.8 43.5 5.4 44.7 3.9zM40.4 3.5c.4 0 .7 0 1 .1-.9 1.5-2.4 5.4-3.4 11l-8 2.5C31.3 12.5 34.5 3.7 40.4 3.5z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink text-sm">
                  {isZh ? 'Alignment GEO — Shopify 应用' : 'Alignment GEO — Shopify App'}
                </p>
                <p className="text-xs text-ink-2 mt-0.5">
                  {isZh ? '5 分钟内为你的店铺开启 AI 可见性' : 'AI visibility for your store in under 5 minutes'}
                </p>
              </div>
            </div>
            <a
              href={SHOPIFY_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 bg-ink text-ink-inv font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-soft hover:shadow-medium btn-shine"
            >
              {isZh ? '免费安装' : 'Install Free'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Post List ─────────────────────────────────────────────────── */}
      <main className="px-6 pb-28">
        <div className="max-w-3xl mx-auto space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="bg-surface border border-divider-light rounded-2xl p-8 shadow-elevation-sm hover:shadow-elevation-md hover:-translate-y-0.5 transition-all group"
            >
              {/* Meta row */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${TAG_STYLES[post.tagColor]}`}>
                  {post.tag}
                </span>
                <span className="text-xs text-ink-3">{post.date}</span>
                <span className="text-xs text-ink-3">·</span>
                <span className="text-xs text-ink-3">{post.readTime}</span>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-ink mb-3 leading-snug group-hover:opacity-80 transition-opacity">
                {isZh ? post.title.zh : post.title.en}
              </h2>

              {/* Excerpt */}
              <p className="text-ink-2 text-sm leading-relaxed mb-6">
                {isZh ? post.excerpt.zh : post.excerpt.en}
              </p>

              {/* CTA */}
              {post.cta && (
                <a
                  href={SHOPIFY_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-ink text-ink-inv font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-soft hover:shadow-medium btn-shine"
                >
                  {isZh ? '在 Shopify 免费安装 Alignment GEO' : 'Install Alignment GEO on Shopify — Free'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  )
}
