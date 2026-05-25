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
    const manualText = formData.get('manual_text') as string | null

    if (!petId) return NextResponse.json({ error: 'petId required' }, { status: 400 })

    let pdfText = manualText || ''
    let fileUrl: string | null = null

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Try pdf-parse first
      try {
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        if (pdfData.text && pdfData.text.trim().length > 50) {
          pdfText = pdfData.text
        }
      } catch (e) {
        console.log('pdf-parse failed, will use manual text if provided')
      }

      // Upload to storage
      const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${petId}/${Date.now()}_${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('medical-docs')
        .upload(fileName, buffer, { contentType: 'application/pdf' })
      fileUrl = fileName // always save path, file is in storage
    }

    // If no text extracted, return special status asking for manual input
    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json({
        needs_manual_input: true,
        file_name: file?.name || '',
        message: 'PDF не содержит извлекаемого текста. Введите данные вручную.'
      })
    }

    // Parse with Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Это лабораторный документ для животного (кошки). Анализы сданы в человеческой лаборатории — это нормально.

ТЕКСТ ДОКУМЕНТА:
${pdfText.slice(0, 6000)}

Верни ТОЛЬКО JSON без markdown:
{
  "document_type": "oac|biochemistry|urinalysis|ultrasound|discharge|phenobarbital|other",
  "document_date": "YYYY-MM-DD или null",
  "title": "краткое название",
  "parameters": [
    {
      "parameter_name": "название показателя на русском",
      "parameter_key": "klyuch_latinskimi",
      "value": число или null,
      "value_text": "текст если не число иначе null",
      "unit": "единица или null",
      "ref_min": число или null,
      "ref_max": число или null,
      "is_abnormal": true если вне нормы иначе false
    }
  ]
}
Типы: oac=ОАК, biochemistry=биохимия, urinalysis=анализ мочи, ultrasound=УЗИ, discharge=выписка, phenobarbital=уровень противосудорожных препаратов.
Извлеки ВСЕ числовые показатели. Дату бери из документа.`
      }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let parsed: any = {}
    try {
      parsed = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim())
    } catch {
      parsed = { document_type: 'other', document_date: null, title: file?.name || 'Документ', parameters: [] }
    }

    const docDate = parsed.document_date || new Date().toISOString().slice(0, 10)

    const { data: doc, error: docError } = await supabase
      .from('medical_documents')
      .insert({
        pet_id: petId,
        document_type: parsed.document_type || 'other',
        document_date: docDate,
        title: parsed.title || file?.name || 'Документ',
        file_url: fileUrl,
        raw_text: pdfText.slice(0, 5000),
      })
      .select().single()

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

    let parametersInserted = 0
    for (const p of (parsed.parameters || [])) {
      if (!p.parameter_name || !p.parameter_key) continue
      const { error } = await supabase.from('lab_results').insert({
        pet_id: petId,
        document_id: doc.id,
        document_date: docDate,
        category: parsed.document_type || 'other',
        parameter_name: String(p.parameter_name),
        parameter_key: String(p.parameter_key),
        value: (p.value !== null && p.value !== undefined && !isNaN(Number(p.value))) ? Number(p.value) : null,
        value_text: p.value_text ? String(p.value_text) : null,
        unit: p.unit ? String(p.unit) : null,
        ref_min: (p.ref_min !== null && !isNaN(Number(p.ref_min))) ? Number(p.ref_min) : null,
        ref_max: (p.ref_max !== null && !isNaN(Number(p.ref_max))) ? Number(p.ref_max) : null,
        is_abnormal: Boolean(p.is_abnormal),
      })
      if (!error) parametersInserted++
    }

    return NextResponse.json({ document: doc, parameters_count: parametersInserted })
  } catch (e: any) {
    console.error('Document error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
