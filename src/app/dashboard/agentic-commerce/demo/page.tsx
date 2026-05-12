"use client";

import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

type Product = { id: string; name: string; price: number; inventory: number; match_reason: string };
type RankedResult = {
  rank: number; brand_id: string; brand_name: string; score: number;
  provider: string; latency_ms: number; message: string;
  recommended_products: Product[]; offer: string | null; confidence: number;
};
type BuyState = "idle" | "buying" | "bought" | "error";
type BuyResult = { tx_id: string; commission_amount: number; commission_rate: number; transaction_amount: number };

const BRAND_COLOR: Record<string, string> = {
  "eco-home": "text-emerald-600", "tech-gear": "text-blue-600", "nutri-plus": "text-orange-600",
};
const PROVIDER_BADGE: Record<string, string> = {
  anthropic: "bg-purple-100 text-purple-700", openai: "bg-green-100 text-green-700",
  mock: "bg-slate-100 text-slate-500", "mock-fallback": "bg-red-50 text-red-400",
};

const SAMPLE_INTENTS = [
  "I need sustainable home cleaning products under $30",
  "Looking for smart home gadgets for a tech enthusiast",
  "Best protein supplements for muscle recovery",
  "Eco-friendly kitchen essentials",
  "Wireless earbuds with good noise cancellation",
];

function ResultCard({ result }: { result: RankedResult }) {
  const [buyState, setBuyState] = useState<BuyState>("idle");
  const [buyResult, setBuyResult] = useState<BuyResult | null>(null);
  const product = result.recommended_products[0];

  const handleBuy = async () => {
    if (!product) return;
    setBuyState("buying");
    try {
      const res = await fetch(`${AC}/attribution/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: result.brand_id, product_id: product.id,
          consumer_agent_id: "claude", transaction_amount: product.price,
        }),
      });
      const data = await res.json();
      setBuyResult(data); setBuyState("bought");
    } catch { setBuyState("error"); }
  };

  return (
    <div className="bg-surface border border-divider rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-ink-3">#{result.rank}</span>
          <span className={`font-semibold text-sm ${BRAND_COLOR[result.brand_id] ?? "text-ink"}`}>
            {result.brand_name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROVIDER_BADGE[result.provider] ?? "bg-slate-100 text-slate-600"}`}>
            {result.provider}
          </span>
          <span className="text-xs text-ink-3">{result.latency_ms}ms</span>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            {(result.score * 100).toFixed(0)}pts
          </span>
        </div>
      </div>

      <p className="text-ink-2 text-sm">{result.message}</p>

      {product && (
        <div className="bg-surface-muted rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink">{product.name}</div>
            <div className="text-xs text-ink-3 mt-0.5">{product.match_reason}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-green-600 font-bold text-sm">${product.price}</div>
            <div className="text-xs text-ink-3">{product.inventory} left</div>
          </div>
        </div>
      )}

      {result.offer && (
        <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          🎁 {result.offer}
        </div>
      )}

      {/* Buy button */}
      {product && buyState === "idle" && (
        <button
          onClick={handleBuy}
          className="w-full py-2 text-sm font-medium bg-yellow-500 hover:bg-yellow-400 text-white rounded-xl transition-colors"
        >
          Buy via Alignment — ${product.price}
        </button>
      )}
      {buyState === "buying" && (
        <div className="w-full py-2 text-center text-sm text-ink-3 animate-pulse">Processing…</div>
      )}
      {buyState === "bought" && buyResult && (
        <div className="text-xs bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
          <div className="font-semibold text-green-700">✅ Purchase attributed!</div>
          <div className="text-green-600">
            ${buyResult.transaction_amount.toFixed(2)} GMV · +${buyResult.commission_amount.toFixed(2)} commission ({(buyResult.commission_rate * 100).toFixed(1)}%)
          </div>
          <Link href="/dashboard/agentic-commerce/billing" className="text-purple-600 hover:underline">
            View Billing →
          </Link>
        </div>
      )}
      {buyState === "error" && (
        <div className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">Attribution failed — check console</div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const [intent, setIntent] = useState("");
  const [agentId, setAgentId] = useState("claude");
  const [results, setResults] = useState<RankedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ total_brands_queried: number; duration_ms: number } | null>(null);

  const run = async () => {
    if (!intent.trim()) return;
    setLoading(true); setResults([]); setMeta(null);
    try {
      const res = await fetch(`${AC}/broker/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: intent.trim(), consumer_agent_id: agentId }),
      });
      const data = await res.json();
      setResults(data.ranked_results ?? []);
      setMeta({ total_brands_queried: data.total_brands_queried, duration_ms: data.broker_duration_ms });
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Consumer Agent Demo</h1>
        <p className="text-ink-2 mt-1">Enter a shopping intent — the Alignment Broker queries all brand agents and returns a ranked recommendation.</p>
      </div>

      {/* Intent input */}
      <div className="bg-surface border border-divider rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Shopping Intent</label>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g. I need eco-friendly cleaning products under $30"
            rows={2}
            className="w-full rounded-xl border border-divider bg-surface-muted px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_INTENTS.map((s) => (
              <button key={s} onClick={() => setIntent(s)}
                className="text-xs px-2 py-1 rounded-lg bg-surface-muted text-ink-2 hover:bg-purple-50 hover:text-purple-700 transition-colors border border-divider">
                {s.length > 40 ? s.slice(0, 40) + "…" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <label className="text-xs text-ink-3">Agent ID</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}
              className="text-sm border border-divider rounded-lg px-2 py-1.5 bg-surface-muted text-ink focus:outline-none">
              {["claude", "chatgpt", "gemini", "perplexity", "custom-agent"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            onClick={run} disabled={loading || !intent.trim()}
            className="mt-4 px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
            {loading ? "Querying brands…" : "Run →"}
          </button>
        </div>
      </div>

      {/* Results */}
      {meta && (
        <div className="text-xs text-ink-3">
          {meta.total_brands_queried} brands queried · {meta.duration_ms}ms total
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Ranked Results</h2>
          {results.map((r) => <ResultCard key={r.brand_id} result={r} />)}
        </div>
      )}
    </div>
  );
}
