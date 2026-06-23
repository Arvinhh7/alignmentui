import type { Language } from '@/lib/i18n'

// ── Product Tour step config ────────────────────────────────────────────────
// The tour stays on /dashboard/analysis and spotlights sidebar nav items one by
// one (it does NOT navigate between pages until the final "Get started"). Each
// `anchor` is a [data-tour="…"] value set on the matching Sidebar nav link;
// `anchor: null` renders a centered modal with no spotlight (the welcome step).
//
// Narrative = the diagnose → fix loop:
//   Welcome → Analysis (score) → AI Research (vs competitors) →
//   Monitoring (track) → Sources (proof) → GEO Optimization (fix) → Get started.

export type Locale = Language // 'en' | 'zh'

export interface TourCopy {
  en: string
  zh: string
}

export interface TourStep {
  key: string
  /** data-tour anchor on a Sidebar nav item, or null for a centered modal. */
  anchor: string | null
  title: TourCopy
  body: TourCopy
}

export const TOUR_STEPS: TourStep[] = [
  {
    key: 'welcome',
    anchor: null,
    title: {
      en: 'Welcome to Alignment',
      zh: '欢迎使用 Alignment',
    },
    body: {
      en: "In about 30 seconds, here's how Alignment gets {brand} found, cited, and recommended by AI. Take a quick look.",
      zh: '用大约 30 秒,了解 Alignment 如何让 {brand} 被 AI 发现、引用并推荐。我们快速看一遍。',
    },
  },
  {
    key: 'analysis',
    anchor: 'analysis',
    title: {
      en: 'Your AI visibility scorecard',
      zh: '你的 AI 可见度计分卡',
    },
    body: {
      en: 'Track how often AI mentions you — Visibility, Sentiment, Position, and Share of Voice — across ChatGPT, Gemini, Perplexity, and Claude.',
      zh: '追踪 AI 多频繁提到你 —— 可见度、情感、排名、声量份额 —— 覆盖 ChatGPT、Gemini、Perplexity、Claude。',
    },
  },
  {
    key: 'ai-search',
    anchor: 'ai-search',
    title: {
      en: 'See where you stand',
      zh: '看清你的位置',
    },
    body: {
      en: 'AI Research shows how you rank against competitors and which trusted sources AI cites — your starting diagnosis.',
      zh: 'AI Research 显示你与竞品的排名,以及 AI 引用了哪些可信来源 —— 这是你的初始诊断。',
    },
  },
  {
    key: 'geo-monitor',
    anchor: 'geo-monitor',
    title: {
      en: 'Track the real questions',
      zh: '追踪真实问题',
    },
    body: {
      en: 'Monitoring follows the actual prompts buyers ask AI, and how your brand shows up in each answer — over time.',
      zh: 'Monitoring 跟踪买家向 AI 提的真实问题,以及你的品牌在每个回答中的表现 —— 持续追踪。',
    },
  },
  {
    key: 'sources',
    anchor: 'sources',
    title: {
      en: 'The URLs AI trusts',
      zh: 'AI 信任的来源',
    },
    body: {
      en: 'Sources reveals the exact pages AI cites in its answers — the path to getting your brand cited too.',
      zh: 'Sources 揭示 AI 在回答中引用的具体页面 —— 这是让你的品牌也被引用的路径。',
    },
  },
  {
    key: 'geo-optimization',
    anchor: 'geo-optimization',
    title: {
      en: 'Turn gaps into fixes',
      zh: '把差距变成修复',
    },
    body: {
      en: 'GEO Optimization converts what AI is missing into concrete fixes — llms.txt, FAQ, and Schema markup that engines read.',
      zh: 'GEO Optimization 把 AI 缺失的信息转成具体修复 —— 引擎能读的 llms.txt、FAQ、Schema 标记。',
    },
  },
  {
    key: 'brand-hub',
    anchor: 'brand-hub',
    title: {
      en: 'Start with your Brand Profile',
      zh: '从品牌档案开始',
    },
    body: {
      en: "Your Brand Profile gives AI engines the exact context they need to cite and recommend {brand}. Let's fill it in now.",
      zh: '品牌档案为 AI 引擎提供引用和推荐 {brand} 所需的精准上下文。现在就来填写吧。',
    },
  },
]

// Replace the {brand} token; falls back to a neutral noun when brand unknown.
export function fillBrand(text: string, brand: string, lang: Locale): string {
  const fallback = lang === 'zh' ? '你的品牌' : 'your brand'
  return text.replace('{brand}', brand?.trim() || fallback)
}

export const TOUR_UI = {
  skip:  { en: 'Skip tour', zh: '跳过' },
  back:  { en: 'Back',      zh: '上一步' },
  next:  { en: 'Next',      zh: '下一步' },
  start: { en: 'Get started', zh: '开始使用' },
  stepOf: { en: (a: number, b: number) => `${a} of ${b}`, zh: (a: number, b: number) => `第 ${a} / ${b} 步` },
  replay: { en: 'Take a tour', zh: '产品导览' },
} as const
