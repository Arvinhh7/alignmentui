'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Link2, ExternalLink, FileText, Target, Quote, MessageSquareText } from 'lucide-react'
import { ScanMention } from '@/lib/api'
import {
  SUB_TYPE_LABELS,
  CATEGORY_LABEL_MAP,
  CATEGORY_COLORS,
  INTENT_CONTENT_MAP,
  autoClassify,
} from './constants'
import { highlightBrand, displayPrompt, stripMarkdown } from './ChartComponents'

/** Extract favicon URL from any cited URL using Google S2 service. */
function citedFavicon(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`
  } catch {
    return ''
  }
}

/** Shorten a URL for display: show host + first path segment only. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return u.hostname + (seg ? `/${seg}…` : '')
  } catch {
    return url
  }
}

export function isUnavailableMention(mention: ScanMention): boolean {
  const status = mention.response_status || 'ok'
  const response = (mention.response_text || '').trim()
  return (
    status === 'engine_error' ||
    status === 'cached_placeholder' ||
    response.startsWith('[Error:') ||
    response.startsWith('[cached')
  )
}

function engineLabel(platform?: string): string {
  const key = (platform || 'chatgpt').toLowerCase()
  if (key === 'chatgpt') return 'ChatGPT'
  if (key === 'perplexity') return 'Perplexity'
  if (key === 'gemini') return 'Gemini'
  if (key === 'claude') return 'Claude'
  return platform || 'AI'
}

export function MentionCard({ mention, brandName, index }: {
  mention: ScanMention; brandName: string; index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const subInfo = SUB_TYPE_LABELS[mention.mention_sub_type] || SUB_TYPE_LABELS.passing_reference
  const intentKey = autoClassify(mention.prompt_text).category
  const intentLabel = CATEGORY_LABEL_MAP[intentKey] || intentKey
  const intentColor = CATEGORY_COLORS[intentKey] || 'bg-surface-muted text-ink-3'
  const contentLinks = INTENT_CONTENT_MAP[intentKey] || []
  const unavailable = isUnavailableMention(mention)
  const cleanResponse = stripMarkdown(mention.response_text || '')

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${mention.mentioned ? 'border-sage/30' : unavailable ? 'border-caution/30' : 'border-divider'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${mention.mentioned ? 'bg-sage-bg text-sage' : unavailable ? 'bg-caution-bg text-caution' : 'bg-red-soft-bg text-red-soft'}`}>{index}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{displayPrompt(mention.prompt_text, brandName)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${intentColor}`}>{intentLabel}</span>
              {unavailable ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-caution-bg text-caution font-medium">Engine unavailable</span>
              ) : mention.mentioned ? (
                <>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${subInfo.color}`}>{subInfo.icon} {subInfo.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${mention.sentiment === 'positive' ? 'bg-sage-bg text-sage' : mention.sentiment === 'negative' ? 'bg-red-soft-bg text-red-soft' : 'bg-surface-warm text-ink-2'}`}>{mention.sentiment}</span>
                </>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-soft-bg text-red-soft font-medium">Not Mentioned</span>
              )}
              {mention.competitors_mentioned.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-caution-bg text-caution font-medium">
                  {mention.competitors_mentioned.length} competitor{mention.competitors_mentioned.length > 1 ? 's' : ''}
                </span>
              )}
              {mention.ordinal_rank != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-warm text-ink-2 font-bold">
                  #{mention.ordinal_rank} in list
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-ink-3" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-divider-light">
          {unavailable ? (
            <div className="mt-3 rounded-xl border border-caution/30 bg-caution-bg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-caution">
                <AlertCircle className="h-4 w-4" />
                AI answer unavailable
              </div>
              <p className="mt-1 text-xs leading-5 text-ink-2">
                {engineLabel(mention.platform)} did not return a usable answer for this prompt. This result is excluded from mention scoring; run the prompt again after the engine recovers.
              </p>
            </div>
          ) : mention.mentioned ? (
            <>
              {mention.mention_context && (
                <div className="mt-3 bg-caution-bg rounded-lg p-3 border border-caution/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Quote className="w-3 h-3 text-caution" />
                    <p className="text-xs font-semibold text-caution">How AI describes you</p>
                    <span className="text-[10px] text-ink-3">— the moment your brand appears</span>
                  </div>
                  <p className="text-sm text-ink-2 leading-relaxed">{highlightBrand(mention.mention_context, brandName)}</p>
                </div>
              )}
              {mention.key_phrases?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-3 mb-1.5">Key Phrases:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mention.key_phrases.map((kp, i) => {
                      const clean = stripMarkdown(kp)
                      return (
                        <span key={i} className="text-xs px-2 py-1 bg-surface-warm text-ink-2 rounded-lg">
                          {clean.length > 80 ? clean.slice(0, 80) + '…' : clean}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              {mention.referenced_sources?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-3 mb-1.5">Referenced Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {mention.referenced_sources.map((src, i) => (
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${src.source_type === 'editorial' ? 'bg-surface-warm text-ink-2' : src.source_type === 'ugc' ? 'bg-caution-bg text-caution' : src.source_type === 'you' ? 'bg-sage-bg text-sage' : src.source_type === 'corporate' ? 'bg-surface-warm text-ink-2' : 'bg-surface-warm text-ink-2'}`}>
                        {src.name} {src.frequency > 1 ? `(\u00d7${src.frequency})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mention.cited_urls?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-3 mb-1.5 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Cited URLs:
                  </p>
                  <div className="space-y-1">
                    {mention.cited_urls.map((url, i) => {
                      const favicon = citedFavicon(url)
                      return (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink group"
                          title={url}
                        >
                          {favicon
                            ? <img src={favicon} className="w-3.5 h-3.5 flex-shrink-0 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          }
                          <span className="truncate group-hover:underline">{shortUrl(url)}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="mt-3 rounded-xl border border-divider-light bg-canvas p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-ink-3" />
                  <p className="text-xs font-semibold text-ink-2">AI Response</p>
                  <span className="text-[10px] text-ink-3">— {engineLabel(mention.platform)} answer to this prompt</span>
                </div>
                <p className="border-l-2 border-sage/50 pl-3 text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{highlightBrand(cleanResponse, brandName)}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {/* List Rank: ordinal position in AI's numbered list (meaningful) */}
                <div className="bg-surface-warm rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-ink-2">
                    {mention.ordinal_rank != null ? `#${mention.ordinal_rank}` : '—'}
                  </p>
                  <p className="text-xs text-ink-2">List Rank</p>
                </div>
                {/* Prominence: how the AI positioned the brand in this response */}
                <div className="bg-surface-warm rounded-lg p-3 text-center flex flex-col items-center justify-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold leading-tight ${subInfo.color}`}>
                    {subInfo.label}
                  </span>
                  <p className="text-xs text-ink-2">Prominence</p>
                </div>
                {/* Sentiment score */}
                <div className="bg-surface-warm rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold font-mono ${mention.sentiment_score > 0 ? 'text-sage' : mention.sentiment_score < 0 ? 'text-red-soft' : 'text-ink-2'}`}>
                    {mention.sentiment_score > 0 ? '+' : ''}{mention.sentiment_score.toFixed(2)}
                  </p>
                  <p className="text-xs text-ink-2">Sentiment</p>
                </div>
              </div>
              {mention.competitors_mentioned.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-3 mb-1.5">Competitors Also Mentioned:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mention.competitors_mentioned.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-caution-bg text-caution rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-3 bg-red-soft-bg rounded-lg p-4 border border-red-soft/30">
                <p className="text-sm text-ink font-medium mb-1">Brand not mentioned in AI response</p>
                <p className="text-xs text-red-soft">AI did not mention your brand for this query. Use the signals below to plan content & PR.</p>
              </div>

              {/* ── Strategic intel: who took your spot, what AI cited, judging criteria ─── */}
              {(mention.competitors_mentioned.length > 0 || mention.cited_urls.length > 0 || mention.key_phrases?.length > 0) && (
                <div className="mt-3 bg-surface-warm/50 rounded-lg p-4 border border-divider">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Target className="w-3.5 h-3.5 text-ink-2" />
                    <p className="text-xs font-semibold text-ink-2">What this tells you</p>
                    <span className="text-[10px] text-ink-3">— extract these signals into your GEO plan</span>
                  </div>

                  {mention.competitors_mentioned.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-medium text-ink-3 mb-1.5">
                        Brands AI recommended instead ({mention.competitors_mentioned.length})
                        <span className="text-[10px] text-ink-3/70 ml-1">→ your direct AI-shelf competitors</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mention.competitors_mentioned.map((c, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-caution-bg text-caution rounded-full font-medium">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {mention.cited_urls.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-medium text-ink-3 mb-1.5 flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        Sources AI trusted ({mention.cited_urls.length})
                        <span className="text-[10px] text-ink-3/70 ml-1">→ your citation gap (PR / content targets)</span>
                      </p>
                      <div className="space-y-1">
                        {mention.cited_urls.slice(0, 5).map((url, i) => {
                          const favicon = citedFavicon(url)
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink group"
                              title={url}
                            >
                              {favicon
                                ? <img src={favicon} className="w-3.5 h-3.5 flex-shrink-0 rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                : <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              }
                              <span className="truncate group-hover:underline">{shortUrl(url)}</span>
                              <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </a>
                          )
                        })}
                        {mention.cited_urls.length > 5 && (
                          <p className="text-[10px] text-ink-3 italic">+{mention.cited_urls.length - 5} more</p>
                        )}
                      </div>
                    </div>
                  )}

                  {mention.key_phrases?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-ink-3 mb-1.5">
                        Judging criteria AI used
                        <span className="text-[10px] text-ink-3/70 ml-1">→ your content angle must hit these framings</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mention.key_phrases.slice(0, 6).map((kp, i) => {
                          const clean = stripMarkdown(kp)
                          return (
                            <span key={i} className="text-xs px-2 py-1 bg-surface-warm text-ink-2 rounded-lg">
                              {clean.length > 60 ? clean.slice(0, 60) + '…' : clean}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 rounded-xl border border-divider-light bg-canvas p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-ink-3" />
                  <p className="text-xs font-semibold text-ink-2">AI Response</p>
                  <span className="text-[10px] text-ink-3">— {engineLabel(mention.platform)} answer to this prompt</span>
                </div>
                <p className="border-l-2 border-sage/50 pl-3 text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{highlightBrand(cleanResponse, brandName)}</p>
              </div>

              {contentLinks.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-3 font-medium">Fill this gap:</span>
                  {contentLinks.map(cl => (
                    <a key={cl.type} href={cl.url} className="text-xs px-3 py-1.5 bg-red-soft-bg border border-red-soft/30 rounded-full text-red-soft hover:text-ink hover:border-divider font-medium transition-colors flex items-center gap-1">
                      <FileText className="w-3 h-3" />{cl.label}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
