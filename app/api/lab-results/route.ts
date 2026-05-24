import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('pet_id', petId)
    .order('document_date', { ascending: true })

  // Debug info
  if (error) {
    return NextResponse.json({ results: [], error: error.message, hint: error.hint, details: error.details })
  }

  return NextResponse.json({ 
    results: data || [],
    debug: {
      count: data?.length,
      has_url: !!url,
      has_key: !!key,
      key_prefix: key?.slice(0, 20)
    }
  })
}
