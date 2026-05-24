import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key - same as all other working routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')
  const category = searchParams.get('category')

  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  let query = supabase
    .from('lab_results')
    .select('*')
    .eq('pet_id', petId)
    .order('document_date', { ascending: true })

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ results: data || [] })
}
