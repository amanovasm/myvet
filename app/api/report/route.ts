import { NextRequest, NextResponse } from 'next/server'
import { generateVetReport, analyzeEvents } from '@/lib/ai'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const { days = 90 } = await req.json()
    const { data: pet } = await supabase.from('pets').select('id').limit(1).single()
    if (!pet) return NextResponse.json({ error: 'No pet' }, { status: 404 })

    const from = subDays(new Date(), days)
    const { data: events } = await supabase
      .from('health_events').select('*').eq('pet_id', pet.id)
      .gte('occurred_at', from.toISOString())
      .neq('event_type', 'seizure')
      .order('occurred_at')

    const [report, eventsAnalysis] = await Promise.all([
      generateVetReport(pet.id, days),
      analyzeEvents(events || []),
    ])

    // Вставляем AI анализ в отчёт
    const finalReport = report + '\n\nАНАЛИЗ ИИ:\n' + eventsAnalysis

    return NextResponse.json({ report: finalReport })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: 'Failed: ' + e.message }, { status: 500 })
  }
}
