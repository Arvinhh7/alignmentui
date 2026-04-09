'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Link2, ExternalLink, FileText } from 'lucide-react'
import { ScanMention } from '@/lib/api'
import {
  SUB_TYPE_LABELS,
  CATEGORY_LABEL_MAP,
  CATEGORY_COLORS,
  INTENT_CONTENT_MAP,
  autoClassify,
} from './constants'
import { highlightBrand, displayPrompt } from './ChartComponents'

export function MentionCard({ mention, brandName, index }: {
  mention: ScanMention; brandName: string; index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const subInfo = SUB_TYPE_LABELS[mention.mention_sub_type] || SUB_TYPE_LABELS.passing_reference
  const intentKey = autoClassify(mention.prompt_text).category
  const intentLabel = CATEGORY_LABEL_MAP[intentKey] || intentKey
  const intentColor = CATEGORY_COLORS[intentKey] || 'bg-surface-muted text-ink-3'
  const contentLinks = INTENT_CONTENT_MAP[intentKey] || []

  return (
    <div className={`bg-surface rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${mention.mentioned ? 'border-sage/30' : 'border-divider'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${mention.mentioned ? 'bg-sage-bg text-sage' : 'bg-red-soft-bg text-red-soft'}`}>{index}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{displayPrompt(mention.prompt_text, brandName)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${intentColor}`}>{intentLabel}</span>
              {mention.mentioned ? (
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
          {mention.mentioned ? (
            <>
              {mention.mention_context && (
                <div className="mt-3 bg-caution-bg rounded-lg p-3 border border-caution/30">
                  <p className="text-xs font-medium text-caution mb-1">Brand Context:</p>
                  <p className="text-sm text-ink-2 leading-relaxed">{highlightBrand(mention.mention_context, brandName)}</p>
                </div>
              )}
              {mention.key_phrases?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-3 mb-1.5">Key Phrases:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mention.key_phrases.map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-surface-warm text-ink-2 rounded-lg">
                        {kp.length > 80 ? kp.slice(0, 80) + '...' : kp}
                      </span>
                    ))}
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
                  <p className="text-xs font-medium text-ink-3 mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Cited URLs:</p>
                  <div className="space-y-1">
                    {mention.cited_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink hover:underline truncate">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />{url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 bg-canvas rounded-lg p-4">
                <p className="text-xs font-medium text-ink-3 mb-2">Full Response:</p>
                <p className="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{highlightBrand(mention.response_text, brandName)}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-surface-warm rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-ink-2">{mention.position !== null && mention.position !== undefined ? `#${mention.position}` : '—'}</p>
                  <p className="text-xs text-ink-2">Position</p>
                </div>
                <div className="bg-sage-bg rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-sage">{(mention.position_score * 100).toFixed(0)}%</p>
                  <p className="text-xs text-sage">Position Score</p>
                </div>
                <div className="bg-surface-warm rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-ink-2">{mention.sentiment_score > 0 ? '+' : ''}{mention.sentiment_score.toFixed(2)}</p>
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
                <p className="text-xs text-red-soft">AI did not mention your brand for this query. Consider creating content to fill this gap.</p>
              </div>
              <div className="mt-3 bg-canvas rounded-lg p-4">
                <p className="text-xs font-medium text-ink-3 mb-2">Full Response:</p>
                <p className="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{mention.response_text}</p>
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
