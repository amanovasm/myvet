import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('pet_id', petId)
    .order('document_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json(
    { results: data || [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  )
}
