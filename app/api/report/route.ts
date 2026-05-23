import { NextRequest, NextResponse } from 'next/server'
import { generateVetReport } from '@/lib/ai'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { days = 90 } = await req.json()
    const { data: pet } = await supabase.from('pets').select('id').limit(1).single()
    if (!pet) return NextResponse.json({ error: 'No pet found' }, { status: 404 })
    const report = await generateVetReport(pet.id, days)
    return NextResponse.json({ report })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
