import AssetsClient from './AssetsClient'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function Page() {
  return <AssetsClient />
}
