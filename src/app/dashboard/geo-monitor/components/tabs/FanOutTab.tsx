'use client'

import { useMemo } from 'react'
import { ArrowRight, GitBranch, Search, Sparkles } from 'lucide-react'
import { useUnified } from '../UnifiedContext'
import { CATEGORY_LABEL_MAP, INTENT_COLORS, resolveIntent } from '../shared/constants'

const LEGACY_INTENT_MAP: Record<string, string> = {
  commercial: 'action_choice',
  informational: 'info_cognition',
  navigational: 'solution_explore',
  transactional: 'action_choice',
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'best', 'for', 'how', 'in', 'is', 'me',
  'my', 'of', 'on', 'or', 'rated', 'the', 'to', 'tools', 'vs', 'what', 'which',
  'with', 'your',
])

interface PromptInput {
  id: string
  template: string
  category: string
  intent?: string
}

interface FanoutPath {
  prompt: PromptInput
  original: string
  intent: string
  variants: string[]
  coreTerms: string[]
}

function normalizeIntent(value: string) {
  return LEGACY_INTENT_MAP[value] ?? resolveIntent(value)
}

function cleanPrompt(text: string, brandName: string) {
  return text
    .replace(/\{brand\}/gi, brandName || 'the brand')
    .replace(/\s+/g, ' ')
    .trim()
}

function keywords(text: string) {
  return Array.from(new Set(
    text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word)),
  )).slice(0, 6)
}

function titleCase(value: string) {
  return value
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function topicLabel(original: string, brandName: string, terms: string[]) {
  if (terms.length >= 2) return terms.slice(0, 4).join(' ')
  return brandName || original.replace(/[?!.]+$/, '').slice(0, 56)
}

function buildVariants(original: string, intent: string, brandName: string, terms: string[]) {
  const brand = brandName || 'the brand'
  const topic = topicLabel(original, brand, terms)
  const year = new Date().getFullYear()

  if (intent === 'comparison_decision') {
    return [
      `How does ${brand} compare with other ${topic} options?`,
      `Which ${topic} alternative is better than ${brand}?`,
      `What are the pros and cons of choosing ${brand} for ${topic}?`,
    ]
  }

  if (intent === 'action_choice') {
    return [
      `Is ${brand} worth it for ${topic}?`,
      `What is the best ${topic} option like ${brand}?`,
      `Where can I buy or start using ${brand} for ${topic}?`,
    ]
  }

  if (intent === 'solution_explore') {
    return [
      `What solutions should I consider for ${topic}?`,
      `How can ${brand} help with ${topic}?`,
      `What features matter most when evaluating ${topic} solutions?`,
    ]
  }

  return [
    `What should I know about ${brand} and ${topic}?`,
    `What makes ${brand} different for ${topic}?`,
    `What do recent ${year} reviews say about ${brand} for ${topic}?`,
  ]
}

function buildFanoutPaths(prompts: PromptInput[], brandName: string): FanoutPath[] {
  return prompts.map(prompt => {
    const original = cleanPrompt(prompt.template, brandName)
    const intent = normalizeIntent(prompt.intent || prompt.category)
    const terms = keywords(original)
    return {
      prompt,
      original,
      intent,
      variants: buildVariants(original, intent, brandName, terms),
      coreTerms: terms.slice(0, 4),
    }
  })
}

export function FanOutTab() {
  const ctx = useUnified()
  const activePrompts = useMemo(() => ctx.prompts.filter(p => p.is_active), [ctx.prompts])
  const prompts = activePrompts.length ? activePrompts : ctx.prompts
  const promptInputs: PromptInput[] = prompts.length
    ? prompts
    : [{
        id: 'fallback',
        template: '{brand} recommendation request',
        category: 'action_choice',
        intent: 'action_choice',
      }]

  const paths = useMemo(
    () => buildFanoutPaths(promptInputs, ctx.brandConfig.brand_name || 'Your brand'),
    [promptInputs, ctx.brandConfig.brand_name],
  )

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-divider rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-ink-3" />
              <h3 className="text-sm font-semibold text-ink">Query FanOut Paths</h3>
            </div>
            <p className="text-xs text-ink-3 mt-1 max-w-4xl">
              Representative ways users may rewrite each tracked prompt into adjacent questions. Each prompt gets 3 likely fan-out prompts.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-canvas border border-divider-light px-3 py-1.5 text-xs font-medium text-ink-3">
            <Sparkles className="w-3.5 h-3.5" />
            Generated locally
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paths.map(path => {
          const intentStyle = INTENT_COLORS[path.intent] ?? INTENT_COLORS.info_cognition
          return (
            <div key={path.prompt.id} className="bg-surface border border-divider rounded-xl overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider-light px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-ink truncate">{path.coreTerms.join(' ') || ctx.brandConfig.brand_name || 'Tracked prompt'}</h4>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-3">
                      Top 3 paths
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${intentStyle.color}`}>
                  {CATEGORY_LABEL_MAP[path.intent] ?? titleCase(path.intent)}
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.9fr)_36px_minmax(420px,1.1fr)] gap-4 px-4 py-4 items-start">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">Original prompt</p>
                  <p className="text-sm font-medium text-ink leading-snug">{path.original}</p>
                </div>
                <ArrowRight className="hidden xl:block w-4 h-4 text-ink-3 justify-self-center mt-8" />
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">Possible fan-out prompts</p>
                  <div className="space-y-2">
                    {path.variants.map((variant, index) => (
                      <div key={`${path.prompt.id}-${index}`} className="flex max-w-full items-start gap-2 rounded-lg bg-canvas border border-divider-light px-3 py-2">
                        <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-semibold text-ink-3">
                          {index + 1}
                        </span>
                        <Search className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-ink-3" />
                        <span className="text-sm text-ink-2 leading-snug">{variant}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-divider bg-surface px-4 py-3">
        <p className="text-xs text-ink-3 leading-relaxed">
          Fan-out generation is a lightweight local estimate for planning. Monitoring cost starts only when prompts are run against AI platforms.
        </p>
      </div>
    </div>
  )
}
