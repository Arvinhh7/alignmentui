import CategoryClient from './CategoryClient'

const EXPLORE_CATEGORY_SLUGS = [
  'wireless-earbuds',
  'headphones',
  'bluetooth-speakers',
  'laptops',
  'smartwatches',
  'smart-rings',
  'mechanical-keyboards',
  'robot-vacuums',
  'security-cameras',
  'air-fryers',
  'espresso-machines',
  'air-purifiers',
  'portable-power-stations',
  'outdoor-lights',
  'skincare-serums',
  'electric-toothbrushes',
  'protein-powder',
  'massage-guns',
  'mattresses',
  'running-shoes',
  'e-bikes',
  'sunglasses',
  'luggage',
  'standing-desks',
  'office-chairs',
  'crm-software',
]

export function generateStaticParams() {
  return [...EXPLORE_CATEGORY_SLUGS, '_'].map(slug => ({ slug }))
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  return <CategoryClient slug={params.slug} />
}
