"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const AC = `${API_BASE}/api/agentic-commerce`;

type Brand = {
  brand_id: string; name: string; tagline: string;
  categories: string[]; trust_level: string; product_count: number;
};
type Stats = { total_discoveries: number; conversion_rate: number; avg_trust_score: number };

const TRUST_BADGE: Record<string, string> = {
  verified:   "bg-green-100 text-green-700 border-green-200",
  standard:   "bg-blue-100 text-blue-700 border-blue-200",
  unverified: "bg-slate-100 text-slate-500 border-slate-200",
};
const BRAND_COLORS: Record<string, string> = {
  "eco-home": "from-emerald-500 to-teal-600",
  "tech-gear": "from-blue-500 to-indigo-600",
  "nutri-plus": "from-orange-500 to-amber-600",
};
const BRAND_ICONS: Record<string, string> = {
  "eco-home": "🌿", "tech-gear": "⚡", "nutri-plus": "🌱",
};

export default function ConsolePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${AC}/enterprise/brands`)
      .then((r) => r.json())
      .then(async (d) => {
        setBrands(d.brands);
        const entries = await Promise.all(
          d.brands.map(async (b: Brand) => {
            try {
              const r = await fetch(`${AC}/events/telemetry/${b.brand_id}`);
              const s = await r.json();
              return [b.brand_id, s] as const;
            } catch { return [b.brand_id, null] as const; }
          })
        );
        const map: Record<string, Stats> = {};
        for (const [id, s] of entries) if (s) map[id] = s;
        setStatsMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Brand Console</h1>
        <p className="text-ink-2 mt-1">Select a brand to view real-time agent activity</p>
      </div>

      {loading ? (
        <div className="text-ink-3 text-sm animate-pulse">Loading brands…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {brands.map((b) => {
            const s = statsMap[b.brand_id];
            const grad = BRAND_COLORS[b.brand_id] ?? "from-purple-500 to-purple-700";
            const icon = BRAND_ICONS[b.brand_id] ?? "🏪";
            return (
              <Link
                key={b.brand_id}
                href={`/dashboard/agentic-commerce/console/${b.brand_id}`}
                className="group bg-surface border border-divider rounded-2xl p-5 hover:border-purple-300 transition-all space-y-4"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl`}>
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink">{b.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${TRUST_BADGE[b.trust_level]}`}>
                      {b.trust_level}
                    </span>
                  </div>
                  <p className="text-ink-2 text-xs mt-0.5">{b.tagline}</p>
                </div>
                {s ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { val: s.total_discoveries.toLocaleString(), label: "calls" },
                      { val: `${(s.conversion_rate * 100).toFixed(0)}%`, label: "conv." },
                      { val: s.avg_trust_score.toFixed(2), label: "trust" },
                    ].map((item) => (
                      <div key={item.label} className="bg-surface-muted rounded-lg py-2">
                        <div className="font-bold text-sm text-ink">{item.val}</div>
                        <div className="text-ink-3 text-xs">{item.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-ink-3 text-xs animate-pulse">Loading stats…</div>
                )}
                <div className="text-purple-600 text-sm group-hover:text-purple-700 transition-colors flex items-center gap-1">
                  Open console →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
