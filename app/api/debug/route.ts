import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const sb = createClient(url, anon)

  // Тестовый INSERT
  const { data: inserted, error: insertError } = await sb
    .from('health_events')
    .insert({
      pet_id: '3eea3d93-d05d-4e87-8baf-4c7122680217',
      identifier: 'DEBUG-2026-05-24-999',
      event_type: 'test_debug',
      direction: 'neutral',
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single()

  const { data: allEvents } = await sb
    .from('health_events').select('id,event_type,identifier').limit(10)

  return NextResponse.json({
    insert_result: inserted,
    insert_error: insertError?.message,
    insert_error_details: insertError?.details,
    insert_error_hint: insertError?.hint,
    all_events: allEvents,
  })
}
