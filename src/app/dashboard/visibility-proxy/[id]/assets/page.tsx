import AssetsClient from './AssetsClient'

export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <AssetsClient />
}
