import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')
  const date = searchParams.get('date')
  if (!petId || !date) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const today = date

  const { data: meds } = await supabase
    .from('medications')
    .select('*')
    .eq('pet_id', petId)
    .or(`ended_at.is.null,ended_at.gte.${today}`)

  const { data: schedules } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('pet_id', petId)

  const { data: taken } = await supabase
    .from('medication_doses')
    .select('*')
    .eq('pet_id', petId)
    .eq('dose_date', date)

  return NextResponse.json({ meds, schedules, taken })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { petId, medicationId, scheduleId, doseDate, scheduledTime } = body

    // Проверяем нет ли уже записи
    const { data: existing } = await supabase
      .from('medication_doses')
      .select('id')
      .eq('schedule_id', scheduleId)
      .eq('dose_date', doseDate)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, already: true })
    }

    const { data, error } = await supabase
      .from('medication_doses')
      .insert({
        pet_id: petId,
        medication_id: medicationId,
        schedule_id: scheduleId,
        dose_date: doseDate,
        scheduled_time: scheduledTime,
        taken_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, dose: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
