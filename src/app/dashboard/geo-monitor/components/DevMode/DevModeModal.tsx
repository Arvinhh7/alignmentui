'use client'

import React, { useState, useCallback } from 'react'
import { X, FlaskConical, Loader2, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import type {
  DiscoverResult,
  MonitorScanResult,
  DevOptimizationConfig,
  DevOptimizationResult,
  PolicyEntry,
} from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────────

type Screen = 'setup' | 'running' | 'success' | 'failure'

interface Props {
  discover: DiscoverResult
  scan: MonitorScanResult
  onClose: () => void
  onApply: (result: DevOptimizationResult) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function DeltaBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(Math.abs(value) / max, 1) * 100
  const positive = value > 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-divider rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${positive ? 'bg-red-soft' : 'bg-sage'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MetricDiff({ label, before, after, unit = '' }: {
  label: string; before: number; after: number; unit?: string
}) {
  const delta = after - before
  const positive = delta > 0
  const isGap = label.toLowerCase().includes('gap')
  // For gaps, lower is better
  const improved = isGap ? delta < 0 : delta > 0

  return (
    <div className="flex items-center justify-between py-2 border-b border-divider-light last:border-0">
      <span className="text-xs text-ink-2">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-3 font-mono">{before}{unit}</span>
        <ArrowRight className="w-3 h-3 text-ink-3" />
        <span className={`text-xs font-mono font-semibold ${improved ? 'text-sage' : 'text-ink'}`}>
          {after}{unit}
        </span>
        {delta !== 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            improved ? 'bg-sage-bg text-sage' : 'bg-surface-warm text-ink-3'
          }`}>
            {positive ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Setup Screen ───────────────────────────────────────────────────────────────

function SetupScreen({
  config,
  gapCount,
  onConfigChange,
  onRun,
}: {
  config: DevOptimizationConfig
  gapCount: number
  onConfigChange: (c: DevOptimizationConfig) => void
  onRun: () => void
}) {
  return (
    <div className="p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-ink mb-1">当前 Citation Health 状态</h3>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-full bg-red-soft-bg text-red-soft text-xs font-semibold">
            {gapCount} Gaps
          </span>
          <span className="text-xs text-ink-3">→</span>
          <span className="text-xs text-ink-2">EMA 将预测优化后的 sourcing 策略</span>
        </div>
      </div>

      <div className="bg-canvas rounded-xl border border-divider p-4 space-y-4">
        <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Claude 推荐参数</p>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-ink-2">
                EMA α <span className="text-ink-3">(0.1 = reward 主导 / 1.0 = 不更新)</span>
              </label>
              <span className="text-xs font-mono font-bold text-ink">{config.alpha.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0.1" max="0.9" step="0.1"
              value={config.alpha}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onConfigChange({ ...config, alpha: parseFloat(e.target.value) })}
              className="w-full accent-ink"
            />
            <div className="flex justify-between text-[10px] text-ink-3 mt-0.5">
              <span>快收敛</span>
              <span>慢收敛</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-ink-2">
                迭代次数 <span className="text-ink-3">(EMA rounds)</span>
              </label>
              <span className="text-xs font-mono font-bold text-ink">{config.iterations}</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={config.iterations}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onConfigChange({ ...config, iterations: parseInt(e.target.value) })}
              className="w-full accent-ink"
            />
          </div>
        </div>
      </div>

      <div className="bg-canvas rounded-xl border border-divider p-4">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-sage">
            <span className="font-semibold">⏱ ~1 秒</span>
            <span className="text-ink-3">compute-only, 无 API 调用</span>
          </div>
          <span className="text-divider">|</span>
          <div className="flex items-center gap-1.5 text-sage">
            <span className="font-semibold">💰 $0.00</span>
            <span className="text-ink-3">V1 不重跑 Scan</span>
          </div>
        </div>
      </div>

      <button
        onClick={onRun}
        className="w-full py-3 bg-ink text-ink-inv rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors flex items-center justify-center gap-2"
      >
        <FlaskConical className="w-4 h-4" />
        一键模拟优化
      </button>
    </div>
  )
}

// ── Running Screen ─────────────────────────────────────────────────────────────

function RunningScreen({ iteration, total }: { iteration: number; total: number }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[240px] gap-5">
      <Loader2 className="w-10 h-10 text-ink animate-spin" />
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">正在运行 EMA 优化...</p>
        <p className="text-xs text-ink-3 mt-1">
          Iteration {iteration} / {total} · 计算 reward 信号 + 更新 policy weights
        </p>
      </div>
      <div className="w-full bg-divider rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-ink rounded-full transition-all duration-300"
          style={{ width: `${(iteration / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ── Success Screen ─────────────────────────────────────────────────────────────

function SuccessScreen({
  result,
  onApply,
  onClose,
}: {
  result: DevOptimizationResult
  onApply: () => void
  onClose: () => void
}) {
  const [showPolicy, setShowPolicy] = useState(false)

  const overEstimated = result.policy_entries.filter(e => e.delta > 0.01).slice(0, 3)
  const underEstimated = result.policy_entries.filter(e => e.delta < -0.01).slice(0, 3)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-sage flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">优化完成</p>
          <p className="text-xs text-ink-3">
            F1 对齐度 +{result.improvement_pct}% · Gaps {result.before.gaps} → {result.after.gaps}
          </p>
        </div>
      </div>

      {/* Before / After */}
      <div className="bg-canvas rounded-xl border border-divider p-4">
        <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-3">指标对比</p>
        <MetricDiff label="Gaps" before={result.before.gaps} after={result.after.gaps} />
        <MetricDiff label="Amplifying" before={result.before.amplifying} after={result.after.amplifying} />
        <MetricDiff label="F1 Alignment" before={Math.round(result.before.f1_alignment * 100)} after={Math.round(result.after.f1_alignment * 100)} unit="%" />
      </div>

      {/* Reasoning */}
      <div className="bg-canvas rounded-xl border border-divider p-4">
        <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-2">分析</p>
        <p className="text-xs text-ink-2 leading-relaxed">{result.reasoning}</p>
      </div>

      {/* Policy changes summary */}
      <div>
        <button
          onClick={() => setShowPolicy(p => !p)}
          className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors"
        >
          {showPolicy ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Policy Delta 详情 ({result.policy_entries.length} domains)
        </button>

        {showPolicy && (
          <div className="mt-2 rounded-xl border border-divider overflow-hidden">
            {overEstimated.length > 0 && (
              <div className="px-3 py-2 bg-red-soft-bg/30">
                <p className="text-[10px] font-semibold text-red-soft uppercase mb-1.5">高估 → 降权</p>
                {overEstimated.map(e => (
                  <div key={e.domain} className="flex items-center justify-between py-1">
                    <span className="text-xs text-ink truncate max-w-[160px]">{e.domain}</span>
                    <span className="text-[10px] font-mono text-red-soft">
                      {(e.f_t * 100).toFixed(1)}% → {(e.reward * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
            {underEstimated.length > 0 && (
              <div className="px-3 py-2 bg-sage-bg/30">
                <p className="text-[10px] font-semibold text-sage uppercase mb-1.5">低估 → 升权 (Bonus 来源)</p>
                {underEstimated.map(e => (
                  <div key={e.domain} className="flex items-center justify-between py-1">
                    <span className="text-xs text-ink truncate max-w-[160px]">{e.domain}</span>
                    <span className="text-[10px] font-mono text-sage">
                      {(e.f_t * 100).toFixed(1)}% → {(e.reward * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-divider text-sm text-ink-2 hover:bg-surface-warm transition-colors"
        >
          暂不应用
        </button>
        <button
          onClick={onApply}
          className="flex-1 py-2.5 rounded-xl bg-ink text-ink-inv text-sm font-semibold hover:bg-ink/90 transition-colors"
        >
          应用新 Sourcing
        </button>
      </div>
    </div>
  )
}

// ── Failure Screen ─────────────────────────────────────────────────────────────

function FailureScreen({
  result,
  config,
  onRetry,
  onClose,
}: {
  result: DevOptimizationResult
  config: DevOptimizationConfig
  onRetry: (newConfig: DevOptimizationConfig) => void
  onClose: () => void
}) {
  const suggestedConfig: DevOptimizationConfig = {
    ...config,
    alpha: Math.max(0.3, config.alpha - 0.2),
    iterations: config.iterations + 2,
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-caution flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">改善不足</p>
          <p className="text-xs text-ink-3">
            F1 +{result.improvement_pct}% · 未达 15% 阈值
          </p>
        </div>
      </div>

      <div className="bg-canvas rounded-xl border border-divider p-4">
        <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-2">诊断</p>
        <p className="text-xs text-ink-2 leading-relaxed">{result.reasoning}</p>
      </div>

      <div className="bg-caution-bg/40 rounded-xl border border-caution/20 p-4">
        <p className="text-[10px] font-semibold text-caution uppercase tracking-wide mb-2">
          Claude 建议新参数
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-ink-2">EMA α</span>
            <span className="font-mono text-ink">
              {config.alpha.toFixed(1)} → <strong>{suggestedConfig.alpha.toFixed(1)}</strong>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-2">迭代次数</span>
            <span className="font-mono text-ink">
              {config.iterations} → <strong>{suggestedConfig.iterations}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-divider text-sm text-ink-2 hover:bg-surface-warm transition-colors"
        >
          保持现状
        </button>
        <button
          onClick={() => onRetry(suggestedConfig)}
          className="flex-1 py-2.5 rounded-xl bg-ink text-ink-inv text-sm font-semibold hover:bg-ink/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          用新参数重跑
        </button>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function DevModeModal({ discover, scan, onClose, onApply }: Props) {
  const [screen, setScreen] = useState<Screen>('setup')
  const [config, setConfig] = useState<DevOptimizationConfig>({
    alpha: 0.70,
    iterations: 3,
    static_weight: 0.50,
    estimated_minutes: 0,
    estimated_cost_usd: 0,
  })
  const [runningIter, setRunningIter] = useState(0)
  const [result, setResult] = useState<DevOptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const gapCount = scan
    ? discover.source_domains.filter(src => {
        const isCore = src.intent_coverage >= 3 || src.prompt_count >= 8
        const inScan = scan.source_domains.some(sd => sd.domain === src.domain)
        return isCore && !inScan
      }).length
    : 0

  const runOptimization = useCallback(async (cfg: DevOptimizationConfig) => {
    setConfig(cfg)
    setScreen('running')
    setRunningIter(0)
    setError(null)

    // Fake iteration progress for UX (actual call is instant)
    const total = cfg.iterations
    for (let i = 1; i <= total; i++) {
      await new Promise(r => setTimeout(r, 300))
      setRunningIter(i)
    }

    try {
      const response = await api.devOptimize({ discover, scan, config: cfg })
      if (response.error || !response.data) {
        setError(response.error ?? 'Optimization failed')
        setScreen('failure')
        return
      }
      const res = response.data
      setResult(res)
      setScreen(res.success ? 'success' : 'failure')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Optimization failed')
      setScreen('failure')
    }
  }, [discover, scan])

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result)
      onClose()
    }
  }, [result, onApply, onClose])

  const screenTitle: Record<Screen, string> = {
    setup: '🔬 Dev Mode',
    running: '🔄 运行中...',
    success: '✅ 优化完成',
    failure: '⚠️ 需要调整',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl border border-divider shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-divider sticky top-0 bg-surface rounded-t-2xl z-10">
          <span className="text-sm font-semibold text-ink">{screenTitle[screen]}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-warm transition-colors">
            <X className="w-4 h-4 text-ink-2" />
          </button>
        </div>

        {/* Screen content */}
        {screen === 'setup' && (
          <SetupScreen
            config={config}
            gapCount={gapCount}
            onConfigChange={setConfig}
            onRun={() => runOptimization(config)}
          />
        )}
        {screen === 'running' && (
          <RunningScreen iteration={runningIter} total={config.iterations} />
        )}
        {screen === 'success' && result && (
          <SuccessScreen result={result} onApply={handleApply} onClose={onClose} />
        )}
        {screen === 'failure' && (
          <FailureScreen
            result={result ?? {
              success: false, iterations_run: config.iterations,
              before: { gaps: gapCount, threats: 0, amplifying: 0, bonus: 0, f1_alignment: 0 },
              after: { gaps: gapCount, threats: 0, amplifying: 0, bonus: 0, f1_alignment: 0 },
              improvement_pct: 0, gap_reduction_pct: 0,
              policy_entries: [], new_source_domains: [],
              reasoning: error ?? 'Unknown error', applied: false,
            }}
            config={config}
            onRetry={runOptimization}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
