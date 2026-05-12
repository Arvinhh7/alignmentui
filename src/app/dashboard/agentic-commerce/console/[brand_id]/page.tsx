import BrandConsoleClient from './BrandConsoleClient'

// Pre-build the three known brand pages at export time.
export function generateStaticParams() {
  return [
    { brand_id: 'eco-home' },
    { brand_id: 'tech-gear' },
    { brand_id: 'nutri-plus' },
  ]
}

export default function Page({ params }: { params: { brand_id: string } }) {
  return <BrandConsoleClient brandId={params.brand_id} />
}
