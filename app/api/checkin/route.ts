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
  const { data } = await supabase
    .from('daily_checkins').select('*').eq('pet_id', petId).eq('date', date).limit(1)
  return NextResponse.json({ checkin: data && data.length > 0 ? data[0] : null })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { petId, date, ...fields } = body
  if (!petId || !date) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const { data: existing } = await supabase
    .from('daily_checkins').select('*').eq('pet_id', petId).eq('date', date).limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ checkin: existing[0], already_exists: true })
  }

  const { data, error } = await supabase
    .from('daily_checkins').insert({ pet_id: petId, date, ...fields }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Автоматически генерируем дайджест в фоне после чек-ина
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://myvet-app.vercel.app'
    fetch(`${appUrl}/api/digest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ petId }),
    }).catch(() => {}) // fire and forget
  } catch {}

  return NextResponse.json({ checkin: data, already_exists: false })
}
