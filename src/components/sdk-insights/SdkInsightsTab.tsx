"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface SdkInsightsData {
  shop: string;
  period: string;
  kpis: { ai_referrals: number; schemas_delivered: number; page_views: number };
  trend: Array<{ date: string; ai_referrals: number; schemas_delivered: number; page_views: number }>;
  top_referrers: Array<{ domain: string; count: number }>;
  sku_ranking: Array<{ handle: string; referral_count: number }>;
  schema_health: Array<{ schema_type: string; delivered: number }>;
}

interface SdkInsightsTabProps {
  shopId: string;   // The API key shop identifier
  apiToken: string; // Bearer token
  apiBase?: string;
}

export function SdkInsightsTab({
  shopId,
  apiToken,
  apiBase = process.env.NEXT_PUBLIC_API_URL || "https://api.alignmenttech.ai",
}: SdkInsightsTabProps) {
  const [data, setData] = useState<SdkInsightsData | null>(null);
  const [period, setPeriod] = useState<"24h" | "7d" | "30d" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${apiBase}/v1/sdk/insights?period=${period}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "X-Shop-Domain": shopId,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shopId, apiToken, apiBase, period]);

  const periods: Array<"24h" | "7d" | "30d" | "all"> = ["24h", "7d", "30d", "all"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <span>Loading SDK insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Failed to load insights</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === p
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {p === "all" ? "All time" : `Last ${p}`}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "AI REFERRALS", value: data.kpis.ai_referrals, desc: "Clicks from AI platforms" },
          { label: "SCHEMAS DELIVERED", value: data.kpis.schemas_delivered, desc: "SDK schema injections" },
          { label: "PAGE VIEWS", value: data.kpis.page_views, desc: "Total SDK-tracked views" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 tracking-wide">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      {data.trend.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-4">Traffic Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="ai_referrals" stroke="#16a34a" strokeWidth={2} dot={false} name="AI Referrals" />
              <Line type="monotone" dataKey="schemas_delivered" stroke="#2563eb" strokeWidth={2} dot={false} name="Schemas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom Grid: Referrers + SKU Ranking + Schema Health */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top Referrers */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-3 text-sm">AI Platforms Sending Traffic</p>
          {data.top_referrers.length === 0 ? (
            <p className="text-xs text-gray-400">No referral data yet</p>
          ) : (
            <ul className="space-y-2">
              {data.top_referrers.slice(0, 6).map((r) => (
                <li key={r.domain} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate max-w-[130px]">{r.domain}</span>
                  <span className="font-semibold text-gray-900">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* SKU Ranking */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-3 text-sm">Top Products by AI Referral</p>
          {data.sku_ranking.length === 0 ? (
            <p className="text-xs text-gray-400">No product referral data yet</p>
          ) : (
            <ul className="space-y-2">
              {data.sku_ranking.slice(0, 6).map((s, i) => (
                <li key={s.handle} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs w-4">{i + 1}.</span>
                  <span className="text-gray-700 truncate flex-1">{s.handle}</span>
                  <span className="font-semibold text-gray-900">{s.referral_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Schema Health */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="font-semibold text-gray-800 mb-3 text-sm">Schema Coverage</p>
          {data.schema_health.length === 0 ? (
            <p className="text-xs text-gray-400">No schema data yet</p>
          ) : (
            <ul className="space-y-2">
              {data.schema_health.slice(0, 6).map((s) => (
                <li key={s.schema_type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.schema_type}</span>
                  <span className="font-semibold text-blue-600">{s.delivered.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        SDK mode collects AI referrals and schema renders via client-side JS.
        AI bot crawls (server-side) require Cloudflare Logpush integration —
        <a href="#" className="underline ml-1">setup guide</a>
      </div>
    </div>
  );
}
