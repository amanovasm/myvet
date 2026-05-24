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

  const { data: meds, error: medsError } = await supabase
    .from('medications')
    .select('*')
    .eq('pet_id', petId)
    .is('ended_at', null)

  if (medsError) return NextResponse.json({ error: medsError.message }, { status: 500 })

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
