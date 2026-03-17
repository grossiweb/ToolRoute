import { redirect } from 'next/navigation'

export default function SkillRedirect({ params }: { params: { slug: string } }) {
  redirect(`/mcp-servers/${params.slug}`)
}
