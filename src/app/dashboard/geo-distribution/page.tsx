'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/lib/LanguageContext'
import {
  api,
  notifyCreditUsed,
  ChannelStrategyResultData,
  ChannelRecommendationData,
  RedditStrategyResultData,
  SubredditRecommendationData,
  CompetitorRedditPresenceData,
  RedditPostTemplateData,
  RedditCalendarItemData,
  ContentQueueItemData,
  ContentChannelMatchData,
  MonitorSyncResultData,
  DistributionMapResultData,
  DistributionMapItemData,
  QueueStatsData,
} from '@/lib/api'
import {
  Share2, Globe, MessageSquare, BookOpen, Search,
  ArrowUpRight, Clock, CheckCircle, AlertCircle,
  XCircle, Plus, Calendar, BarChart3, Filter,
  ChevronRight, Zap, Target, TrendingUp, Sparkles,
  MapPin, ExternalLink, AlertTriangle, Shield,
  Star, ArrowRight, Loader2, StopCircle, Trash2,
  ChevronDown, ChevronUp, Info, Download, Map, Eye, Activity,
  Link2, CircleDot, Layers, Copy, Users, FileText, CalendarDays,
  Crosshair, Swords, Flame, Gauge, History,
  Package, ListChecks, ArrowUpDown, Pencil, X, Save,
} from 'lucide-react'

// ─── Priority styling ──────────────────────────────────
function priorityStyle(p: string) {
  switch (p) {
    case 'critical': return { bg: 'bg-red-soft-bg', text: 'text-red-soft', border: 'border-red-soft/30', dot: 'bg-red-soft', label: 'CRITICAL' }
    case 'high': return { bg: 'bg-caution-bg', text: 'text-caution', border: 'border-caution/30', dot: 'bg-caution', label: 'HIGH' }
    case 'medium': return { bg: 'bg-caution-bg', text: 'text-caution', border: 'border-caution/30', dot: 'bg-caution', label: 'MEDIUM' }
    default: return { bg: 'bg-surface-warm', text: 'text-ink-2', border: 'border-divider', dot: 'bg-ink/20', label: 'LOW' }
  }
}

function presenceStyle(p: string) {
  switch (p) {
    case 'strong': return { bg: 'bg-sage-bg', text: 'text-sage', label: 'Strong' }
    case 'moderate': return { bg: 'bg-surface-warm', text: 'text-ink-2', label: 'Moderate' }
    case 'weak': return { bg: 'bg-caution-bg', text: 'text-caution', label: 'Weak' }
    default: return { bg: 'bg-surface-warm', text: 'text-ink-3', label: 'None' }
  }
}

// ─── Source category icons ─────────────────────────────
function catIcon(cat: string) {
  switch (cat) {
    case 'ugc': return '👥'
    case 'editorial': return '📰'
    case 'corporate': return '🏢'
    case 'reference': return '📖'
    case 'institutional': return '🎓'
    case 'competitor': return '⚔️'
    case 'you': return '🏠'
    default: return '📋'
  }
}

// ─── Push Content Modal ────────────────────────────────
interface RedditTemplateOption {
  id: string; template_name: string; target_subreddit: string; post_type: string;
  title_template: string; body_template: string; content_type: string;
  ai_optimization_tips: string[]; estimated_engagement: string; best_time_to_post: string;
}

// Channel type: social channels support both Post + Reply; owned channels only support Post (article)
const SOCIAL_CHANNEL_IDS = new Set(['reddit', 'quora', 'stackoverflow', 'g2', 'producthunt', 'github', 'medium', 'devto', 'linkedin', 'youtube', 'twitter'])

// Platform-specific labels for post/reply
function getPostLabel(channelId: string): { postLabel: string; replyLabel: string } {
  switch (channelId) {
    case 'reddit': return { postLabel: 'Main Post', replyLabel: 'Reply / Comment' }
    case 'linkedin': return { postLabel: 'Post / Article', replyLabel: 'Comment' }
    case 'twitter': return { postLabel: 'Tweet / Thread', replyLabel: 'Reply' }
    case 'youtube': return { postLabel: 'Video / Description', replyLabel: 'Comment' }
    case 'quora': return { postLabel: 'Answer', replyLabel: 'Comment' }
    case 'stackoverflow': return { postLabel: 'Answer', replyLabel: 'Comment' }
    case 'medium': return { postLabel: 'Article', replyLabel: 'Response' }
    case 'devto': return { postLabel: 'Article', replyLabel: 'Comment' }
    case 'github': return { postLabel: 'README / Doc', replyLabel: 'Discussion Reply' }
    default: return { postLabel: 'Main Post', replyLabel: 'Reply' }
  }
}

// Suggested max length for replies per platform
function getReplyHint(channelId: string): string {
  switch (channelId) {
    case 'reddit': return '100–300 words, conversational, value-first'
    case 'twitter': return 'Max 280 characters per tweet'
    case 'linkedin': return '50–200 words, professional tone'
    case 'quora': case 'stackoverflow': return '100–500 words, answer the question directly'
    default: return '100–300 words, concise and helpful'
  }
}

