import DomainDetailClient from './DomainDetailClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <DomainDetailClient />
}
