import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { petId, petName, date, ...fields } = body

    if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

    // Считаем события за этот день для порядкового номера
    const { count } = await supabase
      .from('health_events')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', petId)
      .gte('occurred_at', `${date}T00:00:00`)

    const seq = (count || 0) + 1
    const name = (petName || 'PET').toUpperCase().slice(0, 4)
    const identifier = `${name}-${date}-${String(seq).padStart(3, '0')}`

    const { data, error } = await supabase
      .from('health_events')
      .insert({ pet_id: petId, identifier, ...fields })
      .select()
      .single()

    if (error) {
      console.error('Event insert error:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    return NextResponse.json({ event: data, identifier })
  } catch (e: any) {
    console.error('Event route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