function PushContentModal({ channel, channelId, sourceTab, subreddit, redditTemplateId, brandName, industry, priority, redditTemplates, supportsReply, onPush, onClose }: {
  channel: string
  channelId: string
  sourceTab: string
  subreddit?: string
  redditTemplateId?: string
  brandName: string
  industry: string
  priority: string
  redditTemplates?: RedditTemplateOption[]
  supportsReply: boolean
  onPush: (data: { title: string; content_type: string; content_preview: string; target_channel: string; target_channel_id: string; source_tab: string; content_file_name: string; brand_name: string; industry: string; priority: string; notes: string; subreddit?: string; reddit_template_id?: string; post_type: string; target_thread_url: string }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [contentType, setContentType] = useState('definition')
  const [preview, setPreview] = useState('')
  const [fileName, setFileName] = useState('')
  const [notes, setNotes] = useState('')
  const [targetThreadUrl, setTargetThreadUrl] = useState('')
  const [postType, setPostType] = useState<'post' | 'reply'>('post')
  const [tab, setTab] = useState<'template' | 'write' | 'upload'>(
    channelId === 'reddit' && redditTemplates && redditTemplates.length > 0 ? 'template' : 'write'
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  const isReddit = channelId === 'reddit'
  const templates = redditTemplates || []
  const labels = getPostLabel(channelId)
  const isReply = postType === 'reply'

  const applyTemplate = (tplId: string) => {
    const tpl = templates.find(t => t.id === tplId)
    if (!tpl) return
    setSelectedTemplateId(tplId)
    setTitle(tpl.title_template.replace(/\{brand\}/g, brandName).replace(/\{year\}/g, new Date().getFullYear().toString()))
    setPreview(tpl.body_template.replace(/\{brand\}/g, brandName).replace(/\{year\}/g, new Date().getFullYear().toString()))
    const typeMap: Record<string, string> = { comparison: 'comparison_ranking', question: 'faq', review: 'evaluation_risk', howto: 'how_to' }
    setContentType(typeMap[tpl.post_type] || tpl.content_type || 'faq')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setTitle(prev => prev || file.name.replace(/\.\w+$/, ''))
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setPreview(text.slice(0, 2000))
    }
    reader.readAsText(file)
  }

  // Validate: post needs title; reply needs body + thread URL
  const canSubmit = isReply ? preview.trim().length > 0 : title.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-divider-light">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink">Push Content to {channel}</h3>
              <p className="text-sm text-ink-3 mt-0.5">
                {subreddit && <span className="text-red-soft font-medium">{subreddit}</span>}
                {!subreddit && <span className="text-ink-2">{channelId}</span>}
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-warm rounded-lg"><X className="w-5 h-5 text-ink-3" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* ── Post Type selector (social channels only) ── */}
          {supportsReply && (
            <div>
              <label className="text-xs text-ink-3 mb-1.5 block font-medium">Post Type</label>
              <div className="flex gap-1 bg-surface-warm rounded-lg p-1">
                <button onClick={() => setPostType('post')}
                  className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${postType === 'post' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'}`}>
                  <FileText className="w-3.5 h-3.5" /> {labels.postLabel}
                </button>
                <button onClick={() => setPostType('reply')}
                  className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${postType === 'reply' ? 'bg-surface text-caution shadow-sm' : 'text-ink-3 hover:text-ink-2'}`}>
                  <MessageSquare className="w-3.5 h-3.5" /> {labels.replyLabel}
                </button>
              </div>
            </div>
          )}

          {/* ── Reply: Target Thread URL ── */}
          {isReply && (
            <div>
              <label className="text-xs text-ink-3 mb-1 block">Target Thread / Post URL</label>
              <input value={targetThreadUrl} onChange={e => setTargetThreadUrl(e.target.value)}
                placeholder={`Paste the ${channel} URL you want to reply to...`}
                className="w-full px-3 py-2.5 border border-caution/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-caution/20 focus:border-caution bg-caution-bg/30" />
              <p className="text-[10px] text-caution mt-1">Paste the link to the thread/post you&apos;re replying to</p>
            </div>
          )}

          {/* ── Source Tabs ── */}
          <div className="flex gap-1 bg-surface-warm rounded-lg p-1">
            {isReddit && templates.length > 0 && !isReply && (
              <button onClick={() => setTab('template')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === 'template' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
                Use Template
              </button>
            )}
            <button onClick={() => setTab('write')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === 'write' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
              Write / Paste
            </button>
            <button onClick={() => setTab('upload')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${tab === 'upload' ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}>
              Upload File
            </button>
          </div>

          {/* ── Template Selector (Reddit post only) ── */}
          {tab === 'template' && isReddit && templates.length > 0 && !isReply && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-3 mb-1.5 block">Select a Post Template</label>
                <div className="space-y-2">
                  {templates.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedTemplateId === tpl.id
                          ? 'border-ink bg-surface-muted'
                          : 'border-divider hover:border-divider-light hover:bg-surface-warm'
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-ink">{tpl.template_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          tpl.estimated_engagement === 'high' ? 'bg-sage-bg text-sage' :
                          tpl.estimated_engagement === 'medium-high' ? 'bg-surface-warm text-ink-2' :
                          'bg-surface-warm text-ink-2'
                        }`}>{tpl.estimated_engagement}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-3">
                        <span className="px-1.5 py-0.5 bg-surface-warm rounded">{tpl.post_type}</span>
                        <span>{tpl.target_subreddit}</span>
                        <span className="ml-auto">{tpl.best_time_to_post}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedTemplateId && (
                <div className="bg-caution-bg border border-caution/20 rounded-lg p-3">
                  <p className="text-xs text-caution font-semibold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI Citation Tips
                  </p>
                  {templates.find(t => t.id === selectedTemplateId)?.ai_optimization_tips.map((tip, i) => (
                    <p key={i} className="text-xs text-ink">{'\u2022'} {tip}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Title (hidden for Reply mode) ── */}
          {!isReply && (
            <div>
              <label className="text-xs text-ink-3 mb-1 block">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Content title"
                className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
            </div>
          )}

          {!isReply && (
            <div>
              <label className="text-xs text-ink-3 mb-1 block">Content Type</label>
              <select value={contentType} onChange={e => setContentType(e.target.value)}
                className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink">
                <option value="definition">Definition</option>
                <option value="comparison_ranking">Comparison & Ranking</option>
                <option value="how_to">How-To Guide</option>
                <option value="faq">FAQ / Q&A</option>
                <option value="evaluation_risk">Evaluation & Risk</option>
                <option value="use_case_mapping">Use Case & Scenario</option>
                <option value="reference_source">Reference Source</option>
              </select>
            </div>
          )}

          {tab === 'upload' ? (
            <div>
              <label className="text-xs text-ink-3 mb-1 block">Upload Content File</label>
              <div className="border-2 border-dashed border-divider rounded-lg p-6 text-center hover:border-ink/30 transition-colors">
                <input type="file" accept=".txt,.md,.doc,.docx,.pdf" onChange={handleFileSelect} className="hidden" id="content-file" />
                <label htmlFor="content-file" className="cursor-pointer">
                  {fileName ? (
                    <div>
                      <FileText className="w-8 h-8 text-red-soft mx-auto mb-2" />
                      <p className="text-sm font-medium text-ink">{fileName}</p>
                      <p className="text-xs text-ink-3 mt-1">Click to change file</p>
                    </div>
                  ) : (
                    <div>
                      <Download className="w-8 h-8 text-ink-3 mx-auto mb-2" />
                      <p className="text-sm text-ink-3">Click to upload .txt, .md, .doc, .pdf</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-ink-3 mb-1 block">
                {isReply ? 'Reply Content *' : 'Content Preview / Body'}
              </label>
              <textarea value={preview} onChange={e => setPreview(e.target.value)}
                rows={isReply ? 4 : 5}
                placeholder={isReply
                  ? `Write your reply here... (${getReplyHint(channelId)})`
                  : tab === 'template' && selectedTemplateId
                    ? 'Template content loaded — edit as needed'
                    : 'Paste or write your content here...'
                }
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
                  isReply
                    ? 'border-caution/20 focus:ring-caution/20 focus:border-caution bg-caution-bg/20'
                    : 'border-divider focus:ring-ink/10 focus:border-ink'
                }`} />
              {isReply && (
                <p className="text-[10px] text-caution mt-1">Tip: {getReplyHint(channelId)}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-ink-3 mb-1 block">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..."
              className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink" />
          </div>
        </div>

        <div className="p-6 border-t border-divider-light flex gap-3">
          <button onClick={() => {
            if (!canSubmit) return
            onPush({
              title: isReply ? `[Reply] ${channel}` : title.trim(),
              content_type: isReply ? 'reply' : contentType,
              content_preview: preview.slice(0, 500),
              target_channel: channel, target_channel_id: channelId, source_tab: sourceTab,
              content_file_name: fileName, brand_name: brandName, industry, priority, notes,
              subreddit, reddit_template_id: selectedTemplateId || redditTemplateId,
              post_type: postType,
              target_thread_url: targetThreadUrl,
            })
          }} disabled={!canSubmit}
            className={`flex-1 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 ${
              isReply
                ? 'bg-ink hover:bg-[#2d2d2c] text-ink-inv'
                : 'bg-ink hover:bg-[#2d2d2c] text-ink-inv'
            }`}>
            <ArrowUpRight className="w-4 h-4" /> {isReply ? 'Queue Reply' : 'Push to Queue'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-surface-warm text-ink-2 rounded-lg hover:bg-surface-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Channel Recommendation Card ───────────────────────
function ChannelRecCard({ rec, expanded, onToggle, onPush }: {
  rec: ChannelRecommendationData
  expanded: boolean
  onToggle: () => void
  onPush?: (channelName: string, channelId: string) => void
}) {
  const ps = priorityStyle(rec.priority)
  const pres = presenceStyle(rec.current_presence)

  return (
    <div className={`bg-surface rounded-xl border ${ps.border} overflow-hidden transition-all hover:shadow-md`}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{rec.channel.icon || catIcon(rec.channel.source_category)}</span>
            <div>
              <h4 className="font-semibold text-ink">{rec.channel.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ps.bg} ${ps.text}`}>{ps.label}</span>
                <span className="text-xs text-ink-3">{rec.channel.source_category.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold font-mono text-ink">{rec.priority_score}</p>
              <p className="text-xs text-ink-3">/ 100</p>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-ink-3" /> : <ChevronDown className="w-4 h-4 text-ink-3" />}
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-canvas rounded-lg p-2.5 text-center">
            <p className="text-xs text-ink-3">AI Citation</p>
            <p className="text-sm font-bold text-ink">{rec.channel.chatgpt_citation_weight}/100</p>
          </div>
          <div className="bg-canvas rounded-lg p-2.5 text-center">
            <p className="text-xs text-ink-3">Presence</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pres.bg} ${pres.text}`}>{pres.label}</span>
          </div>
          <div className="bg-canvas rounded-lg p-2.5 text-center">
            <p className="text-xs text-ink-3">AI Citation Gap</p>
            <p className="text-sm font-bold text-ink-2">{rec.gap_opportunity > 0 ? `${rec.gap_opportunity}%` : 'Cited'}</p>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-divider-light pt-4 space-y-4">
          <p className="text-sm text-ink-2">{rec.reason}</p>

          <div>
            <h5 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">Action Items</h5>
            <ul className="space-y-1.5">
              {rec.action_items.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-red-soft flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-canvas rounded-lg p-3">
              <span className="text-ink-3">AI Indexing:</span>
              <span className="ml-1 font-medium text-ink-2">~{rec.channel.estimated_ingestion_days} days</span>
            </div>
            <div className="bg-canvas rounded-lg p-3">
              <span className="text-ink-3">AI Indexing Retention:</span>
              <span className="ml-1 font-medium text-ink-2">{rec.channel.content_longevity}</span>
            </div>
            <div className="bg-canvas rounded-lg p-3">
              <span className="text-ink-3">Content Types:</span>
              <span className="ml-1 font-medium text-ink-2">{rec.content_type_match.join(', ') || 'All'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {rec.channel.url && (
              <a href={rec.channel.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-red-soft hover:text-red-soft font-medium">
                <ExternalLink className="w-3.5 h-3.5" />
                Visit {rec.channel.name}
              </a>
            )}
            {rec.channel.id === 'reddit' && onPush && (
              <button className="inline-flex items-center gap-1.5 text-sm text-caution hover:text-ink-2 font-medium"
                onClick={(e) => { e.stopPropagation(); onPush(rec.channel.name, rec.channel.id) }}>
                <MessageSquare className="w-3.5 h-3.5" /> View Reddit Strategy
              </button>
            )}
          </div>

          {/* Push Content — prominent CTA */}
          {onPush && (
            <button onClick={(e) => { e.stopPropagation(); onPush(rec.channel.name, rec.channel.id) }}
              className="w-full mt-4 py-3 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm">
              <ArrowUpRight className="w-4 h-4" /> Push Content to {rec.channel.name}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Map Channel Status styling ──────────────────────────
function mapStatusStyle(s: string) {
  switch (s) {
    case 'cited': return { bg: 'bg-sage-bg', text: 'text-sage', border: 'border-sage/30', dot: 'bg-sage', label: 'Cited' }
    case 'planned': return { bg: 'bg-surface-warm', text: 'text-ink-2', border: 'border-divider', dot: 'bg-surface-muted', label: 'Planned' }
    case 'active': return { bg: 'bg-caution-bg', text: 'text-caution', border: 'border-caution/30', dot: 'bg-caution', label: 'Active' }
    default: return { bg: 'bg-surface-warm', text: 'text-ink-3', border: 'border-divider', dot: 'bg-ink/15', label: 'Gap' }
  }
}

// ─── Distribution Map Channel Card ──────────────────────
function MapChannelCard({ item, onPush, onRedditLink }: {
  item: DistributionMapItemData
  onPush?: (channelName: string, channelId: string) => void
  onRedditLink?: () => void
}) {
  const ms = mapStatusStyle(item.status)
  const ps = priorityStyle(item.priority)

  return (
    <div className={`bg-surface rounded-xl border ${ms.border} p-4 hover:shadow-md transition-all relative overflow-hidden`}>
      {/* Status indicator stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${ms.dot}`} />

      <div className="flex items-start justify-between mt-1">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{item.icon || catIcon(item.source_category)}</span>
          <div>
            <h4 className="font-semibold text-ink text-sm">{item.channel_name}</h4>
            <span className="text-xs text-ink-3">{item.source_category.toUpperCase()}</span>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ms.bg} ${ms.text}`}>
          {ms.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="text-center bg-canvas rounded-lg p-2">
          <p className="text-xs text-ink-3">AI Weight</p>
          <p className="text-sm font-bold text-ink">{item.chatgpt_citation_weight}</p>
        </div>
        <div className="text-center bg-canvas rounded-lg p-2">
          <p className="text-xs text-ink-3">Citations</p>
          <p className={`text-sm font-bold ${item.citation_count > 0 ? 'text-sage' : 'text-ink-3'}`}>
            {item.citation_count}
          </p>
        </div>
        <div className="text-center bg-canvas rounded-lg p-2">
          <p className="text-xs text-ink-3">AI Citation Gap</p>
          <p className="text-sm font-bold text-ink-2">{item.gap_opportunity > 0 ? `${item.gap_opportunity}%` : 'Cited'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ps.bg} ${ps.text}`}>
          {ps.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${presenceStyle(item.presence_level).bg} ${presenceStyle(item.presence_level).text}`}>
          {presenceStyle(item.presence_level).label}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3 pt-3 border-t border-divider-light space-y-2">
        {item.channel_id === 'reddit' && onRedditLink && (
          <button onClick={onRedditLink}
            className="w-full py-2 text-xs text-caution hover:text-ink-2 hover:bg-caution-bg font-medium flex items-center justify-center gap-1.5 rounded-lg transition-colors border border-caution/20">
            <MessageSquare className="w-3.5 h-3.5" /> View Reddit Strategy
          </button>
        )}
        {onPush && (
          <button onClick={() => onPush(item.channel_name, item.channel_id)}
            className="w-full py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-xs">
            <ArrowUpRight className="w-3.5 h-3.5" /> Push Content
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Dark-themed Tag Input (for dark background sections) ──
function DarkTagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('')
  const addTag = () => {
    const t = input.trim()
    if (t && !value.includes(t)) { onChange([...value, t]); setInput('') }
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface-warm text-ink-2 text-xs font-medium rounded-full border border-divider">
              {tag}
              <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="hover:text-red-soft transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 bg-canvas border border-divider rounded-lg text-ink placeholder:text-ink-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink"
        />
        <button onClick={addTag} className="px-4 py-2.5 bg-surface-warm hover:bg-surface-muted border border-divider rounded-lg text-sm font-medium text-ink-2 hover:text-ink transition-colors">Add</button>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════

export default function GEODistributionPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  type TabKey = 'strategy' | 'queue' | 'reddit' | 'map'
  const [activeTab, setActiveTab] = useState<TabKey>('strategy')

  // ── Strategy state ─────────────────────────────
  const [brandName, setBrandName] = useState('')
  const [domain, setDomain] = useState('')
  const [industry, setIndustry] = useState('tech')
  const [brandDescTags, setBrandDescTags] = useState<string[]>([])
  const [competitorTags, setCompetitorTags] = useState<string[]>([])
  const [strategy, setStrategy] = useState<ChannelStrategyResultData | null>(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [strategyError, setStrategyError] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | null>(null)

  // ── AI Platform selection ──────────────────────
  const [selectedPlatform, setSelectedPlatform] = useState<string>('chatgpt')
  const AI_PLATFORMS = [
    { id: 'chatgpt', label: 'ChatGPT', icon: '🤖', available: true },
    { id: 'perplexity', label: 'Perplexity', icon: '🔍', available: true },
    { id: 'google_overview', label: 'Google AI Overview', icon: '🌐', available: true },
    { id: 'grok', label: 'Grok', icon: '⚡', available: true },
  ]

  // ── Content type filter (single-select) ─────────────
  const [selectedContentType, setSelectedContentType] = useState<string>('')
  const CONTENT_TYPES = [
    { id: 'definition', label: 'Definition' },
    { id: 'comparison_ranking', label: 'Comparison & Ranking' },
    { id: 'how_to', label: 'How-To Guide' },
    { id: 'faq', label: 'FAQ / Q&A' },
    { id: 'evaluation_risk', label: 'Evaluation & Risk' },
    { id: 'use_case_mapping', label: 'Use Case & Scenario' },
    { id: 'reference_source', label: 'Reference Source' },
  ]

  // ── Recent Records (localStorage) ─────────────
  type RecentRecord = { brandName: string; domain: string; industry: string; brandDesc: string; competitors: string; brandDescTags?: string[]; competitorTags?: string[]; usedAt: string }
  const RECENT_KEY = 'geo_dist_recent_records'
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  // showRecent removed — inline below Brand Name input

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      if (raw) setRecentRecords(JSON.parse(raw))
    } catch {}
    // Restore previous strategy session
    try {
      const saved = localStorage.getItem('geo_distribution_session')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.brandName) setBrandName(s.brandName)
        if (s.domain) setDomain(s.domain)
        if (s.industry) setIndustry(s.industry)
        if (s.brandDescTags) setBrandDescTags(s.brandDescTags)
        if (s.competitorTags) setCompetitorTags(s.competitorTags)
        if (s.strategy) setStrategy(s.strategy)
      }
    } catch {}
  }, [])

  // ─── Persist strategy session to localStorage ──
  useEffect(() => {
    if (strategy || brandName) {
      try {
        localStorage.setItem('geo_distribution_session', JSON.stringify({
          brandName, domain, industry, brandDescTags, competitorTags, strategy,
        }))
      } catch {}
    }
  }, [brandName, domain, industry, brandDescTags, competitorTags, strategy])

  const saveRecentRecord = useCallback(() => {
    if (!brandName.trim()) return
    const entry: RecentRecord = {
      brandName: brandName.trim(), domain: domain.trim(), industry,
      brandDesc: brandDescTags.join(', '), competitors: competitorTags.join(', '),
      brandDescTags: [...brandDescTags], competitorTags: [...competitorTags],
      usedAt: new Date().toISOString(),
    }
    setRecentRecords(prev => {
      const filtered = prev.filter(r => !(r.brandName === entry.brandName && r.domain === entry.domain))
      const updated = [entry, ...filtered].slice(0, 10)
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
      return updated
    })
  }, [brandName, domain, industry, brandDescTags, competitorTags])

  const loadRecentRecord = (rec: RecentRecord) => {
    setBrandName(rec.brandName)
    setDomain(rec.domain)
    setIndustry(rec.industry)
    // Load tags (backward compatible with old comma-separated format)
    if (rec.brandDescTags && rec.brandDescTags.length > 0) {
      setBrandDescTags(rec.brandDescTags)
    } else if (rec.brandDesc) {
      setBrandDescTags(rec.brandDesc.split(',').map(s => s.trim()).filter(Boolean))
    } else {
      setBrandDescTags([])
    }
    if (rec.competitorTags && rec.competitorTags.length > 0) {
      setCompetitorTags(rec.competitorTags)
    } else if (rec.competitors) {
      setCompetitorTags(rec.competitors.split(',').map(s => s.trim()).filter(Boolean))
    } else {
      setCompetitorTags([])
    }
  }

  const clearRecentRecords = () => {
    localStorage.removeItem(RECENT_KEY)
    setRecentRecords([])
  }

  // ── Queue state (Phase 5 Enhanced) ─────────────
  const [queue, setQueue] = useState<ContentQueueItemData[]>([])
  const [queueStats, setQueueStats] = useState<QueueStatsData | null>(null)
  const [queueLoading, setQueueLoading] = useState(false)
  const [showAddQueue, setShowAddQueue] = useState(false)
  const [newQueueTitle, setNewQueueTitle] = useState('')
  const [newQueueChannel, setNewQueueChannel] = useState('')
  const [newQueueType, setNewQueueType] = useState('faq')
  const [newQueuePriority, setNewQueuePriority] = useState('medium')
  const [newQueueNotes, setNewQueueNotes] = useState('')
  const [queueStatusFilter, setQueueStatusFilter] = useState('all')
  const [queuePriorityFilter, setQueuePriorityFilter] = useState('all')
  const [selectedQueueIds, setSelectedQueueIds] = useState<Set<string>>(new Set())
  const [expandedQueueId, setExpandedQueueId] = useState<string | null>(null)
  // ── Edit queue item state ─────────────────────
  const [editingItem, setEditingItem] = useState<ContentQueueItemData | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('')
  const [editChannel, setEditChannel] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editPriority, setEditPriority] = useState('medium')
  const [editSaving, setEditSaving] = useState(false)

  // ── Push Content Modal state (Phase 7) ────────
  const [pushModalOpen, setPushModalOpen] = useState(false)
  const [pushTargetChannel, setPushTargetChannel] = useState('')
  const [pushTargetChannelId, setPushTargetChannelId] = useState('')
  const [pushSourceTab, setPushSourceTab] = useState('strategy')
  const [pushSubreddit, setPushSubreddit] = useState<string | undefined>(undefined)
  const [pushRedditTemplateId, setPushRedditTemplateId] = useState<string | undefined>(undefined)

  const openPushModal = (channel: string, channelId: string, sourceTab: string, subreddit?: string, templateId?: string) => {
    setPushTargetChannel(channel)
    setPushTargetChannelId(channelId)
    setPushSourceTab(sourceTab)
    setPushSubreddit(subreddit)
    setPushRedditTemplateId(templateId)
    setPushModalOpen(true)
  }

  const handlePushContent = async (data: { title: string; content_type: string; content_preview: string; target_channel: string; target_channel_id: string; source_tab: string; content_file_name: string; brand_name: string; industry: string; priority: string; notes: string; subreddit?: string; reddit_template_id?: string; post_type: string; target_thread_url: string }) => {
    const res = await api.addToDistributionQueue({
      title: data.title,
      content_type: data.content_type,
      content_preview: data.content_preview,
      target_channel: data.target_channel,
      target_channel_id: data.target_channel_id,
      source_tab: data.source_tab,
      content_file_name: data.content_file_name,
      brand_name: data.brand_name,
      industry: data.industry,
      priority: data.priority,
      notes: data.notes,
      subreddit: data.subreddit,
      reddit_template_id: data.reddit_template_id,
      post_type: data.post_type,
      target_thread_url: data.target_thread_url,
    })
    if (res.data) {
      setQueue(prev => [res.data!, ...prev])
      setPushModalOpen(false)
      // Refresh stats
      const sRes = await api.getQueueStats(brandName)
      if (sRes.data) setQueueStats(sRes.data)
    }
  }

  // ── Reddit state ───────────────────────────────
  const [redditResult, setRedditResult] = useState<RedditStrategyResultData | null>(null)
  const [redditLoading, setRedditLoading] = useState(false)
  // Progressive loading phase: null | 'subreddits' | 'templates' | 'competitors' | 'complete'
  const [redditProgressPhase, setRedditProgressPhase] = useState<string | null>(null)
  type RedditSubTab = 'subreddits' | 'competitors'
  const [redditSubTab, setRedditSubTab] = useState<RedditSubTab>('subreddits')

  // ── Phase 3: Monitor sync + Distribution Map ──
  const [monitorSync, setMonitorSync] = useState<MonitorSyncResultData | null>(null)
  const [distMap, setDistMap] = useState<DistributionMapResultData | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapFilter, setMapFilter] = useState<string>('all') // all, cited, gap, planned

  const industries = [
    { value: 'tech', label: 'Technology' },
    { value: 'saas', label: 'SaaS' },
    { value: 'fintech', label: 'Fintech' },
    { value: 'crypto', label: 'Crypto / Web3' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'health', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'enterprise', label: 'Enterprise' },
  ]

  // ── Strategy Handler ───────────────────────────
  const handleAnalyze = async () => {
    if (!brandName.trim()) return
    saveRecentRecord()
    setStrategyLoading(true)
    setStrategyError(null)
    setStrategy(null)
    setRedditResult(null)
    redditCacheKeyRef.current = '' // Clear cache on new analysis

    const controller = new AbortController()
    abortRef.current = controller

    // Launch Reddit pre-fetch IN PARALLEL with Smart Strategy (not after)
    // Reddit is recommended for most industries, so pre-fetch speculatively
    handleRedditStrategy(true)

    const res = await api.generateDistributionStrategy({
      brand_name: brandName.trim(),
      domain: domain.trim(),
      industry,
      brand_description: brandDescTags.join(', '),
      competitors: [...competitorTags],
      target_platforms: [selectedPlatform],
      content_types: selectedContentType ? [selectedContentType] : undefined,
    }, controller.signal, user?.id)

    if (res.error) {
      if (res.error !== '__ABORTED__') setStrategyError(res.error)
    } else if (res.data) {
      setStrategy(res.data)
      notifyCreditUsed()
    }
    // Also fetch monitor sync data in background
    api.getMonitorSync(brandName.trim(), domain.trim()).then(syncRes => {
      if (syncRes.data) setMonitorSync(syncRes.data)
    })
    setStrategyLoading(false)
    abortRef.current = null
  }

  const handleStop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    redditAbortRef.current?.abort()
    redditAbortRef.current = null
    setStrategyLoading(false)
    setRedditLoading(false)
  }

  // ── Reddit Handler (progressive + pre-fetch + cache) ──
  const redditAbortRef = useRef<AbortController | null>(null)
  const redditCacheKeyRef = useRef<string>('')

  const handleRedditStrategy = async (silent = false) => {
    if (!brandName.trim()) return
    // Cache check: skip if already loaded for same brand+industry
    const cacheKey = `${brandName.trim()}|${industry}`
    if (redditResult && redditCacheKeyRef.current === cacheKey) return
    if (redditLoading) return // already running (pre-fetch or explicit)
    setRedditLoading(true)
    setRedditResult(null)
    setRedditProgressPhase(null)
    const controller = new AbortController()
    redditAbortRef.current = controller

    const reqData = {
      brand_name: brandName.trim(),
      industry,
      brand_description: brandDescTags.join(', '),
      competitors: [...competitorTags],
      domain: domain.trim(),
    }

    // Try progressive SSE first, fallback to classic endpoint on 404/error
    let progressiveFailed = false
    const buildPartialResult = (subs: SubredditRecommendationData[]) => ({
      brand_name: brandName.trim(),
      industry,
      subreddit_recommendations: subs,
      general_tips: [] as string[],
      risk_warnings: [] as string[],
      reddit_importance_score: 0,
      competitor_reddit_insights: [] as CompetitorRedditPresenceData[],
      post_templates: [] as RedditPostTemplateData[],
      content_calendar: [] as RedditCalendarItemData[],
      monitor_reddit_data: null,
      generated_at: '',
    })

    await api.generateRedditStrategyProgressive(
      reqData,
      {
        onStaticSubreddits: (subs) => {
          // Instant display — static data arrives in < 100ms
          setRedditProgressPhase('static')
          setRedditResult(buildPartialResult(subs))
        },
        onSubreddits: (subs) => {
          // AI-generated replaces static data — but only if AI returned results
          setRedditProgressPhase('subreddits')
          if (subs.length > 0) {
            setRedditResult(prev => ({ ...(prev || buildPartialResult([])), subreddit_recommendations: subs }))
          }
          // If AI returned 0, keep existing static data as fallback
        },
        onTemplates: (tpls) => {
          setRedditProgressPhase('templates')
          setRedditResult(prev => prev ? { ...prev, post_templates: tpls } : prev)
        },
        onCompetitors: (comps) => {
          setRedditProgressPhase('competitors')
          setRedditResult(prev => prev ? { ...prev, competitor_reddit_insights: comps } : prev)
        },
        onComplete: (result) => {
          setRedditProgressPhase('complete')
          setRedditResult(result)
          redditCacheKeyRef.current = cacheKey
        },
        onError: () => {
          progressiveFailed = true // will trigger fallback below
        },
      },
      controller.signal,
    )

    // Fallback: if progressive endpoint unavailable (404/error), use classic endpoint
    if (progressiveFailed && !controller.signal.aborted) {
      setRedditProgressPhase(null)
      const res = await api.generateRedditStrategy(reqData, controller.signal, user?.id)
      if (res.error) {
        if (res.error !== '__ABORTED__' && !silent) setStrategyError(res.error)
      } else if (res.data) {
        setRedditResult(res.data)
        redditCacheKeyRef.current = cacheKey
        notifyCreditUsed()
      }
    }

    setRedditLoading(false)
    setRedditProgressPhase(null)
    redditAbortRef.current = null
  }

  // ── Queue Handlers (Phase 5 Enhanced) ─────────
  const loadQueue = async () => {
    setQueueLoading(true)
    const filters: Record<string, string> = {}
    if (brandName) filters.brand_name = brandName
    const [qRes, sRes] = await Promise.all([
      api.getDistributionQueue(filters),
      api.getQueueStats(brandName),
    ])
    if (qRes.data) setQueue(qRes.data)
    if (sRes.data) setQueueStats(sRes.data)
    setQueueLoading(false)
  }

  const handleAddQueue = async () => {
    if (!newQueueTitle.trim()) return
    const res = await api.addToDistributionQueue({
      title: newQueueTitle.trim(),
      content_type: newQueueType,
      target_channel: newQueueChannel,
      brand_name: brandName,
      industry: industry,
      priority: newQueuePriority,
      notes: newQueueNotes || undefined,
    })
    if (res.data) {
      setQueue(prev => [res.data!, ...prev])
      setNewQueueTitle('')
      setNewQueueChannel('')
      setNewQueueNotes('')
      setNewQueuePriority('medium')
      setShowAddQueue(false)
      // Refresh stats
      const sRes = await api.getQueueStats(brandName)
      if (sRes.data) setQueueStats(sRes.data)
    }
  }

  const handleDeleteQueue = async (id: string) => {
    await api.deleteQueueItem(id)
    setQueue(prev => prev.filter(q => q.id !== id))
    setSelectedQueueIds(prev => { const n = new Set(prev); n.delete(id); return n })
    const sRes = await api.getQueueStats(brandName)
    if (sRes.data) setQueueStats(sRes.data)
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    const res = await api.updateQueueItem(id, { status })
    if (res.data) {
      setQueue(prev => prev.map(q => q.id === id ? res.data! : q))
      const sRes = await api.getQueueStats(brandName)
      if (sRes.data) setQueueStats(sRes.data)
    }
  }

  const handleUpdatePriority = async (id: string, priority: string) => {
    const res = await api.updateQueueItem(id, { priority } as any)
    if (res.data) setQueue(prev => prev.map(q => q.id === id ? res.data! : q))
  }

  const handleBatchStatus = async (newStatus: string) => {
    if (selectedQueueIds.size === 0) return
    const ids = Array.from(selectedQueueIds)
    const res = await api.batchUpdateQueueStatus(ids, newStatus)
    if (res.data) {
      const updatedMap: Record<string, ContentQueueItemData> = {}
      res.data.forEach(i => { updatedMap[i.id] = i })
      setQueue(prev => prev.map(q => updatedMap[q.id] || q))
      setSelectedQueueIds(new Set())
      const sRes = await api.getQueueStats(brandName)
      if (sRes.data) setQueueStats(sRes.data)
    }
  }

  const toggleSelectQueue = (id: string) => {
    setSelectedQueueIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selectedQueueIds.size === filteredQueue.length) {
      setSelectedQueueIds(new Set())
    } else {
      setSelectedQueueIds(new Set(filteredQueue.map(q => q.id)))
    }
  }

  // ── Edit queue item handlers ───────────────────
  const openEditItem = (item: ContentQueueItemData) => {
    setEditingItem(item)
    setEditTitle(item.title)
    setEditType(item.content_type)
    setEditChannel(item.target_channel)
    setEditUrl(item.target_url || '')
    setEditNotes(item.notes)
    setEditPriority(item.priority || 'medium')
  }

  const closeEditItem = () => {
    setEditingItem(null)
    setEditTitle('')
    setEditType('')
    setEditChannel('')
    setEditUrl('')
    setEditNotes('')
    setEditPriority('medium')
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !editTitle.trim()) return
    setEditSaving(true)
    const res = await api.updateQueueItem(editingItem.id, {
      title: editTitle.trim(),
      target_channel: editChannel.trim() || undefined,
      target_url: editUrl.trim() || undefined,
      notes: editNotes.trim() || undefined,
      priority: editPriority,
    })
    if (res.data) {
      // Also handle content_type change — it's not in updateQueueItem yet,
      // but the title/channel/notes/priority covers main editable fields
      setQueue(prev => prev.map(q => q.id === editingItem.id ? res.data! : q))
      closeEditItem()
    }
    setEditSaving(false)
  }

  // Filter queue items
  const filteredQueue = queue.filter(item => {
    if (queueStatusFilter === 'pending' && !['draft', 'ready', 'scheduled'].includes(item.status)) return false
    else if (queueStatusFilter !== 'all' && queueStatusFilter !== 'pending' && item.status !== queueStatusFilter) return false
    if (queuePriorityFilter !== 'all' && item.priority !== queuePriorityFilter) return false
    return true
  })

  // ── Distribution Map Handler ──────────────────
  const handleLoadMap = async () => {
    if (!brandName.trim()) return
    setMapLoading(true)
    const [syncRes, mapRes] = await Promise.all([
      api.getMonitorSync(brandName.trim(), domain.trim()),
      api.getDistributionMap(brandName.trim(), domain.trim()),
    ])
    if (syncRes.data) setMonitorSync(syncRes.data)
    if (mapRes.data) setDistMap(mapRes.data)
    setMapLoading(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const isAnyLoading = strategyLoading || redditLoading

  return (
    <div className="min-h-screen bg-canvas">
      <Header title={t.dashboard.geoDistribution} subtitle={t.dashboard.geoDistributionDesc} />

      <div className="p-6 space-y-6">
        {/* ═══ Brand Input Section ═══ */}
        <section className="bg-surface rounded-2xl border border-divider-light shadow-soft p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-surface-muted/[0.06] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-sage-bg/[0.05] rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-surface-warm rounded-xl flex items-center justify-center">
                <Share2 className="w-5 h-5 text-ink-2" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">AI Citation Channel Strategy Engine</h2>
                <p className="text-ink-3 text-sm">Discover where to publish content so AI platforms cite your brand</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-ink-3 mb-1 block">Brand Name *</label>
                <input
                  value={brandName} onChange={e => setBrandName(e.target.value)}
                  placeholder="e.g., TickTalk"
                  className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-lg text-ink placeholder:text-ink-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface"
                />
                {/* Inline Recent Records */}
                {recentRecords.length > 0 && !brandName.trim() && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1"><History className="w-3 h-3" /> Recent</span>
                      <button onClick={clearRecentRecords} className="text-[10px] text-ink-3 hover:text-red-soft transition-colors">Clear</button>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {recentRecords.slice(0, 5).map((rec, idx) => (
                        <button key={idx} onClick={() => loadRecentRecord(rec)}
                          className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-surface-muted transition-colors group">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-ink-2 group-hover:text-ink">{rec.brandName}</span>
                            {rec.domain && <span className="text-[9px] text-ink-3 bg-surface-warm px-1.5 py-0.5 rounded">{rec.domain}</span>}
                            {(rec.competitorTags?.length || rec.competitors) && (
                              <span className="text-[9px] text-ink-3 ml-auto truncate max-w-[120px]">
                                {rec.competitorTags?.length ? `${rec.competitorTags.length} competitors` : rec.competitors}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-ink-3 mb-1 block">Domain</label>
                <input
                  value={domain} onChange={e => setDomain(e.target.value)}
                  placeholder="e.g., myticktalk.com"
                  className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-lg text-ink placeholder:text-ink-3 text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface"
                />
                {/* Inline Recent Domains */}
                {recentRecords.length > 0 && !domain.trim() && (() => {
                  const uniqueDomains = Array.from(new Set(recentRecords.filter(r => r.domain).map(r => r.domain)))
                  if (uniqueDomains.length === 0) return null
                  return (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-ink-3 uppercase tracking-wider flex items-center gap-1 mb-1"><History className="w-3 h-3" /> Recent</span>
                      <div className="flex flex-wrap gap-1">
                        {uniqueDomains.slice(0, 5).map((d, idx) => (
                          <button key={idx} onClick={() => setDomain(d)}
                            className="px-2 py-1 rounded-md text-[10px] text-ink-3 bg-surface-warm hover:bg-surface-muted hover:text-ink transition-colors">
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div>
                <label className="text-xs text-ink-3 mb-1 block">Industry</label>
                <select
                  value={industry} onChange={e => setIndustry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-divider rounded-lg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink focus:bg-surface"
                >
                  {industries.map(ind => (
                    <option key={ind.value} value={ind.value} className="bg-surface">{ind.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-ink-3 mb-1 block">Brand Description (optional)</label>
                <DarkTagInput value={brandDescTags} onChange={setBrandDescTags} placeholder="Add description keyword" />
              </div>
              <div>
                <label className="text-xs text-ink-3 mb-1 block">Competitors (optional)</label>
                <DarkTagInput value={competitorTags} onChange={setCompetitorTags} placeholder="e.g., Apple Watch" />
              </div>
            </div>

            {/* AI Platform Selection (single-select) */}
            <div className="mb-4">
              <label className="text-xs text-ink-3 mb-2 block">Target AI Platform *</label>
              <div className="flex flex-wrap gap-2">
                {AI_PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setSelectedPlatform(p.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-1.5 ${
                      selectedPlatform === p.id
                        ? 'bg-red-soft-bg border-red-soft/30 text-red-soft shadow-sm ring-1 ring-red-soft/20'
                        : 'bg-canvas border-divider text-ink-3 hover:bg-surface-muted hover:text-ink-2'
                    }`}>
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                    {selectedPlatform === p.id && <CheckCircle className="w-3.5 h-3.5 text-red-soft" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-ink-3 mt-1">Select one AI platform to get targeted channel recommendations.</p>
            </div>

            {/* Content Type (single-select) */}
            <div className="mb-4">
              <label className="text-xs text-ink-3 mb-2 block">Content Type *</label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(ct => (
                  <button key={ct.id} onClick={() => setSelectedContentType(prev => prev === ct.id ? '' : ct.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedContentType === ct.id
                        ? 'bg-surface-warm border-divider text-ink-2 ring-1 ring-divider shadow-sm'
                        : 'bg-canvas border-divider text-ink-3 hover:bg-surface-muted hover:text-ink-2'
                    }`}>
                    {ct.label}
                    {selectedContentType === ct.id && <span className="ml-1">✓</span>}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-ink-3 mt-1">Select one content type to get targeted channel recommendations.</p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={handleAnalyze}
                disabled={!brandName.trim() || isAnyLoading}
                className="px-6 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {strategyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {strategyLoading ? 'Analyzing...' : 'Generate Strategy'}
              </button>
              {isAnyLoading && (
                <button onClick={handleStop}
                  className="px-4 py-2.5 bg-surface-warm text-ink-2 font-medium rounded-lg hover:bg-surface-muted flex items-center gap-2 transition-colors">
                  <StopCircle className="w-4 h-4" /> Stop
                </button>
              )}
            </div>

            {/* Quick Stats */}
            {strategy && (
              <div className="space-y-4 mt-6">
                {/* Platform badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-ink-3">Platforms:</span>
                  {(() => {
                    const p = (strategy.target_platforms || [selectedPlatform])[0] || selectedPlatform
                    const pInfo = AI_PLATFORMS.find(ap => ap.id === p)
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-soft-bg text-red-soft rounded-full text-xs font-medium border border-red-soft/30">
                        {pInfo?.icon} {pInfo?.label || p}
                      </span>
                    )
                  })()}
                  {selectedContentType && (
                    <>
                      <span className="text-xs text-ink-3 mx-1">|</span>
                      <span className="text-xs text-ink-3">Content:</span>
                      <span className="inline-flex items-center px-2 py-0.5 bg-surface-warm text-ink-2 rounded-full text-xs font-medium border border-divider">
                        {CONTENT_TYPES.find(c => c.id === selectedContentType)?.label || selectedContentType}
                      </span>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-canvas rounded-xl p-4 border border-divider">
                    <p className="text-ink-3 text-xs mb-1">Total Channels</p>
                    <p className="text-2xl font-bold font-mono text-ink">{strategy.total_channels}</p>
                  </div>
                  <div className="bg-canvas rounded-xl p-4 border border-divider">
                    <p className="text-ink-3 text-xs mb-1">High Priority</p>
                    <p className="text-2xl font-bold font-mono text-red-soft">{strategy.high_priority_count}</p>
                  </div>
                  <div className="bg-canvas rounded-xl p-4 border border-divider">
                    <p className="text-ink-3 text-xs mb-1">Content Type</p>
                    <p className="text-sm font-semibold text-ink-2 capitalize">{selectedContentType ? CONTENT_TYPES.find(c => c.id === selectedContentType)?.label || selectedContentType : 'All'}</p>
                  </div>
                  <div className="bg-canvas rounded-xl p-4 border border-divider">
                    <p className="text-ink-3 text-xs mb-1">Industry</p>
                    <p className="text-lg font-semibold text-sage capitalize">{strategy.industry}</p>
                  </div>
                  <div className={`rounded-xl p-4 border ${strategy.monitor_data_available ? 'bg-sage-bg border-sage/30' : 'bg-canvas border-dashed border-divider'}`}>
                    <p className="text-ink-3 text-xs mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> {strategy.monitor_data_available ? 'Monitor Data' : 'Monitor Sync'}
                    </p>
                    {strategy.monitor_data_available ? (
                      <div>
                        <p className="text-lg font-bold text-sage">{strategy.monitor_cited_channels} cited</p>
                        <p className="text-xs text-sage">Live citation data synced</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-ink-3">Optional</p>
                        <p className="text-[10px] text-ink-3">Enhanced after Monitor scan</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Error */}
        {strategyError && (
          <div className="bg-red-soft-bg border border-red-soft/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-soft flex-shrink-0" />
            <p className="text-sm text-red-soft">{strategyError}</p>
          </div>
        )}

        {/* ═══ Tab Navigation ═══ */}
        <div className="bg-surface rounded-xl border border-divider-light p-1.5 flex gap-1">
          {([
            { key: 'strategy' as TabKey, label: 'AI Visibility Channel', icon: <Target className="w-4 h-4" /> },
            { key: 'map' as TabKey, label: 'AI Visibility Coverage', icon: <Map className="w-4 h-4" /> },
            { key: 'queue' as TabKey, label: 'AI Content Deployment Hub', icon: <Calendar className="w-4 h-4" /> },
            { key: 'reddit' as TabKey, label: 'Reddit Strategy Engine', icon: <MessageSquare className="w-4 h-4" /> },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                if (tab.key === 'queue') loadQueue()
                if (tab.key === 'reddit' && !redditResult && brandName.trim()) handleRedditStrategy()
                if (tab.key === 'map' && !distMap && brandName.trim()) handleLoadMap()
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-ink text-ink-inv shadow-sm'
                  : 'text-ink-3 hover:bg-surface-warm'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 1: Channel Strategy                       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            {!strategy && !strategyLoading && (
              <div className="bg-surface rounded-xl border border-divider-light p-16 text-center">
                <div className="w-20 h-20 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-ink-3" />
                </div>
                <h3 className="text-xl font-semibold text-ink mb-2">AI Citation Channel Strategy</h3>
                <p className="text-ink-3 mb-6 max-w-md mx-auto">
                  Enter your brand details above and click &quot;Analyze Channels&quot; to get a prioritized list of distribution channels ranked by ChatGPT citation weight.
                </p>
                <div className="flex justify-center gap-3">
                  {['Reddit #1 UGC', 'Wikipedia #1 Reference', 'G2 #1 Review'].map(hint => (
                    <span key={hint} className="px-3 py-1.5 bg-surface-warm text-ink-2 rounded-full text-xs font-medium">{hint}</span>
                  ))}
                </div>
              </div>
            )}

            {strategyLoading && (
              <div className="bg-surface rounded-xl border border-divider-light p-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-red-soft mx-auto mb-4" />
                <p className="text-ink-2 font-medium">Analyzing channels for {brandName}...</p>
                <p className="text-ink-3 text-sm mt-1">Scoring 20+ channels × industry weight × AI citation data</p>
              </div>
            )}

            {strategy && (
              <>
                {/* Monitor Data Sync Banner — only show when data IS available (enhancement layer) */}
                {monitorSync && monitorSync.monitor_data_available && (
                  <div className="rounded-xl border border-sage/30 bg-sage-bg p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sage-bg">
                      <Link2 className="w-5 h-5 text-sage" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-sage">
                        Monitor Data Synced: {monitorSync.total_citations} citations across {monitorSync.total_sources} channels
                      </p>
                      {monitorSync.top_cited_channels.length > 0 && (
                        <p className="text-xs text-sage mt-0.5">
                          Top cited: {monitorSync.top_cited_channels.slice(0, 3).join(', ')}
                          {monitorSync.uncited_channels.length > 0 && (
                            <span className="text-red-soft ml-2">
                              | {monitorSync.uncited_channels.length} uncited channels (gaps)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <a href="/dashboard/geo-monitor" className="text-xs px-2.5 py-1 bg-sage-bg text-sage rounded-full font-medium flex items-center gap-1 hover:bg-surface-warm transition-colors">
                      <CircleDot className="w-3 h-3" /> View in Monitor &rarr;
                    </a>
                  </div>
                )}

                {/* Top 3 Actions */}
                {strategy.top_3_actions.length > 0 && (
                  <div className="bg-red-soft-bg rounded-xl border border-red-soft/30 p-6">
                    <h3 className="text-sm font-semibold text-red-soft uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI-Recommended Actions
                    </h3>
                    <div className="space-y-2">
                      {strategy.top_3_actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 bg-ink text-ink-inv rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                          <p className="text-sm text-ink-2">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cross-Module CTAs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a href="/dashboard/geo-content"
                    className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-warm border border-divider-light rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-surface-warm flex items-center justify-center text-ink-2"><FileText className="w-4 h-4" /></div>
                    <div><p className="text-sm font-medium text-ink">Create Content</p><p className="text-[10px] text-ink-3">Generate articles in GEO Content</p></div>
                  </a>
                  <a href="/dashboard/geo-monitor"
                    className="flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-warm border border-divider-light rounded-xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-surface-warm flex items-center justify-center text-ink-2"><BarChart3 className="w-4 h-4" /></div>
                    <div><p className="text-sm font-medium text-ink">Track in Monitor</p><p className="text-[10px] text-ink-3">Verify AI visibility improvements</p></div>
                  </a>
                </div>

                {/* Channel Recommendations */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                      <Target className="w-5 h-5 text-red-soft" />
                      Channel Recommendations
                      <span className="text-sm font-normal text-ink-3">({strategy.recommendations.length} channels)</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {strategy.recommendations.map((rec) => (
                      <ChannelRecCard
                        key={rec.channel.id}
                        rec={rec}
                        expanded={expandedCards.has(rec.channel.id)}
                        onToggle={() => toggleExpand(rec.channel.id)}
                        onPush={(name, id) => {
                          if (id === 'reddit') {
                            setActiveTab('reddit')
                            if (!redditResult) handleRedditStrategy()
                          } else {
                            openPushModal(name, id, 'strategy')
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Content × Channel Breakdown removed — Channel Recommendations already filtered by content type */}
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 2: Content Queue — Phase 5 Enhanced       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* ── Header ─────────────────────────────── */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                <Package className="w-5 h-5 text-ink-2" />
                Content Queue
              </h3>
              <div className="flex items-center gap-2">
                {selectedQueueIds.size > 0 && (
                  <div className="flex items-center gap-2 mr-2 pr-2 border-r border-divider">
                    <span className="text-xs text-ink-3">{selectedQueueIds.size} selected</span>
                    <button onClick={() => handleBatchStatus('published')}
                      className="px-2 py-1 text-xs bg-sage-bg text-sage rounded hover:bg-surface-warm">Published</button>
                    <button onClick={() => handleBatchStatus('verified')}
                      className="px-2 py-1 text-xs bg-surface-warm text-ink-2 rounded hover:bg-surface-muted">AI Verified</button>
                  </div>
                )}
                <button onClick={() => setShowAddQueue(true)}
                  className="px-4 py-2 bg-ink text-ink-inv text-sm font-medium rounded-lg hover:bg-[#2d2d2c] flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Content
                </button>
              </div>
            </div>

            {/* ── Stats Pipeline ─────────────────────── */}
            {queueStats && queueStats.total > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Pending', value: (queueStats.by_status['draft'] || 0) + (queueStats.by_status['ready'] || 0) + (queueStats.by_status['scheduled'] || 0), color: 'bg-caution-bg text-caution', dot: 'bg-caution' },
                  { label: 'Published', value: queueStats.by_status['published'] || 0, color: 'bg-sage-bg text-sage', dot: 'bg-sage-bg' },
                  { label: 'AI Verified', value: queueStats.by_status['verified'] || 0, color: 'bg-surface-warm text-ink-2', dot: 'bg-ink/30' },
                ].map(s => (
                  <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
                      <span className="text-[10px] uppercase font-semibold tracking-wide">{s.label}</span>
                    </div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Status Pipeline Flow ───────────────── */}
            {queueStats && queueStats.total > 0 && (
              <div className="bg-surface rounded-xl border border-divider-light p-4">
                <div className="flex items-center gap-1">
                  {['draft', 'ready', 'scheduled', 'published', 'verified'].map((st, idx) => {
                    const count = queueStats.by_status[st] || 0
                    const pct = queueStats.total > 0 ? Math.round((count / queueStats.total) * 100) : 0
                    const colors: Record<string, string> = {
                      draft: 'bg-surface-muted', ready: 'bg-surface-muted', scheduled: 'bg-ink/40',
                      published: 'bg-sage-bg', verified: 'bg-ink/30',
                    }
                    return (
                      <div key={st} className="flex items-center flex-1">
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden bg-surface-warm">
                            <div className={`h-full ${colors[st]} rounded-full transition-all`}
                              style={{ width: `${Math.max(pct, 4)}%` }}></div>
                          </div>
                          <div className="text-[10px] text-ink-3 mt-1 text-center capitalize">{st} ({count})</div>
                        </div>
                        {idx < 4 && <ChevronRight className="w-3 h-3 text-ink-3 mx-1 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Add Form (Phase 5 Enhanced) ─────────── */}
            {showAddQueue && (
              <div className="bg-surface rounded-xl border border-divider-light p-6">
                <h4 className="font-medium text-ink mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-red-soft" /> Add Content to Queue
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="lg:col-span-2">
                    <label className="text-xs text-ink-3 mb-1 block">Title *</label>
                    <input value={newQueueTitle} onChange={e => setNewQueueTitle(e.target.value)}
                      placeholder="Content title"
                      className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 mb-1 block">Content Type</label>
                    <select value={newQueueType} onChange={e => setNewQueueType(e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink">
                      <option value="faq">FAQ</option>
                      <option value="comparison">Comparison</option>
                      <option value="definition">Definition</option>
                      <option value="howto">How-To</option>
                      <option value="review">Review</option>
                      <option value="glossary">Glossary</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 mb-1 block">Target Channel</label>
                    <input value={newQueueChannel} onChange={e => setNewQueueChannel(e.target.value)}
                      placeholder="e.g., Reddit, Medium"
                      className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 mb-1 block">Priority</label>
                    <select value={newQueuePriority} onChange={e => setNewQueuePriority(e.target.value)}
                      className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink">
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="text-xs text-ink-3 mb-1 block">Notes</label>
                    <input value={newQueueNotes} onChange={e => setNewQueueNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full px-3 py-2 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddQueue} disabled={!newQueueTitle.trim()}
                    className="px-4 py-2 bg-ink text-ink-inv text-sm rounded-lg hover:bg-[#2d2d2c] disabled:opacity-50">
                    Add to Queue
                  </button>
                  <button onClick={() => setShowAddQueue(false)}
                    className="px-4 py-2 text-ink-3 text-sm rounded-lg hover:bg-surface-warm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Filter Bar ─────────────────────────── */}
            <div className="bg-surface rounded-xl border border-divider-light p-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-ink-3">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </div>
              <select value={queueStatusFilter} onChange={e => setQueueStatusFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border border-divider rounded-lg bg-surface">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
                <option value="verified">AI Verified</option>
              </select>
              <select value={queuePriorityFilter} onChange={e => setQueuePriorityFilter(e.target.value)}
                className="text-xs px-2 py-1.5 border border-divider rounded-lg bg-surface">
                <option value="all">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <span className="text-xs text-ink-3 ml-auto">
                {filteredQueue.length} of {queue.length} items
              </span>
            </div>

            {/* ── Queue Data Table ────────────────────── */}
            <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
              {queueLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-ink-3 mx-auto mb-3 animate-spin" />
                  <p className="text-sm text-ink-3">Loading queue...</p>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="p-12 text-center">
                  <Package className="w-12 h-12 text-ink-3 mx-auto mb-4" />
                  <p className="text-ink-3 text-sm">
                    {queue.length === 0
                      ? 'No items in queue yet. Add content to start tracking your distribution pipeline.'
                      : 'No items match the current filters.'}
                  </p>
                </div>
              ) : (
                <div>
                  <table className="w-full text-sm">
                    <thead className="bg-canvas border-b border-divider">
                      <tr>
                        <th className="px-3 py-3 w-8">
                          <input type="checkbox"
                            checked={selectedQueueIds.size === filteredQueue.length && filteredQueue.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-divider text-ink focus:ring-ink/20" />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase">Title</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase">Source</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase">Channel</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase">Priority</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase">Status</th>
                        <th className="text-left px-3 py-3 text-xs font-semibold text-ink-3 uppercase">Created</th>
                        <th className="px-3 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider-light">
                      {filteredQueue.map(item => {
                        const priStyle = item.priority === 'critical'
                          ? 'bg-red-soft-bg text-red-soft'
                          : item.priority === 'high'
                          ? 'bg-caution-bg text-caution'
                          : item.priority === 'medium'
                          ? 'bg-caution-bg text-caution'
                          : 'bg-surface-warm text-ink-2'
                        const statusColors: Record<string, string> = {
                          draft: 'bg-surface-warm text-ink-2',
                          ready: 'bg-surface-warm text-ink-2',
                          scheduled: 'bg-surface-warm text-ink-2',
                          published: 'bg-sage-bg text-sage',
                          verified: 'bg-surface-warm text-ink-2',
                          failed: 'bg-red-soft-bg text-red-soft',
                          archived: 'bg-surface-warm text-ink-3',
                        }
                        const isExpanded = expandedQueueId === item.id
                        return (
                          <React.Fragment key={item.id}>
                            <tr className={`hover:bg-surface-warm cursor-pointer ${selectedQueueIds.has(item.id) ? 'bg-red-soft-bg/40' : ''}`}
                              onClick={() => setExpandedQueueId(isExpanded ? null : item.id)}>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <input type="checkbox"
                                  checked={selectedQueueIds.has(item.id)}
                                  onChange={() => toggleSelectQueue(item.id)}
                                  className="rounded border-divider text-ink focus:ring-ink/20" />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-ink truncate max-w-[280px]">{item.title}</div>
                                {item.notes && <div className="text-[10px] text-ink-3 truncate max-w-[280px]">{item.notes}</div>}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    item.source_tab === 'strategy' ? 'bg-surface-warm text-ink-2' :
                                    item.source_tab === 'map' ? 'bg-sage-bg text-sage' :
                                    item.source_tab === 'reddit' ? 'bg-caution-bg text-caution' :
                                    'bg-surface-warm text-ink-3'
                                  }`}>
                                    {item.source_tab || 'manual'}
                                  </span>
                                  {item.post_type === 'reply' && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-caution-bg text-caution rounded-full font-medium">reply</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-ink-2 text-xs">{item.target_channel || '—'}</td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <select value={item.priority}
                                  onChange={e => handleUpdatePriority(item.id, e.target.value)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${priStyle}`}>
                                  <option value="critical">Critical</option>
                                  <option value="high">High</option>
                                  <option value="medium">Medium</option>
                                  <option value="low">Low</option>
                                </select>
                              </td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <select value={item.status}
                                  onChange={e => handleUpdateStatus(item.id, e.target.value)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${statusColors[item.status] || 'bg-surface-warm text-ink-2'}`}>
                                  <option value="draft">Pending</option>
                                  <option value="published">Published</option>
                                  <option value="verified">AI Verified</option>
                                </select>
                              </td>
                              <td className="px-3 py-3 text-xs text-ink-3">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-3 py-3 flex items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); openEditItem(item); }}
                                  aria-label="Edit item"
                                  title="Edit"
                                  className="p-1 text-ink-3 hover:text-ink-2 rounded focus:outline-none focus:ring-2 focus:ring-ink/10 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteQueue(item.id); }}
                                  aria-label="Delete item"
                                  title="Delete"
                                  className="p-1 text-ink-3 hover:text-red-soft rounded focus:outline-none focus:ring-2 focus:ring-red-soft/20 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {isExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5 text-ink-3" />
                                  : <ChevronDown className="w-3.5 h-3.5 text-ink-3" />}
                              </td>
                            </tr>
                            {/* ── Expanded Detail Row ──── */}
                            {isExpanded && (
                              <tr className="bg-canvas/60">
                                <td colSpan={8} className="px-6 py-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    {/* Info column */}
                                    <div className="space-y-2">
                                      <div><span className="text-ink-3">Source Module:</span> <span className="text-ink-2 capitalize">{item.source_module}</span></div>
                                      <div><span className="text-ink-3">Source Tab:</span>{' '}
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          item.source_tab === 'strategy' ? 'bg-surface-warm text-ink-2' :
                                          item.source_tab === 'map' ? 'bg-sage-bg text-sage' :
                                          item.source_tab === 'reddit' ? 'bg-caution-bg text-caution' :
                                          'bg-surface-warm text-ink-2'
                                        }`}>{item.source_tab || 'manual'}</span>
                                      </div>
                                      <div><span className="text-ink-3">Brand:</span> <span className="text-ink-2">{item.brand_name || '—'}</span></div>
                                      <div><span className="text-ink-3">Industry:</span> <span className="text-ink-2 capitalize">{item.industry || '—'}</span></div>
                                      {item.content_file_name && (
                                        <div><span className="text-ink-3">File:</span> <span className="text-ink-2">{item.content_file_name}</span></div>
                                      )}
                                      <div><span className="text-ink-3">Post Type:</span>{' '}
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          item.post_type === 'reply' ? 'bg-caution-bg text-caution' : 'bg-surface-warm text-ink-2'
                                        }`}>{item.post_type === 'reply' ? 'Reply / Comment' : 'Main Post'}</span>
                                      </div>
                                      {item.target_thread_url && (
                                        <div><span className="text-ink-3">Thread URL:</span>{' '}
                                          <a href={item.target_thread_url} target="_blank" rel="noopener noreferrer"
                                            className="text-caution underline truncate max-w-[200px] inline-block align-bottom">{item.target_thread_url}</a>
                                        </div>
                                      )}
                                      {item.subreddit && (
                                        <div><span className="text-ink-3">Subreddit:</span> <span className="text-caution font-medium">{item.subreddit}</span></div>
                                      )}
                                      {item.target_url && (
                                        <div><span className="text-ink-3">Published URL:</span>{' '}
                                          <a href={item.target_url} target="_blank" rel="noopener noreferrer"
                                            className="text-ink-2 underline">{item.target_url}</a>
                                        </div>
                                      )}
                                      {item.publish_status && (
                                        <div><span className="text-ink-3">Publish Status:</span>{' '}
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            item.publish_status === 'success' ? 'bg-sage-bg text-sage' :
                                            item.publish_status === 'failed' ? 'bg-red-soft-bg text-red-soft' :
                                            item.publish_status === 'pending' ? 'bg-caution-bg text-caution' :
                                            'bg-surface-warm text-ink-2'
                                          }`}>{item.publish_status}</span>
                                        </div>
                                      )}
                                      {item.publish_error && (
                                        <div className="text-red-soft"><span className="text-ink-3">Error:</span> {item.publish_error}</div>
                                      )}
                                    </div>
                                    {/* Dates column */}
                                    <div className="space-y-2">
                                      <div><span className="text-ink-3">Created:</span> <span className="text-ink-2">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</span></div>
                                      <div><span className="text-ink-3">Updated:</span> <span className="text-ink-2">{item.updated_at ? new Date(item.updated_at).toLocaleString() : '—'}</span></div>
                                      {item.scheduled_at && <div><span className="text-ink-3">Scheduled:</span> <span className="text-ink-2">{new Date(item.scheduled_at).toLocaleString()}</span></div>}
                                      {item.published_at && <div><span className="text-ink-3">Published:</span> <span className="text-sage font-medium">{new Date(item.published_at).toLocaleString()}</span></div>}
                                      {item.verified_at && <div><span className="text-ink-3">Verified:</span> <span className="text-ink-2 font-medium">{new Date(item.verified_at).toLocaleString()}</span></div>}
                                      {item.verification_url && (
                                        <div><span className="text-ink-3">AI Citation URL:</span>{' '}
                                          <a href={item.verification_url} target="_blank" rel="noopener noreferrer"
                                            className="text-ink-2 underline">{item.verification_url}</a>
                                        </div>
                                      )}
                                    </div>
                                    {/* Status History column */}
                                    <div>
                                      <div className="flex items-center gap-1 text-ink-3 mb-2">
                                        <History className="w-3 h-3" /> Status History
                                      </div>
                                      {item.status_history && item.status_history.length > 0 ? (
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                          {item.status_history.map((h, hi) => (
                                            <div key={hi} className="flex items-center gap-2 text-[11px]">
                                              <span className="text-ink-3">{new Date(h.changed_at).toLocaleString()}</span>
                                              <span className="bg-surface-muted text-ink-2 px-1.5 py-0.5 rounded capitalize">{h.from_status}</span>
                                              <ArrowRight className="w-3 h-3 text-ink-3" />
                                              <span className="bg-surface-warm text-ink-2 px-1.5 py-0.5 rounded capitalize">{h.to_status}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-ink-3 italic">No status changes yet</p>
                                      )}
                                    </div>
                                  </div>
                                  {item.content_preview && (
                                    <div className="mt-3 p-3 bg-surface rounded-lg border border-divider-light text-xs text-ink-2">
                                      <span className="text-ink-3 text-[10px] uppercase font-semibold block mb-1">Preview</span>
                                      {item.content_preview}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Channel Breakdown (from stats) ─────── */}
            {queueStats && Object.keys(queueStats.by_channel).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-divider-light p-4">
                  <h4 className="text-xs font-semibold text-ink-3 uppercase mb-3 flex items-center gap-1">
                    <BarChart3 className="w-3.5 h-3.5" /> By Channel
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(queueStats.by_channel).sort((a, b) => b[1] - a[1]).map(([ch, cnt]) => (
                      <div key={ch} className="flex items-center gap-2 text-xs">
                        <span className="text-ink-2 capitalize w-24 truncate">{ch}</span>
                        <div className="flex-1 h-1.5 bg-surface-warm rounded-full overflow-hidden">
                          <div className="h-full bg-red-soft rounded-full"
                            style={{ width: `${Math.round((cnt / queueStats.total) * 100)}%` }}></div>
                        </div>
                        <span className="text-ink-3 font-medium w-6 text-right">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-surface rounded-xl border border-divider-light p-4">
                  <h4 className="text-xs font-semibold text-ink-3 uppercase mb-3 flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" /> By Content Type
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(queueStats.by_content_type).sort((a, b) => b[1] - a[1]).map(([ct, cnt]) => (
                      <div key={ct} className="flex items-center gap-2 text-xs">
                        <span className="text-ink-2 capitalize w-24 truncate">{ct}</span>
                        <div className="flex-1 h-1.5 bg-surface-warm rounded-full overflow-hidden">
                          <div className="h-full bg-ink-2 rounded-full"
                            style={{ width: `${Math.round((cnt / queueStats.total) * 100)}%` }}></div>
                        </div>
                        <span className="text-ink-3 font-medium w-6 text-right">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ Edit Queue Item Modal ════════════════ */}
            {editingItem && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeEditItem}>
                <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-divider-light">
                    <h3 className="font-semibold text-ink flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-ink-2" /> Edit Content
                    </h3>
                    <button onClick={closeEditItem} className="p-1 text-ink-3 hover:text-ink-2 rounded-lg hover:bg-surface-warm">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Body — simplified to AI Visibility-relevant fields */}
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <label className="text-xs text-ink-3 mb-1 block font-medium">Title</label>
                      <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/10" />
                    </div>
                    <div>
                      <label className="text-xs text-ink-3 mb-1 block font-medium">Published URL <span className="text-ink-3">(where you published the content)</span></label>
                      <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/10" />
                    </div>
                    <div>
                      <label className="text-xs text-ink-3 mb-1 block font-medium">Verification Status</label>
                      <select value={editingItem.status === 'verified' ? 'verified' : editingItem.status === 'published' ? 'published' : 'draft'}
                        onChange={e => handleUpdateStatus(editingItem.id, e.target.value)}
                        className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink">
                        <option value="draft">Pending</option>
                        <option value="published">Published</option>
                        <option value="verified">AI Verified</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-ink-3 mb-1 block font-medium">Notes</label>
                      <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                        rows={2} placeholder="Optional notes..."
                        className="w-full px-3 py-2.5 border border-divider rounded-lg text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink/10 resize-none" />
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-divider-light bg-canvas/50 rounded-b-2xl">
                    <span className="text-[10px] text-ink-3">
                      ID: {editingItem.id.slice(0, 8)}... · Created {editingItem.created_at ? new Date(editingItem.created_at).toLocaleDateString() : '—'}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={closeEditItem}
                        className="px-4 py-2 text-sm text-ink-3 hover:bg-surface-warm rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleSaveEdit}
                        disabled={!editTitle.trim() || editSaving}
                        className="px-5 py-2 bg-ink text-ink-inv text-sm font-medium rounded-lg hover:bg-[#2d2d2c] disabled:opacity-50 flex items-center gap-2 transition-colors">
                        {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 4: Reddit Strategy (Phase 4 Enhanced)     */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'reddit' && (
          <div className="space-y-6">
            {!brandName.trim() && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <MessageSquare className="w-12 h-12 text-ink-3 mx-auto mb-4" />
                <p className="text-ink-3">Enter your brand details above first</p>
              </div>
            )}

            {redditLoading && !redditResult && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-soft mx-auto mb-4" />
                <p className="text-ink-2">Generating comprehensive Reddit strategy for {brandName}...</p>
                {/* Progressive loading indicator */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  {['subreddits', 'templates', 'competitors', 'complete'].map((phase) => {
                    const phaseOrder = ['subreddits', 'templates', 'competitors', 'complete']
                    const currentIdx = redditProgressPhase ? phaseOrder.indexOf(redditProgressPhase) : -1
                    const thisIdx = phaseOrder.indexOf(phase)
                    const isDone = currentIdx >= thisIdx
                    const isActive = currentIdx === thisIdx - 1
                    const labels: Record<string, string> = { subreddits: 'Subreddits', templates: 'Templates', competitors: 'Competitors', complete: 'Finalizing' }
                    return (
                      <div key={phase} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${isDone ? 'bg-sage-bg' : isActive ? 'bg-red-soft animate-pulse' : 'bg-surface-muted'}`} />
                        <span className={`text-xs ${isDone ? 'text-sage font-medium' : isActive ? 'text-red-soft font-medium' : 'text-ink-3'}`}>{labels[phase]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!redditLoading && !redditResult && brandName.trim() && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <div className="w-16 h-16 bg-red-soft-bg rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔴</span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Reddit Deep Strategy</h3>
                <p className="text-ink-3 text-sm mb-4 max-w-md mx-auto">
                  Reddit is ChatGPT&apos;s #1 UGC citation source. Get AI-differentiated subreddit recommendations, competitor analysis, and post templates.
                </p>
                <button onClick={() => handleRedditStrategy()}
                  className="px-5 py-2.5 bg-ink text-ink-inv rounded-lg hover:bg-[#2d2d2c] text-sm font-medium flex items-center gap-2 mx-auto">
                  <Crosshair className="w-4 h-4" /> Generate Reddit Strategy
                </button>
              </div>
            )}

            {redditResult && (
              <>
                {/* Reddit Importance Banner with Monitor Data */}
                <div className="bg-ink rounded-xl p-6 text-ink-inv relative overflow-hidden">
                  {/* Progressive loading bar overlay */}
                  {redditLoading && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-white/60 animate-pulse transition-all duration-500" style={{ width: redditProgressPhase === 'static' ? '10%' : redditProgressPhase === 'subreddits' ? '40%' : redditProgressPhase === 'templates' ? '70%' : redditProgressPhase === 'competitors' ? '90%' : '100%' }} />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-1">
                        Reddit Strategy for {redditResult.brand_name}
                        {redditLoading && redditProgressPhase === 'static' && <span className="ml-2 text-sm font-normal text-white/70 inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI personalizing...</span>}
                        {redditLoading && redditProgressPhase && redditProgressPhase !== 'static' && <span className="ml-2 text-sm font-normal text-white/70 inline-flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> loading more data...</span>}
                      </h3>
                      <p className="text-white/80 text-sm">Industry: {redditResult.industry} | {redditResult.subreddit_recommendations.length} subreddits | {redditResult.post_templates.length} templates</p>
                    </div>
                    <div className="flex items-center gap-6">
                      {redditResult.monitor_reddit_data?.reddit_cited && (
                        <div className="text-center">
                          <p className="text-xl font-bold font-mono">{redditResult.monitor_reddit_data.reddit_citation_count}</p>
                          <p className="text-xs text-white/70">Monitor Citations</p>
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-4xl font-bold font-mono">{redditResult.reddit_importance_score}</p>
                        <p className="text-xs text-white/70">/100 importance</p>
                      </div>
                    </div>
                  </div>

                  {/* Monitor Reddit Sync */}
                  {redditResult.monitor_reddit_data && redditResult.monitor_reddit_data.reddit_cited && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-xs text-white/70 mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> Monitor Data: Reddit citations detected</p>
                      <div className="flex flex-wrap gap-2">
                        {redditResult.monitor_reddit_data.subreddits_cited.map(sub => (
                          <span key={sub} className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">{sub}</span>
                        ))}
                        {redditResult.monitor_reddit_data.reddit_urls_cited.slice(0, 3).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="px-2 py-1 bg-white/10 rounded-full text-xs hover:bg-white/20 truncate max-w-[200px]">
                            {url.replace('https://', '').slice(0, 40)}...
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reddit Sub-Tab Navigation */}
                <div className="bg-surface rounded-xl border border-divider-light p-1 flex gap-1">
                  {([
                    { key: 'subreddits' as RedditSubTab, label: 'Subreddits', icon: <MapPin className="w-3.5 h-3.5" />, count: redditResult.subreddit_recommendations.length },
                    { key: 'competitors' as RedditSubTab, label: 'Competitor Intel', icon: <Swords className="w-3.5 h-3.5" />, count: redditResult.competitor_reddit_insights.length },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setRedditSubTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        redditSubTab === tab.key
                          ? 'bg-ink text-ink-inv shadow-sm'
                          : 'text-ink-3 hover:bg-surface-warm'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${redditSubTab === tab.key ? 'bg-white/20' : 'bg-surface-warm'}`}>{tab.count}</span>}
                    </button>
                  ))}
                </div>

                {/* ── Sub-Tab: Subreddits ── */}
                {redditSubTab === 'subreddits' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {redditResult.subreddit_recommendations.map((sub, i) => (
                        <div key={sub.name} className="bg-surface rounded-xl border border-divider-light p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-red-soft-bg text-red-soft rounded-full flex items-center justify-center text-sm font-bold">#{i + 1}</span>
                              <div>
                                <a href={sub.url} target="_blank" rel="noopener noreferrer"
                                  className="font-semibold text-ink hover:text-red-soft flex items-center gap-1.5">
                                  {sub.name} <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-ink-3">{sub.subscribers} subscribers</span>
                                  <span className="text-xs px-2 py-0.5 bg-surface-warm text-ink-2 rounded-full font-medium">{sub.post_type}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    sub.ai_citation_likelihood === 'high' ? 'bg-sage-bg text-sage' :
                                    sub.ai_citation_likelihood === 'medium' ? 'bg-caution-bg text-caution' :
                                    'bg-surface-warm text-ink-3'
                                  }`}>
                                    AI Citation: {sub.ai_citation_likelihood || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold font-mono text-ink">{sub.relevance_score}</p>
                              <p className="text-xs text-ink-3">relevance</p>
                            </div>
                          </div>

                          {/* Phase 4: Differentiation metrics */}
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-canvas rounded-lg p-2.5 text-center">
                              <p className="text-xs text-ink-3">Competitor Activity</p>
                              <p className={`text-xs font-semibold ${
                                sub.competitor_activity === 'active' ? 'text-red-soft' :
                                sub.competitor_activity === 'moderate' ? 'text-caution' :
                                'text-sage'
                              }`}>{sub.competitor_activity || 'Unknown'}</p>
                            </div>
                            <div className="bg-canvas rounded-lg p-2.5 text-center">
                              <p className="text-xs text-ink-3">Content Saturation</p>
                              <p className={`text-xs font-semibold ${
                                sub.content_saturation === 'high' ? 'text-red-soft' :
                                sub.content_saturation === 'medium' ? 'text-caution' :
                                'text-sage'
                              }`}>{sub.content_saturation || 'Medium'}</p>
                            </div>
                            <div className="bg-canvas rounded-lg p-2.5 text-center">
                              <p className="text-xs text-ink-3">Post Frequency</p>
                              <p className="text-xs font-semibold text-ink-2">{sub.recommended_frequency || 'N/A'}</p>
                            </div>
                          </div>

                          {sub.title_template && (
                            <div className="bg-canvas rounded-lg p-3 mb-3">
                              <p className="text-xs text-ink-3 mb-1">Suggested Title:</p>
                              <p className="text-sm text-ink font-medium italic">&ldquo;{sub.title_template}&rdquo;</p>
                            </div>
                          )}

                          {sub.engagement_strategy && (
                            <div className="bg-surface-warm rounded-lg p-3 mb-3">
                              <p className="text-xs text-ink-2 font-semibold mb-0.5">Engagement Strategy</p>
                              <p className="text-xs text-ink-2">{sub.engagement_strategy}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-ink-3 font-semibold mb-1">Guidelines</p>
                              {sub.content_guidelines.map((g, j) => (
                                <p key={j} className="text-xs text-ink-2 flex items-start gap-1.5 mb-0.5">
                                  <CheckCircle className="w-3 h-3 text-sage mt-0.5 flex-shrink-0" /> {g}
                                </p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs text-ink-3 font-semibold mb-1">Risks</p>
                              {sub.risks.map((r, j) => (
                                <p key={j} className="text-xs text-red-soft flex items-start gap-1.5 mb-0.5">
                                  <AlertTriangle className="w-3 h-3 text-red-soft mt-0.5 flex-shrink-0" /> {r}
                                </p>
                              ))}
                              {sub.self_promo_rules && (
                                <p className="text-xs text-caution flex items-start gap-1.5 mt-1">
                                  <Shield className="w-3 h-3 text-caution mt-0.5 flex-shrink-0" /> {sub.self_promo_rules}
                                </p>
                              )}
                            </div>
                          </div>

                          {sub.best_posting_times && (
                            <p className="text-xs text-ink-3 mt-3 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {sub.best_posting_times}
                            </p>
                          )}

                          {/* Push Content to Reddit */}
                          <div className="mt-4 pt-3 border-t border-divider-light">
                            <button onClick={() => openPushModal('Reddit', 'reddit', 'reddit', sub.name)}
                              className="w-full py-3 bg-ink hover:bg-[#2d2d2c] text-ink-inv font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm">
                              <ArrowUpRight className="w-4 h-4" /> Push Content to {sub.name}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Best Practices + Risks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface rounded-xl border border-divider-light p-5">
                        <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-caution" /> Best Practices
                        </h4>
                        <div className="space-y-1.5">
                          {redditResult.general_tips.map((tip, i) => (
                            <p key={i} className="text-xs text-ink-2 flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-sage mt-0.5 flex-shrink-0" /> {tip}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-red-soft-bg rounded-xl border border-red-soft/30 p-5">
                        <h4 className="text-xs font-semibold text-red-soft uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Risk Warnings
                        </h4>
                        <div className="space-y-1.5">
                          {redditResult.risk_warnings.map((warn, i) => (
                            <p key={i} className="text-xs text-red-soft">{warn}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Sub-Tab: Competitor Intel ── */}
                {redditSubTab === 'competitors' && (
                  <div className="space-y-4">
                    {redditLoading && redditResult.competitor_reddit_insights.length === 0 ? (
                      <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-ink-2 mx-auto mb-3" />
                        <p className="text-ink-2 text-sm">Loading competitor intelligence...</p>
                        <p className="text-ink-3 text-xs mt-1">This data is being fetched in the background</p>
                      </div>
                    ) : redditResult.competitor_reddit_insights.length === 0 ? (
                      <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                        <Swords className="w-10 h-10 text-ink-3 mx-auto mb-3" />
                        <p className="text-ink-3 text-sm">No competitor data available.</p>
                        <p className="text-ink-3 text-xs mt-1">Add competitors in the Brand Input section above, then regenerate Reddit Strategy.</p>
                      </div>
                    ) : (
                      <>
                        {/* Monitor competitor Reddit citations */}
                        {redditResult.monitor_reddit_data && Object.keys(redditResult.monitor_reddit_data.competitor_reddit_citations).length > 0 && (
                          <div className="bg-surface-warm rounded-xl border border-divider p-5">
                            <h4 className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5" /> Monitor: Competitor Reddit Citations
                            </h4>
                            <div className="flex flex-wrap gap-3">
                              {Object.entries(redditResult.monitor_reddit_data.competitor_reddit_citations).map(([comp, count]) => (
                                <div key={comp} className="bg-surface rounded-lg px-4 py-2 flex items-center gap-2">
                                  <span className="text-sm font-medium text-ink">{comp}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${count > 0 ? 'bg-red-soft-bg text-red-soft' : 'bg-surface-warm text-ink-3'}`}>
                                    {count} citations
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {redditResult.competitor_reddit_insights.map((comp, i) => (
                          <div key={comp.competitor_name} className="bg-surface rounded-xl border border-divider-light overflow-hidden">
                            <div className="px-5 py-4 bg-canvas border-b border-divider flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 bg-caution-bg text-caution rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                                <div>
                                  <h4 className="font-semibold text-ink">{comp.competitor_name}</h4>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    comp.activity_level === 'active' ? 'bg-red-soft-bg text-red-soft' :
                                    comp.activity_level === 'moderate' ? 'bg-caution-bg text-caution' :
                                    'bg-sage-bg text-sage'
                                  }`}>
                                    {comp.activity_level} on Reddit
                                  </span>
                                </div>
                              </div>
                              {comp.estimated_post_frequency && (
                                <span className="text-xs text-ink-3">{comp.estimated_post_frequency}</span>
                              )}
                            </div>

                            <div className="p-5 space-y-4">
                              <div className="flex flex-wrap gap-2">
                                {comp.estimated_subreddits.map(sub => (
                                  <span key={sub} className="px-2.5 py-1 bg-surface-warm text-ink-2 rounded-full text-xs font-medium">{sub}</span>
                                ))}
                              </div>

                              {comp.content_types_used.length > 0 && (
                                <div>
                                  <p className="text-xs text-ink-3 mb-1.5">Content types used:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {comp.content_types_used.map(ct => (
                                      <span key={ct} className="px-2 py-0.5 bg-surface-warm text-ink-2 rounded text-xs">{ct}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-sage-bg rounded-lg p-3">
                                  <p className="text-xs text-sage font-semibold mb-1.5">Strengths</p>
                                  {comp.strengths.map((s, j) => (
                                    <p key={j} className="text-xs text-sage mb-0.5">• {s}</p>
                                  ))}
                                </div>
                                <div className="bg-red-soft-bg rounded-lg p-3">
                                  <p className="text-xs text-red-soft font-semibold mb-1.5">Weaknesses</p>
                                  {comp.weaknesses.map((w, j) => (
                                    <p key={j} className="text-xs text-red-soft mb-0.5">• {w}</p>
                                  ))}
                                </div>
                                <div className="bg-surface-warm rounded-lg p-3">
                                  <p className="text-xs text-ink-2 font-semibold mb-1.5">Your Opportunity</p>
                                  {comp.opportunity_gaps.map((g, j) => (
                                    <p key={j} className="text-xs text-ink-2 mb-0.5">• {g}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* TAB 5: Distribution Map                       */}
        {/* ═══════════════════════════════════════════════ */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {!brandName.trim() && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <Map className="w-12 h-12 text-ink-3 mx-auto mb-4" />
                <p className="text-ink-3">Enter your brand details above first</p>
              </div>
            )}

            {mapLoading && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-red-soft mx-auto mb-4" />
                <p className="text-ink-2">Loading Distribution Map...</p>
                <p className="text-ink-3 text-sm mt-1">Syncing Monitor citation data with channel strategy</p>
              </div>
            )}

            {!mapLoading && !distMap && brandName.trim() && (
              <div className="bg-surface rounded-xl border border-divider-light p-12 text-center">
                <div className="w-16 h-16 bg-surface-warm rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Map className="w-8 h-8 text-ink-2" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">Distribution Coverage Map</h3>
                <p className="text-ink-3 text-sm mb-4 max-w-md mx-auto">
                  Visualize all distribution channels with their priority, gap opportunities, and citation status.
                </p>
                <button onClick={handleLoadMap}
                  className="px-4 py-2 bg-ink text-ink-inv rounded-lg hover:bg-[#2d2d2c] text-sm font-medium">
                  Load Distribution Map
                </button>
              </div>
            )}

            {distMap && (
              <>
                {/* Coverage Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-surface rounded-xl border border-divider-light p-4 text-center">
                    <Layers className="w-5 h-5 text-ink-3 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-ink font-mono">{distMap.total_count}</p>
                    <p className="text-xs text-ink-3">Total Channels</p>
                  </div>
                  <div className="bg-sage-bg rounded-xl border border-sage/30 p-4 text-center">
                    <CheckCircle className="w-5 h-5 text-sage mx-auto mb-1" />
                    <p className="text-2xl font-bold text-sage font-mono">{distMap.cited_count}</p>
                    <p className="text-xs text-sage">Cited by AI</p>
                  </div>
                  <div className="bg-surface-warm rounded-xl border border-divider p-4 text-center">
                    <Clock className="w-5 h-5 text-ink-2 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-ink-2 font-mono">{distMap.planned_count}</p>
                    <p className="text-xs text-ink-2">Planned</p>
                  </div>
                  <div className="bg-red-soft-bg rounded-xl border border-red-soft/30 p-4 text-center">
                    <AlertCircle className="w-5 h-5 text-red-soft mx-auto mb-1" />
                    <p className="text-2xl font-bold text-red-soft font-mono">{distMap.gap_count}</p>
                    <p className="text-xs text-red-soft">Gaps</p>
                  </div>
                  <div className="bg-surface rounded-xl border border-divider-light p-4 text-center">
                    <TrendingUp className="w-5 h-5 text-ink-3 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-ink font-mono">{distMap.overall_coverage_pct}%</p>
                    <p className="text-xs text-ink-3">Coverage</p>
                  </div>
                </div>

                {/* Coverage Progress Bar */}
                <div className="bg-surface rounded-xl border border-divider-light p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Overall AI Citation Coverage
                    </h3>
                    <span className="text-lg font-bold text-ink font-mono">{distMap.overall_coverage_pct}%</span>
                  </div>
                  <div className="w-full h-4 bg-surface-warm rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-soft via-caution to-sage transition-all"
                         style={{ width: `${Math.max(distMap.overall_coverage_pct, 3)}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-ink-3">
                    <span>0% — No coverage</span>
                    <span>100% — All channels cited</span>
                  </div>
                </div>

                {/* Monitor Sync Recommendations */}
                {monitorSync && monitorSync.recommendations.length > 0 && (
                  <div className="bg-surface-warm rounded-xl border border-divider p-6">
                    <h3 className="text-sm font-semibold text-ink-2 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Monitor × Distribution Insights
                    </h3>
                    <div className="space-y-2">
                      {monitorSync.recommendations.map((rec, i) => (
                        <p key={i} className="text-sm text-ink-2">{rec}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Category Breakdown from Monitor */}
                {monitorSync && monitorSync.monitor_data_available && Object.keys(monitorSync.source_category_breakdown).length > 0 && (
                  <div className="bg-surface rounded-xl border border-divider-light p-6">
                    <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Source Category Citations (from Monitor)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(monitorSync.source_category_breakdown).map(([cat, count]) => (
                        <div key={cat} className="bg-canvas rounded-lg p-3 flex items-center gap-3">
                          <span className="text-xl">{catIcon(cat)}</span>
                          <div>
                            <p className="text-xs text-ink-3 uppercase">{cat}</p>
                            <p className="text-lg font-bold text-ink">{count}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Bar */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-ink-3" />
                  {['all', 'cited', 'gap', 'planned'].map(f => (
                    <button
                      key={f}
                      onClick={() => setMapFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        mapFilter === f
                          ? 'bg-ink text-ink-inv'
                          : 'bg-surface-warm text-ink-2 hover:bg-surface-muted'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'cited' ? `Cited (${distMap.cited_count})` : f === 'gap' ? `Gaps (${distMap.gap_count})` : `Planned (${distMap.planned_count})`}
                    </button>
                  ))}
                  <button onClick={handleLoadMap} className="ml-auto text-xs text-ink-3 hover:text-red-soft flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {/* Channel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {distMap.channels
                    .filter(ch => {
                      if (mapFilter === 'all') return true
                      if (mapFilter === 'cited') return ch.is_cited
                      if (mapFilter === 'gap') return ch.status === 'not_started'
                      if (mapFilter === 'planned') return ch.status === 'planned'
                      return true
                    })
                    .map(ch => (
                      <MapChannelCard key={ch.channel_id} item={ch}
                        onPush={(name, id) => {
                          if (id === 'reddit') {
                            setActiveTab('reddit')
                            if (!redditResult) handleRedditStrategy()
                          } else {
                            openPushModal(name, id, 'map')
                          }
                        }}
                        onRedditLink={() => {
                          setActiveTab('reddit')
                          if (!redditResult) handleRedditStrategy()
                        }}
                      />
                    ))
                  }
                </div>

                {/* Citation Detail Table */}
                {monitorSync && monitorSync.monitor_data_available && monitorSync.channel_citations.some(c => c.citation_count > 0) && (
                  <div className="bg-surface rounded-xl border border-divider-light overflow-hidden">
                    <div className="px-6 py-4 bg-canvas border-b border-divider">
                      <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider flex items-center gap-2">
                        <Link2 className="w-4 h-4" /> Detailed Citation Data (from Monitor)
                      </h3>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-divider-light">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-ink-3 uppercase">Channel</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase">Category</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase">Citations</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase">URLs</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase">Sentiment</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase">Presence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider-light">
                        {monitorSync.channel_citations
                          .filter(c => c.citation_count > 0)
                          .map(cc => {
                            const pres = presenceStyle(cc.presence_level)
                            return (
                              <tr key={cc.channel_id} className="hover:bg-surface-warm">
                                <td className="px-6 py-3 font-medium text-ink">{cc.channel_name}</td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-ink-3">{catIcon(cc.source_category)} {cc.source_category.toUpperCase()}</span>
                                </td>
                                <td className="px-4 py-3 text-center font-bold font-mono text-ink">{cc.citation_count}</td>
                                <td className="px-4 py-3 text-center font-mono text-ink-2">{cc.url_count}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-xs font-medium ${cc.avg_sentiment > 0.3 ? 'text-sage' : cc.avg_sentiment < -0.3 ? 'text-red-soft' : 'text-ink-3'}`}>
                                    {cc.avg_sentiment > 0 ? '+' : ''}{cc.avg_sentiment.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pres.bg} ${pres.text}`}>{pres.label}</span>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ Bottom Insight ═══ */}
        <section className="bg-surface rounded-xl border border-divider-light p-6">
          <h3 className="text-sm font-medium text-ink-3 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-caution" />
            AI Citation Intelligence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-soft-bg rounded-lg p-4">
              <p className="text-xs text-red-soft font-semibold mb-1">#1 UGC Source</p>
              <p className="text-sm text-ink-2">Reddit is ChatGPT&apos;s most-cited UGC source. Posts with 50+ upvotes have 3× higher citation probability.</p>
            </div>
            <div className="bg-surface-warm rounded-lg p-4">
              <p className="text-xs text-ink-2 font-semibold mb-1">#1 Reference Source</p>
              <p className="text-sm text-ink-2">Wikipedia remains the top reference. Having a Wikipedia page increases AI citation by 5-10×.</p>
            </div>
            <div className="bg-sage-bg rounded-lg p-4">
              <p className="text-xs text-sage font-semibold mb-1">Content Longevity</p>
              <p className="text-sm text-ink-2">Documentation and wiki content stays indexed permanently. Blog and medium posts last 2-5 years.</p>
            </div>
          </div>
        </section>
      </div>

      {/* ═══ Push Content Modal ═══ */}
      {pushModalOpen && (
        <PushContentModal
          channel={pushTargetChannel}
          channelId={pushTargetChannelId}
          sourceTab={pushSourceTab}
          subreddit={pushSubreddit}
          redditTemplateId={pushRedditTemplateId}
          brandName={brandName}
          industry={industry}
          priority="medium"
          supportsReply={SOCIAL_CHANNEL_IDS.has(pushTargetChannelId)}
          redditTemplates={redditResult?.post_templates?.map(t => ({
            id: t.id, template_name: t.template_name, target_subreddit: t.target_subreddit,
            post_type: t.post_type, title_template: t.title_template, body_template: t.body_template,
            content_type: t.content_type, ai_optimization_tips: t.ai_optimization_tips,
            estimated_engagement: t.estimated_engagement, best_time_to_post: t.best_time_to_post,
          }))}
          onPush={handlePushContent}
          onClose={() => setPushModalOpen(false)}
        />
      )}
    </div>
  )
}
