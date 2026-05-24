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
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Upload to Supabase Storage
    const fileName = `${petId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('medical-docs')
      .upload(fileName, arrayBuffer, { contentType: 'application/pdf' })
    const fileUrl = uploadError ? null : fileName

    // Send PDF to Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document' as any,
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: `Это лабораторный документ. Анализы могут быть сданы в человеческой лаборатории для животного — это нормально, извлекай данные в любом случае.

Верни ТОЛЬКО JSON без markdown и пояснений:
{
  "document_type": "oac|biochemistry|urinalysis|ultrasound|discharge|phenobarbital|other",
  "document_date": "YYYY-MM-DD или null",
  "title": "краткое название документа",
  "parameters": [
    {
      "parameter_name": "название показателя на русском",
      "parameter_key": "klyuch_latinskimi_bukvami",
      "value": число или null,
      "value_text": "текстовое значение если не число, иначе null",
      "unit": "единица измерения или null",
      "ref_min": число или null,
      "ref_max": число или null,
      "is_abnormal": true если выходит за референсные значения иначе false
    }
  ]
}
Типы: oac=общий анализ крови, biochemistry=биохимия, urinalysis=анализ мочи, ultrasound=УЗИ, discharge=выписка врача, phenobarbital=уровень противосудорожных препаратов, other=прочее.
Извлекай ВСЕ числовые показатели из документа. Не пропускай ни один.`
          }
        ]
      }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    
    let parsed: any = {}
    try {
      const clean = rawText.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'raw:', rawText.slice(0, 500))
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
        raw_text: rawText.slice(0, 5000),
      })
      .select().single()

    if (docError) return NextResponse.json({ error: 'doc insert: ' + docError.message }, { status: 500 })

    let parametersInserted = 0

    if (parsed.parameters?.length > 0) {
      // Insert one by one to catch individual errors
      for (const p of parsed.parameters) {
        if (!p.parameter_name || !p.parameter_key) continue
        
        const row = {
          pet_id: petId,
          document_id: doc.id,
          document_date: docDate,
          category: parsed.document_type || 'other',
          parameter_name: String(p.parameter_name),
          parameter_key: String(p.parameter_key),
          value: (p.value !== null && p.value !== undefined && !isNaN(Number(p.value))) ? Number(p.value) : null,
          value_text: p.value_text ? String(p.value_text) : null,
          unit: p.unit ? String(p.unit) : null,
          ref_min: (p.ref_min !== null && p.ref_min !== undefined && !isNaN(Number(p.ref_min))) ? Number(p.ref_min) : null,
          ref_max: (p.ref_max !== null && p.ref_max !== undefined && !isNaN(Number(p.ref_max))) ? Number(p.ref_max) : null,
          is_abnormal: Boolean(p.is_abnormal),
        }

        const { error: labError } = await supabase.from('lab_results').insert(row)
        if (labError) {
          console.error('Lab insert error:', labError.message, 'row:', JSON.stringify(row))
        } else {
          parametersInserted++
        }
      }
    }

    return NextResponse.json({ document: doc, parameters_count: parametersInserted })
  } catch (e: any) {
    console.error('Document upload error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
