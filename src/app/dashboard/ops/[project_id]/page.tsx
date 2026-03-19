import RedirectClient from './RedirectClient'

export function generateStaticParams() {
  return [{ project_id: '_' }]
}

export default function Page({ params }: { params: { project_id: string } }) {
  return <RedirectClient projectId={params.project_id} />
}
