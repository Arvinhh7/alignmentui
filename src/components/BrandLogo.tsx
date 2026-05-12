"use client";

/**
 * BrandLogo — official logo avatar for Agentic Commerce brand agents.
 *
 * Fallback chain (each level activates only if the previous fails):
 *   1. Clearbit Logo API  — logo.clearbit.com/{domain}          (high-res brand logo)
 *   2. Google s2/favicons — google.com/s2/favicons?domain=…     (same API as Discover tab, very reliable)
 *   3. Letter circle      — brand initial on brand color         (zero-dependency)
 */

import { useState } from "react";

// ─── Brand registry ───────────────────────────────────────────────────────────
export const BRAND_META: Record<
  string,
  { domain: string; color: string; initial: string; name: string }
> = {
  // Agentic Commerce demo brands
  allbirds:  { domain: "allbirds.com",  color: "#2D6A4F", initial: "A", name: "Allbirds"  },
  razer:     { domain: "razer.com",     color: "#00D384", initial: "R", name: "Razer"     },
  patagonia: { domain: "patagonia.com", color: "#C1440E", initial: "P", name: "Patagonia" },

  // Extras used in Overview live feed
  nike:      { domain: "nike.com",      color: "#111111", initial: "N", name: "Nike"      },
  apple:     { domain: "apple.com",     color: "#555555", initial: "A", name: "Apple"     },
  samsung:   { domain: "samsung.com",   color: "#1428A0", initial: "S", name: "Samsung"   },
  lululemon: { domain: "lululemon.com", color: "#000000", initial: "L", name: "lululemon" },
  dyson:     { domain: "dyson.com",     color: "#C8102E", initial: "D", name: "Dyson"     },
  theragun:  { domain: "therabody.com", color: "#FF6B35", initial: "T", name: "Theragun"  },
  yeti:      { domain: "yeti.com",      color: "#00558C", initial: "Y", name: "YETI"      },
};

// ─── Logo sources ─────────────────────────────────────────────────────────────
// Mirrors the pattern used in DiscoverTab.tsx (geo-monitor module).
function logoSrcs(domain: string): string[] {
  return [
    // 1. Clearbit — high-res brand logos for well-known companies
    `https://logo.clearbit.com/${domain}`,
    // 2. Google s2/favicons — the same reliable endpoint DiscoverTab uses;
    //    sz=64 gives a sharp icon at up to 40px display size.
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────
interface BrandLogoProps {
  brandId: string;
  /** Display name — used for the letter fallback initial if brandId not in registry */
  name?: string;
  /** Diameter in pixels (default 32) */
  size?: number;
  className?: string;
}

export function BrandLogo({
  brandId,
  name,
  size = 32,
  className = "",
}: BrandLogoProps) {
  const meta   = BRAND_META[brandId];
  const bg     = meta?.color  ?? "#6D4AE8";
  const letter = meta?.initial ?? (name ?? brandId).charAt(0).toUpperCase();
  const srcs   = meta ? logoSrcs(meta.domain) : [];

  // attempt = index into srcs; when >= srcs.length → letter-only fallback
  const [attempt, setAttempt] = useState(0);
  const currentSrc = attempt < srcs.length ? srcs[attempt] : null;

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full text-white font-bold shrink-0 overflow-hidden select-none ${className}`}
      style={{
        width:      size,
        height:     size,
        background: bg,
        fontSize:   Math.round(size * 0.38),
        lineHeight: 1,
      }}
      title={meta?.name ?? name ?? brandId}
    >
      {letter}
      {currentSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt=""
          // object-contain + white bg: works for both full-bleed Clearbit logos
          // and small favicon-style images returned by s2/favicons.
          className="absolute inset-0 w-full h-full object-contain bg-white rounded-full p-[1px]"
          onError={() => setAttempt((prev) => prev + 1)}
        />
      )}
    </span>
  );
}
