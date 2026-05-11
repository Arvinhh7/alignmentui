import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alignment AI — Agentic Commerce Demo',
  description: 'Agent Visibility Infrastructure — Live Demo',
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
