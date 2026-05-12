"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old route — Brand Console is now split across Performance + Quote Log.
export default function ConsoleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/agentic-commerce/performance");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-64 text-ink-3 text-sm animate-pulse">
      Redirecting to Performance…
    </div>
  );
}
