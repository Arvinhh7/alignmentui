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
  const intentColor = CATEGORY_COLORS[intentKey] || 'bg-gray-100 text-gray-600'
  const contentLinks = INTENT_CONTENT_MAP[intentKey] || []

  return (
    <div className={`bg-white rounded-xl border overflow-hidden hover:shadow-sm transition-shadow ${mention.mentioned ? 'border-green-200' : 'border-gray-200'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${mention.mentioned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{index}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayPrompt(mention.prompt_text, brandName)}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${intentColor}`}>{intentLabel}</span>
              {mention.mentioned ? (
                <>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${subInfo.color}`}>{subInfo.icon} {subInfo.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${mention.sentiment === 'positive' ? 'bg-green-100 text-green-700' : mention.sentiment === 'negative' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{mention.sentiment}</span>
                </>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not Mentioned</span>
              )}
              {mention.competitors_mentioned.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                  {mention.competitors_mentioned.length} competitor{mention.competitors_mentioned.length > 1 ? 's' : ''}
                </span>
              )}
              {mention.ordinal_rank != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                  #{mention.ordinal_rank} in list
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {mention.mentioned ? (
            <>
              {mention.mention_context && (
                <div className="mt-3 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                  <p className="text-xs font-medium text-yellow-700 mb-1">Brand Context:</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{highlightBrand(mention.mention_context, brandName)}</p>
                </div>
              )}
              {mention.key_phrases?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Key Phrases:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mention.key_phrases.map((kp, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                        {kp.length > 80 ? kp.slice(0, 80) + '...' : kp}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mention.referenced_sources?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Referenced Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {mention.referenced_sources.map((src, i) => (
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${src.source_type === 'editorial' ? 'bg-blue-100 text-blue-700' : src.source_type === 'ugc' ? 'bg-yellow-100 text-yellow-700' : src.source_type === 'you' ? 'bg-green-100 text-green-700' : src.source_type === 'corporate' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>
                        {src.name} {src.frequency > 1 ? `(\u00d7${src.frequency})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mention.cited_urls?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Cited URLs:</p>
                  <div className="space-y-1">
                    {mention.cited_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate">
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />{url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Full Response:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{highlightBrand(mention.response_text, brandName)}</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-blue-700">{mention.position !== null && mention.position !== undefined ? `#${mention.position}` : '—'}</p>
                  <p className="text-xs text-blue-600">Position</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-green-700">{(mention.position_score * 100).toFixed(0)}%</p>
                  <p className="text-xs text-green-600">Position Score</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold font-mono text-purple-700">{mention.sentiment_score > 0 ? '+' : ''}{mention.sentiment_score.toFixed(2)}</p>
                  <p className="text-xs text-purple-600">Sentiment</p>
                </div>
              </div>
              {mention.competitors_mentioned.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Competitors Also Mentioned:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mention.competitors_mentioned.map((c, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-3 bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm text-red-800 font-medium mb-1">Brand not mentioned in AI response</p>
                <p className="text-xs text-red-600">AI did not mention your brand for this query. Consider creating content to fill this gap.</p>
              </div>
              <div className="mt-3 bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Full Response:</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{mention.response_text}</p>
              </div>
              {contentLinks.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Fill this gap:</span>
                  {contentLinks.map(cl => (
                    <a key={cl.type} href={cl.url} className="text-xs px-3 py-1.5 bg-red-50 border border-red-200 rounded-full text-red-600 hover:text-red-700 hover:border-red-300 font-medium transition-colors flex items-center gap-1">
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
