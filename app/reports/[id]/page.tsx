import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const runtime = 'edge'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !report) notFound()

  return (
    <main>
      <pre>{JSON.stringify(report, null, 2)}</pre>
    </main>
  )
}
