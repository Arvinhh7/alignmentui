"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old route — Consumer Demo moved to Overview / public marketing surface.
export default function DemoRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/agentic-commerce");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-64 text-ink-3 text-sm animate-pulse">
      Redirecting to Overview…
    </div>
  );
}
