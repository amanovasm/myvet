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

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF using pdf-parse
    let pdfText = ''
    try {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      pdfText = pdfData.text
    } catch (e) {
      console.error('PDF parse error:', e)
      pdfText = `Файл: ${file.name}`
    }

    // Upload to Supabase Storage
    const fileName = `${petId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('medical-docs')
      .upload(fileName, buffer, { contentType: 'application/pdf' })
    const fileUrl = uploadError ? null : fileName

    // Send extracted text to Claude Haiku
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Это текст из лабораторного документа. Анализы сданы в лаборатории для животного (кошки). Не важно что лаборатория человеческая — извлекай все данные.

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
Типы: oac=ОАК, biochemistry=биохимия, urinalysis=анализ мочи, ultrasound=УЗИ, discharge=выписка, phenobarbital=уровень противосудорожных препаратов, other=прочее.
Извлеки ВСЕ числовые показатели.`
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

    const { data: doc, error: docError } = await supabase
      .from('medical_documents')
      .insert({
        pet_id: petId,
        document_type: parsed.document_type || 'other',
        document_date: docDate,
        title: parsed.title || file.name,
        file_url: fileUrl,
        raw_text: pdfText.slice(0, 5000),
      })
      .select().single()

    if (docError) return NextResponse.json({ error: docError.message }, { status: 500 })

    let parametersInserted = 0
    if (parsed.parameters?.length > 0) {
      for (const p of parsed.parameters) {
        if (!p.parameter_name || !p.parameter_key) continue
        const { error: labError } = await supabase.from('lab_results').insert({
          pet_id: petId,
          document_id: doc.id,
          document_date: docDate,
          category: parsed.document_type || 'other',
          parameter_name: String(p.parameter_name),
          parameter_key: String(p.parameter_key),
          value: (p.value !== null && !isNaN(Number(p.value))) ? Number(p.value) : null,
          value_text: p.value_text ? String(p.value_text) : null,
          unit: p.unit ? String(p.unit) : null,
          ref_min: (p.ref_min !== null && !isNaN(Number(p.ref_min))) ? Number(p.ref_min) : null,
          ref_max: (p.ref_max !== null && !isNaN(Number(p.ref_max))) ? Number(p.ref_max) : null,
          is_abnormal: Boolean(p.is_abnormal),
        })
        if (!labError) parametersInserted++
        else console.error('Lab insert error:', labError.message)
      }
    }

    return NextResponse.json({ document: doc, parameters_count: parametersInserted })
  } catch (e: any) {
    console.error('Document error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
