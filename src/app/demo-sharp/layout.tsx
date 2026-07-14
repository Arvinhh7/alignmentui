import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alignment AI - Sharp Commerce Demo',
  description: 'Dark product demo for Alignment AI commerce intelligence.',
}

export default function DemoSharpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
