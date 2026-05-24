import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET() {
  const [pets, checkins, events] = await Promise.all([
    sb.from('pets').select('id,name'),
    sb.from('daily_checkins').select('id,pet_id,date,appetite').order('created_at',{ascending:false}).limit(5),
    sb.from('health_events').select('id,pet_id,event_type,occurred_at').order('created_at',{ascending:false}).limit(5),
  ])
  return NextResponse.json({ pets: pets.data, checkins: checkins.data, events: events.data, errors: { pets: pets.error?.message, checkins: checkins.error?.message, events: events.error?.message } })
}
