import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Пробуем оба клиента
  const sbAnon = createClient(url!, anon!)
  const sbService = createClient(url!, service || anon!)

  const [evAnon, evService, checkinAnon] = await Promise.all([
    sbAnon.from('health_events').select('id,event_type,occurred_at').limit(5),
    sbService.from('health_events').select('id,event_type,occurred_at').limit(5),
    sbAnon.from('daily_checkins').select('id,date,appetite').limit(5),
  ])

  return NextResponse.json({
    supabase_url: url,
    has_service_key: !!service,
    events_anon: { data: evAnon.data, error: evAnon.error?.message },
    events_service: { data: evService.data, error: evService.error?.message },
    checkins_anon: { data: checkinAnon.data, error: checkinAnon.error?.message },
  })
}
