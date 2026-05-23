import { NextRequest, NextResponse } from 'next/server'
import { generateWeeklyDigest } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { petId } = await req.json()
    if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })
    const content = await generateWeeklyDigest(petId)
    return NextResponse.json({ content })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
