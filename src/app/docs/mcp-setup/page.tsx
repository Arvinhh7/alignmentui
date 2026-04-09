'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import LanguageSwitch from '@/components/LanguageSwitch'
import { LogoFull } from '@/components/Logo'
import {
  CheckCircle2, Copy, ExternalLink, Terminal, Settings,
  Key, Zap, MessageSquare, ChevronRight, AlertCircle,
} from 'lucide-react'

// ─── Bilingual content ────────────────────────────────────────────────────────
const content = {
  en: {
    badge: '5-min setup',
    title: 'MCP Setup Guide',
    subtitle: 'Connect your Alignment AI Visibility data to Claude Desktop, Cursor, or Windsurf — query your brand data with natural language.',
    questionsTitle: 'Once connected, you can ask things like',
    questions: [
      '"Which AI platforms mentioned my brand recently?"',
      '"Did my AIGVR score change this week?"',
      '"Which AI platform is friendliest to my brand?"',
      '"What\u2019s the trend in my brand\u2019s AI visibility?"',
    ],
    steps: [
      {
        title: 'Get your API Token',
        body: 'Log in to Alignment, go to Settings → MCP — AI Tools Integration, and create a token.',
        warning: 'Token is shown only once — copy it immediately',
        warningDetail: 'Format: alg_xxxxxxxxxxxxxxxx...',
        cta: 'Go to Settings to create a token',
        namingTitle: 'Token naming tips',
        namingHint: 'Name by device or purpose so you can identify and revoke later',
        pythonHint: "Don't have Python?",
        pythonDetail: 'Visit python.org/downloads to install Python 3.11+, then re-open your terminal and run the pip command again.',
      },
      {
        title: 'Install the MCP Server',
        body: 'Install the Alignment MCP Server on your computer (requires Python 3.11+):',
        note: 'After installation, the alignment-mcp command is available. Verify: alignment-mcp --help',
      },
      {
        title: 'Configure your AI tool',
        body: 'Edit your AI tool\'s config file and paste the snippet below.',
        claudeMacPath: 'Mac',
        claudeWinPath: 'Windows',
        hint: 'Replace alg_your_token with the token from Step 1, then fully quit and restart',
        hintCursor: 'Replace alg_your_token with your real token, then restart',
      },
      {
        title: 'Verify the connection',
        body: 'After restarting your AI tool, open a new chat and ask in natural language:',
        successTitle: 'Signs of a successful connection',
        successItems: [
          'Claude Desktop: plug icon appears at the bottom-left',
          'Cursor / Windsurf: MCP tool selector appears in chat',
          'AI replies include your actual brand data',
        ],
      },
    ],
    toolsTitle: 'Available tools (invoked automatically)',
    toolsSubtitle: 'Your AI will choose the right tool based on your question',
    tools: [
      { name: 'alignment_my_stats', desc: 'Personal GEO overview — brand count, total mentions, average AIGVR score' },
      { name: 'alignment_my_brands', desc: 'List all your brands with basic info' },
      { name: 'alignment_brand_stats', desc: 'Single-brand AIGVR trend over the last 30 days' },
      { name: 'alignment_brand_mentions', desc: 'Recent AI mention records — platform, sentiment, citation URL' },
    ],
    faqTitle: 'FAQ',
    faqs: [
      {
        q: '"Invalid token" or "Unauthorized"',
        a: 'Check that the token was copied in full (must start with alg_). Tokens are shown only once — if lost, go to Settings, revoke the old token, and create a new one.',
      },
      {
        q: '"command not found: alignment-mcp" after installing',
        a: 'Close and reopen your terminal, or run python -m alignment_mcp.server instead. You can also try pip3 install instead of pip.',
      },
      {
        q: 'Claude Desktop shows no tool icon',
        a: 'Fully quit Claude Desktop (not just minimize), then reopen it. Also check that the JSON config has no extra commas.',
      },
      {
        q: '"Brand not found" or empty data',
        a: 'Add at least one brand in the Alignment Dashboard and complete the initial scan before data will appear.',
      },
      {
        q: 'My token was leaked — what do I do?',
        a: 'Immediately go to Settings → MCP and click Revoke on that token, then create a new one and update your config.',
      },
    ],
    ctaTitle: "Don't have an account?",
    ctaBody: 'Sign up for Alignment and start tracking your brand\'s AI visibility.',
    ctaButton: 'Get started free',
    tabs: { claude: 'Claude Desktop', cursor: 'Cursor', windsurf: 'Windsurf' },
    learnMore: 'Learn More',
    nav: { docs: 'Docs', getToken: 'Get your token' },
  },
  zh: {
    badge: '5 分钟接入',
    title: 'MCP 配置指南',
    subtitle: '将 Alignment AI Visibility 数据接入 Claude Desktop、Cursor 或 Windsurf，用自然语言随时查询你的品牌数据。',
    questionsTitle: '接入后你可以这样提问',
    questions: [
      '"我的品牌最近被哪些 AI 提及了？"',
      '"我的 AIGVR 分数这周有变化吗？"',
      '"哪个 AI 平台对我的品牌最友好？"',
      '"我的品牌 AI 可见率趋势如何？"',
    ],
    steps: [
      {
        title: '获取你的 API Token',
        body: '登录 Alignment，进入 Settings → MCP — AI Tools Integration，创建一个 Token。',
        warning: 'Token 只显示一次，请立即复制保存',
        warningDetail: '格式：alg_xxxxxxxxxxxxxxxx...',
        cta: '去 Settings 创建 Token',
        namingTitle: 'Token 命名建议',
        namingHint: '按设备或用途命名，方便以后识别和撤销',
        pythonHint: '没有 Python？点击查看安装方法',
        pythonDetail: '访问 python.org/downloads 下载 Python 3.11+，安装后重新打开终端，再执行 pip install 命令。',
      },
      {
        title: '安装 MCP Server',
        body: '在你的电脑上安装 Alignment MCP Server（需要 Python 3.11+）：',
        note: '安装完成后，alignment-mcp 命令即可用。验证：alignment-mcp --help',
      },
      {
        title: '配置你的 AI 工具',
        body: '编辑你的 AI 工具配置文件，粘贴以下配置片段。',
        claudeMacPath: 'Mac',
        claudeWinPath: 'Windows',
        hint: '将 alg_你的token 替换为 Step 1 复制的真实 Token，然后完全退出并重启',
        hintCursor: '将 alg_你的token 替换为真实 Token，保存后重启',
      },
      {
        title: '验证接入成功',
        body: '重启 AI 工具后，开启新对话，直接用自然语言提问：',
        successTitle: '接入成功的表现',
        successItems: [
          'Claude Desktop：左下角出现工具插头图标',
          'Cursor / Windsurf：对话框出现 MCP 工具选择',
          'AI 回复中包含你的品牌数据',
        ],
      },
    ],
    toolsTitle: '可用工具（AI 自动调用）',
    toolsSubtitle: '接入后 AI 会根据你的问题自动选择合适的工具',
    tools: [
      { name: 'alignment_my_stats', desc: '个人 GEO 总览 — 品牌数、总提及次数、平均 AIGVR 分数' },
      { name: 'alignment_my_brands', desc: '列出你的所有品牌及基本信息' },
      { name: 'alignment_brand_stats', desc: '单品牌最近 30 天 AIGVR 趋势曲线' },
      { name: 'alignment_brand_mentions', desc: '单品牌最近 AI 提及记录（平台、情感、引用链接）' },
    ],
    faqTitle: '常见问题',
    faqs: [
      {
        q: '"Invalid token" 或 "Unauthorized"',
        a: '检查 Token 是否完整复制（必须以 alg_ 开头）。Token 只显示一次，如果丢失请回 Settings 撤销旧 Token 并重新创建。',
      },
      {
        q: '安装后提示 "command not found: alignment-mcp"',
        a: '关闭终端重新打开，或运行 python -m alignment_mcp.server 替代。也可尝试 pip3 install 代替 pip。',
      },
      {
        q: 'Claude Desktop 没有显示工具图标',
        a: '必须完全退出 Claude Desktop（不是最小化），再重新打开。检查配置文件 JSON 格式是否正确（没有多余逗号）。',
      },
      {
        q: '返回 "Brand not found" 或数据为空',
        a: '先在 Alignment Dashboard 添加至少一个品牌，并完成初始扫描，才会有数据。',
      },
      {
        q: 'Token 泄露了怎么办',
        a: '立即在 Settings → MCP 里点击 Revoke 撤销该 Token，然后重新创建一个新 Token 并更新配置。',
      },
    ],
    ctaTitle: '还没有账号？',
    ctaBody: '注册 Alignment，开始追踪你的品牌 AI 可见度。',
    ctaButton: '免费开始',
    tabs: { claude: 'Claude Desktop', cursor: 'Cursor', windsurf: 'Windsurf' },
    learnMore: '了解更多',
    nav: { docs: 'Docs', getToken: '获取 Token' },
  },
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      {label && (
        <div className="flex items-center gap-2 px-4 py-2 bg-ink rounded-t-xl border-b border-ink/70">
          <Terminal className="w-3.5 h-3.5 text-ink-3" />
          <span className="text-xs text-ink-3 font-mono">{label}</span>
        </div>
      )}
      <div className={`relative bg-ink ${label ? 'rounded-b-xl' : 'rounded-xl'} overflow-hidden`}>
        <pre className="p-4 text-sm text-ink-inv font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
        <button
          onClick={copy}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-ink/70 hover:bg-ink/50 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy"
        >
          {copied
            ? <CheckCircle2 className="w-4 h-4 text-sage" />
            : <Copy className="w-4 h-4 text-ink-3" />}
        </button>
      </div>
    </div>
  )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ink text-ink-inv text-sm font-bold flex items-center justify-center mt-0.5">
        {num}
      </div>
      <div className="flex-1 space-y-3">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {children}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-ink text-ink-inv' : 'text-ink-3 hover:text-ink-2 hover:bg-surface-muted'
      }`}
    >
      {children}
    </button>
  )
}

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "alignment": {
      "command": "alignment-mcp",
      "env": {
        "ALIGNMENT_API_URL": "https://api.alignmenttech.ai",
        "ALIGNMENT_API_TOKEN": "alg_your_token"
      }
    }
  }
}`

