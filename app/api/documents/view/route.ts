import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const docId = searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

  const { data: doc } = await supabase
    .from('medical_documents')
    .select('file_url')
    .eq('id', docId)
    .single()

  if (!doc?.file_url) return NextResponse.json({ error: 'No file' }, { status: 404 })

  const { data } = await supabase.storage
    .from('medical-docs')
    .createSignedUrl(doc.file_url, 3600)

  if (!data?.signedUrl) return NextResponse.json({ error: 'Cannot generate URL' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}
