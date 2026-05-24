import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Проверяем env vars
  results.env = {
    supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabase_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    anthropic_key_prefix: process.env.ANTHROPIC_API_KEY?.slice(0, 10) + '...',
  }

  // 2. Проверяем Supabase
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: pets } = await sb.from('pets').select('id,name').limit(1)
    const { data: digests } = await sb.from('ai_digests').select('id,created_at').order('created_at', { ascending: false }).limit(1)
    results.supabase = { ok: true, pet: pets?.[0]?.name, last_digest: digests?.[0]?.created_at }
  } catch (e: any) {
    results.supabase = { ok: false, error: e.message }
  }

  // 3. Проверяем Anthropic
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "OK" only' }],
    })
    results.anthropic = {
      ok: true,
      response: response.content[0].type === 'text' ? response.content[0].text : 'no text',
    }
  } catch (e: any) {
    results.anthropic = { ok: false, error: e.message }
  }

  return NextResponse.json(results)
}