const CURSOR_CONFIG = `{
  "alignment": {
    "command": "alignment-mcp",
    "env": {
      "ALIGNMENT_API_URL": "https://api.alignmenttech.ai",
      "ALIGNMENT_API_TOKEN": "alg_your_token"
    }
  }
}`

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MCPSetupPage() {
  const { lang } = useLanguage()
  const c = content[lang]
  const [client, setClient] = useState<'claude' | 'cursor' | 'windsurf'>('claude')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <nav className="bg-surface border-b border-divider-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <LogoFull width={120} height={38} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/docs/" className="text-sm text-ink-3 hover:text-ink-2">{c.nav.docs}</Link>
            <LanguageSwitch />
            <Link
              href="/dashboard/settings"
              className="text-sm text-ink-inv bg-ink hover:bg-[#2d2d2c] px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              {c.nav.getToken}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-muted border border-divider rounded-full text-xs font-medium text-ink-2 mb-4">
            <Zap className="w-3.5 h-3.5" />
            {c.badge}
          </div>
          <h1 className="text-3xl font-bold text-ink mb-3">{c.title}</h1>
          <p className="text-ink-3 text-lg leading-relaxed">{c.subtitle}</p>
        </div>

        {/* What you can ask */}
        <div className="bg-surface rounded-2xl border border-divider-light p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-2">
            <MessageSquare className="w-4 h-4 text-ink-2" />
            {c.questionsTitle}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {c.questions.map((q) => (
              <div key={q} className="flex items-start gap-2 px-3 py-2.5 bg-surface-warm rounded-xl text-sm text-ink-2">
                <span className="text-ink-3 mt-0.5 flex-shrink-0">›</span>
                <span className="italic">{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-10">

          {/* Step 1 */}
          <Step num={1} title={c.steps[0].title}>
            <p className="text-sm text-ink-2">{c.steps[0].body}</p>
            <div className="flex items-start gap-3 p-4 bg-caution-bg border border-caution/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-caution flex-shrink-0 mt-0.5" />
              <div className="text-sm text-caution space-y-1">
                <p className="font-medium">{c.steps[0].warning}</p>
                <p><code className="font-mono bg-caution-bg px-1 rounded">{c.steps[0].warningDetail}</code></p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-colors"
            >
              <Key className="w-4 h-4" />
              {c.steps[0].cta}
            </Link>
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-3 uppercase tracking-wide">{c.steps[0].namingTitle}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono text-ink-2">
                {['Claude-Desktop-Mac', 'Cursor-Work-PC', 'Windsurf-Laptop', 'MyBrand-Production', 'Test-Local'].map(n => (
                  <div key={n} className="px-2.5 py-1.5 bg-surface-muted rounded-lg">{n}</div>
                ))}
              </div>
              <p className="text-xs text-ink-3">{c.steps[0].namingHint}</p>
            </div>
          </Step>

          {/* Step 2 */}
          <Step num={2} title={c.steps[1].title}>
            <p className="text-sm text-ink-2">{c.steps[1].body}</p>
            <CodeBlock
              label="Terminal"
              code="pip install git+https://github.com/Alignment-GEOAI/product-backend.git#subdirectory=mcp-server"
            />
            <p className="text-xs text-ink-3">{c.steps[1].note}</p>
            <details className="text-xs text-ink-3 cursor-pointer">
              <summary className="hover:text-ink-2">{c.steps[0].pythonHint}</summary>
              <div className="mt-2 p-3 bg-surface-warm rounded-xl">
                <p>{c.steps[0].pythonDetail}</p>
              </div>
            </details>
          </Step>

          {/* Step 3 */}
          <Step num={3} title={c.steps[2].title}>
            <p className="text-sm text-ink-2">{c.steps[2].body}</p>
            <div className="flex gap-1 bg-surface-muted p-1 rounded-xl w-fit">
              <TabButton active={client === 'claude'} onClick={() => setClient('claude')}>{c.tabs.claude}</TabButton>
              <TabButton active={client === 'cursor'} onClick={() => setClient('cursor')}>{c.tabs.cursor}</TabButton>
              <TabButton active={client === 'windsurf'} onClick={() => setClient('windsurf')}>{c.tabs.windsurf}</TabButton>
            </div>

            {client === 'claude' && (
              <div className="space-y-3">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-ink-3">
                    <span className="px-2 py-0.5 bg-surface-muted rounded text-xs font-mono">{c.steps[2].claudeMacPath}</span>
                    <span className="font-mono text-xs">~/Library/Application Support/Claude/claude_desktop_config.json</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink-3">
                    <span className="px-2 py-0.5 bg-surface-muted rounded text-xs font-mono">{c.steps[2].claudeWinPath}</span>
                    <span className="font-mono text-xs">%APPDATA%\Claude\claude_desktop_config.json</span>
                  </div>
                </div>
                <CodeBlock label="claude_desktop_config.json" code={CLAUDE_CONFIG} />
                <div className="flex items-start gap-2 p-3 bg-surface-warm border border-divider-light rounded-xl text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{c.steps[2].hint} Claude Desktop</p>
                </div>
              </div>
            )}

            {client === 'cursor' && (
              <div className="space-y-3">
                <p className="text-sm text-ink-2">
                  {lang === 'en'
                    ? 'In Cursor: Settings → MCP → Add New MCP Server, paste the config below:'
                    : '在 Cursor 中：Settings → MCP → Add New MCP Server，粘贴以下配置：'}
                </p>
                <CodeBlock label="Cursor MCP Config" code={CURSOR_CONFIG} />
                <div className="flex items-start gap-2 p-3 bg-surface-warm border border-divider-light rounded-xl text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{c.steps[2].hintCursor} Cursor</p>
                </div>
              </div>
            )}

            {client === 'windsurf' && (
              <div className="space-y-3">
                <p className="text-sm text-ink-2">
                  {lang === 'en'
                    ? 'In Windsurf: Settings → MCP → Add New MCP Server, paste the config below:'
                    : '在 Windsurf 中：Settings → MCP → Add New MCP Server，粘贴以下配置：'}
                </p>
                <CodeBlock label="Windsurf MCP Config" code={CURSOR_CONFIG} />
                <div className="flex items-start gap-2 p-3 bg-surface-warm border border-divider-light rounded-xl text-sm text-ink-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{c.steps[2].hintCursor} Windsurf</p>
                </div>
              </div>
            )}
          </Step>

          {/* Step 4 */}
          <Step num={4} title={c.steps[3].title}>
            <p className="text-sm text-ink-2">{c.steps[3].body}</p>
            <CodeBlock code={lang === 'en'
              ? 'How is my brand performing on AI platforms?'
              : '我的品牌最近 AI 可见度怎么样？'}
            />
            <div className="flex items-start gap-3 p-4 bg-sage-bg border border-sage-bg rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
              <div className="text-sm text-sage space-y-1">
                <p className="font-medium">{c.steps[3].successTitle}</p>
                <ul className="space-y-0.5 text-sage">
                  {(c.steps[3].successItems ?? []).map(item => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Step>
        </div>

        {/* Available tools */}
        <div className="bg-surface rounded-2xl border border-divider-light overflow-hidden">
          <div className="px-6 py-4 border-b border-divider-light">
            <h2 className="text-sm font-semibold text-ink">{c.toolsTitle}</h2>
            <p className="text-xs text-ink-3 mt-0.5">{c.toolsSubtitle}</p>
          </div>
          <div className="divide-y divide-divider-light">
            {c.tools.map(({ name, desc }) => (
              <div key={name} className="px-6 py-3 flex items-start gap-3">
                <code className="text-xs font-mono text-ink bg-surface-muted px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5">{name}</code>
                <span className="text-sm text-ink-2">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-ink">{c.faqTitle}</h2>
          <div className="space-y-3">
            {c.faqs.map(({ q, a }, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl border border-divider-light overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-3.5 text-sm font-medium text-ink-2 hover:bg-surface-warm flex items-center justify-between text-left"
                >
                  <span>{q}</span>
                  <ChevronRight className={`w-4 h-4 text-ink-3 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-ink-3 leading-relaxed">{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-ink rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-ink-inv font-semibold">{c.ctaTitle}</p>
            <p className="text-ink-3 text-sm mt-0.5">{c.ctaBody}</p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-ink hover:bg-[#2d2d2c] text-ink-inv text-sm font-medium rounded-xl transition-colors"
          >
            {c.ctaButton} <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  )
}
