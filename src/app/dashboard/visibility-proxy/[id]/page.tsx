import DomainDetailClient from './DomainDetailClient'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function Page() {
  return <DomainDetailClient />
}
