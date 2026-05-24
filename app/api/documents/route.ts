import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const petId = searchParams.get('petId')
  if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

  const { data: docs } = await supabase
    .from('medical_documents')
    .select('*')
    .eq('pet_id', petId)
    .order('document_date', { ascending: false })

  return NextResponse.json({ documents: docs || [] })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const petId = formData.get('petId') as string
    const file = formData.get('file') as File

    if (!petId || !file) return NextResponse.json({ error: 'missing params' }, { status: 400 })

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Upload to Supabase Storage
    const fileName = `${petId}/${Date.now()}_${file.name}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('medical-docs')
      .upload(fileName, arrayBuffer, { contentType: 'application/pdf' })

    const fileUrl = uploadError ? null : fileName

    // Send to Claude for parsing
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: `Это медицинский документ для кошки. Извлеки данные и верни ТОЛЬКО JSON без markdown:

{
  "document_type": "oac|biochemistry|urinalysis|ultrasound|discharge|phenobarbital|other",
  "document_date": "YYYY-MM-DD",
  "title": "краткое название документа",
  "parameters": [
    {
      "parameter_name": "название показателя на русском",
      "parameter_key": "уникальный_ключ_латиницей",
      "value": число или null,
      "value_text": "текстовое значение если не число",
      "unit": "единица измерения",
      "ref_min": минимум нормы или null,
      "ref_max": максимум нормы или null,
      "is_abnormal": true/false
    }
  ]
}

Типы документов: oac=общий анализ крови, biochemistry=биохимия, urinalysis=анализ мочи, ultrasound=УЗИ, discharge=выписка, phenobarbital=анализ на фенобарбитал/леветирацетам, other=прочее.
Для УЗИ и выписок параметров может не быть — оставь parameters пустым массивом.
Дату бери из документа. Если не найдешь — верни null.`
          }
        ]
      }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let parsed: any = {}
    try {
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { document_type: 'other', document_date: null, title: file.name, parameters: [] }
    }

    const docDate = parsed.document_date || new Date().toISOString().slice(0, 10)

    // Save document
    const { data: doc, error: docError } = await supabase
      .from('medical_documents')
      .insert({
        pet_id: petId,
        document_type: parsed.document_type || 'other',
        document_date: docDate,
        title: parsed.title || file.name,
        file_url: fileUrl,
        raw_text: rawText,
      })
      .select().single()

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

    // Save lab results
    if (parsed.parameters && parsed.parameters.length > 0) {
      const labRows = parsed.parameters.map((p: any) => ({
        pet_id: petId,
        document_id: doc.id,
        document_date: docDate,
        category: parsed.document_type || 'other',
        parameter_name: p.parameter_name,
        parameter_key: p.parameter_key,
        value: p.value ?? null,
        value_text: p.value_text ?? null,
        unit: p.unit ?? null,
        ref_min: p.ref_min ?? null,
        ref_max: p.ref_max ?? null,
        is_abnormal: p.is_abnormal ?? false,
      }))

      await supabase.from('lab_results').insert(labRows)
    }

    return NextResponse.json({ document: doc, parameters_count: parsed.parameters?.length || 0 })
  } catch (e: any) {
    console.error('Document upload error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
