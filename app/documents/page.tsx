'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Upload, AlertCircle, CheckCircle, ExternalLink, Plus, X, FileText, BarChart2 } from 'lucide-react'

const DOC_TYPE_LABEL: Record<string, string> = {
  oac: 'ОАК', biochemistry: 'Биохимия', urinalysis: 'Анализ мочи',
  ultrasound: 'УЗИ', discharge: 'Выписка', phenobarbital: 'Фенобарбитал/Леветирацетам',
  other: 'Документ',
}
const DOC_TYPE_COLOR: Record<string, string> = {
  oac: 'bg-blue-50 text-blue-600 border-blue-200',
  biochemistry: 'bg-purple-50 text-purple-600 border-purple-200',
  urinalysis: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  ultrasound: 'bg-green-50 text-green-600 border-green-200',
  discharge: 'bg-orange-50 text-orange-600 border-orange-200',
  phenobarbital: 'bg-red-50 text-red-600 border-red-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function DocumentsPage() {
  const [petId, setPetId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [labResults, setLabResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'docs' | 'dynamics'>('docs')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // PDF upload state
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{type: 'error'|'success', text: string} | null>(null)

  // Manual entry state
  const [showManual, setShowManual] = useState(false)
  const [manualText, setManualText] = useState('')
  const [submittingManual, setSubmittingManual] = useState(false)
  const [manualStatus, setManualStatus] = useState<{type: 'error'|'success', text: string} | null>(null)

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); loadAll(data.id) }
      else setLoading(false)
    })
  }, [])

  async function loadAll(pid: string) {
    setLoading(true)
    const [docsRes, labRes] = await Promise.all([
      fetch(`/api/documents?petId=${pid}&_t=${Date.now()}`),
      fetch(`/api/lab-results?petId=${pid}&_t=${Date.now()}`),
    ])
    setDocuments((await docsRes.json()).documents || [])
    setLabResults((await labRes.json()).results || [])
    setLoading(false)
  }

  // Флоу 1: Загрузить PDF — только сохраняет файл, без парсинга
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !petId) return
    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      setUploadStatus({ type: 'error', text: 'Поддерживаются PDF и DOCX' })
      return
    }
    setUploading(true)
    setUploadStatus(null)

    const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${petId}/${Date.now()}_${sanitizedName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer)

    // Upload directly to storage + save doc record via API
    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('file', file)
    formData.append('store_only', 'true') // new flag: just store, don't parse

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()

    if (json.error) {
      setUploadStatus({ type: 'error', text: 'Ошибка: ' + json.error })
    } else {
      setUploadStatus({ type: 'success', text: 'Документ сохранён' })
      await loadAll(petId)
    }
    setUploading(false)
    e.target.value = ''
  }

  // Флоу 2: Внести результаты вручную → в динамику
  async function submitManual() {
    if (!petId || !manualText.trim()) return
    setSubmittingManual(true)
    setManualStatus(null)

    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('manual_text', manualText)

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()

    if (json.error) {
      setManualStatus({ type: 'error', text: 'Ошибка: ' + json.error })
    } else if (json.parameters_count === 0) {
      setManualStatus({ type: 'error', text: 'Не удалось распознать показатели. Проверь формат.' })
    } else {
      setManualStatus({ type: 'success', text: `Сохранено! Добавлено ${json.parameters_count} показателей` })
      setManualText('')
      setTimeout(() => { setShowManual(false); setManualStatus(null) }, 2000)
      await loadAll(petId)
    }
    setSubmittingManual(false)
  }

  async function openDoc(docId: string, fileUrl: string | null) {
    if (!fileUrl) { alert('Файл не загружен в хранилище'); return }
    const res = await fetch(`/api/documents/view?docId=${docId}`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
    else alert('Не удалось открыть файл')
  }

  const categories = Array.from(new Set(labResults.map((r: any) => r.category)))
  const filteredResults = selectedCategory === 'all' ? labResults : labResults.filter((r: any) => r.category === selectedCategory)
  const byParam: Record<string, any[]> = {}
  filteredResults.forEach((r: any) => {
    if (!byParam[r.parameter_key]) byParam[r.parameter_key] = []
    byParam[r.parameter_key].push(r)
  })

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>

      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] text-[#8E8E93]">Медицина</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">Документы</h1>
      </div>

      {/* Два действия */}
      <div className="px-3 mb-3 grid grid-cols-2 gap-2">
        {/* Кнопка загрузки PDF */}
        <label className={cn('flex items-center justify-center gap-1.5 rounded-[12px] py-3 text-[10px] font-bold cursor-pointer',
          uploading ? 'bg-[#F2F2F7] text-[#8E8E93]' : 'bg-[#FD6220] text-white')}>
          <FileText size={13} />
          {uploading ? 'Загружаю...' : 'Загрузить PDF'}
          <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>

        {/* Кнопка ручного ввода */}
        <button onClick={() => { setShowManual(!showManual); setManualStatus(null) }}
          className="flex items-center justify-center gap-1.5 rounded-[12px] py-3 text-[10px] font-bold bg-white border border-[#FD6220] text-[#FD6220]">
          <BarChart2 size={13} />
          Внести результаты
        </button>
      </div>

      {/* Статус загрузки */}
      {uploadStatus && (
        <div className="px-3 mb-2">
          <p className={cn('text-[9px] px-1', uploadStatus.type === 'success' ? 'text-green-600' : 'text-red-500')}>
            {uploadStatus.type === 'success' ? '✓ ' : '✕ '}{uploadStatus.text}
          </p>
        </div>
      )}

      {/* Форма ручного ввода результатов */}
      {showManual && (
        <div className="px-3 mb-3">
          <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-[#1C1C1E]">Внести результаты анализов</p>
              <button onClick={() => { setShowManual(false); setManualText('') }}>
                <X size={14} className="text-[#8E8E93]" />
              </button>
            </div>
            <div className="bg-[#F2F2F7] rounded-[8px] p-2 mb-2">
              <p className="text-[9px] text-[#8E8E93] font-medium mb-1">Формат ввода:</p>
              <p className="text-[9px] font-mono text-[#3C3C43] leading-relaxed">
                АЛТ: 95.9 U/l (норма 19-79)<br/>
                Глюкоза: 4.9 mmol/l (норма 3.3-6.3)<br/>
                Дата: 06.04.2024
              </p>
            </div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)}
              placeholder="Введи показатели из анализа..." rows={6}
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220] mb-2" />
            {manualStatus && (
              <p className={cn('text-[9px] mb-2', manualStatus.type === 'success' ? 'text-green-600' : 'text-red-500')}>
                {manualStatus.type === 'success' ? '✓ ' : '✕ '}{manualStatus.text}
              </p>
            )}
            <button onClick={submitManual} disabled={!manualText.trim() || submittingManual}
              className="w-full bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] disabled:opacity-50">
              {submittingManual ? 'AI анализирует...' : 'Сохранить в динамику'}
            </button>
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="px-3 mb-3">
        <div className="bg-white rounded-[10px] border border-[#E5E5EA] p-0.5 flex">
          <button onClick={() => { setTab('docs'); if(petId) loadAll(petId) }}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold',
              tab === 'docs' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Документы ({documents.length})
          </button>
          <button onClick={() => { setTab('dynamics'); if(petId) loadAll(petId) }}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold',
              tab === 'dynamics' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Динамика ({labResults.length})
          </button>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-2 pb-4">
        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : tab === 'docs' ? (
          documents.length === 0 ? (
            <div className="text-center py-12 text-[#8E8E93]">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-medium">Документов пока нет</p>
              <p className="text-[10px] mt-1">Загрузи PDF или DOCX</p>
            </div>
          ) : (
            documents.map((doc: any) => (
              <div key={doc.id} className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_12px]">
                <div className="flex items-start gap-2.5">
                  <span className={cn('text-[7px] font-bold px-1.5 py-0.5 rounded-[5px] border flex-shrink-0 mt-0.5',
                    DOC_TYPE_COLOR[doc.document_type] || DOC_TYPE_COLOR.other)}>
                    {DOC_TYPE_LABEL[doc.document_type] || 'Документ'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#1C1C1E] truncate">{doc.title}</p>
                    <p className="text-[8px] text-[#8E8E93] mt-0.5">
                      {format(new Date(doc.document_date + 'T12:00:00'), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  {doc.file_url && (
                    <button onClick={() => openDoc(doc.id, doc.file_url)}
                      className="w-7 h-7 rounded-[8px] bg-[#FFF4EF] flex items-center justify-center flex-shrink-0">
                      <ExternalLink size={13} className="text-[#FD6220]" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          <>
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {(['all', ...categories] as string[]).map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={cn('flex-shrink-0 text-[8px] font-bold px-2.5 py-1 rounded-full border',
                      selectedCategory === cat ? 'bg-[#FD6220] text-white border-[#FD6220]' : 'bg-white text-[#8E8E93] border-[#E5E5EA]')}>
                    {cat === 'all' ? 'Все' : DOC_TYPE_LABEL[cat] || cat}
                  </button>
                ))}
              </div>
            )}
            {Object.entries(byParam).length === 0 ? (
              <div className="text-center py-12 text-[#8E8E93]">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm font-medium">Показателей пока нет</p>
                <p className="text-[10px] mt-1">Нажми «Внести результаты» чтобы добавить</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(byParam).map(([key, values]) => {
                  const sorted = [...(values as any[])].sort((a,b) => a.document_date.localeCompare(b.document_date))
                  const latest = sorted[sorted.length - 1]
                  const hasAbnormal = sorted.some((v:any) => v.is_abnormal)
                  const maxVal = Math.max(...sorted.map((v:any) => Number(v.value) || 0), Number(latest.ref_max) || 0) * 1.2 || 1

                  return (
                    <div key={key} className="bg-white rounded-[13px] border border-[#E5E5EA] overflow-hidden">
                      <div style={{height: '3px', background: hasAbnormal ? '#FD6220' : '#34C759'}} />
                      <div className="p-[14px]">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="text-[14px] font-bold text-[#1C1C1E] leading-tight">{latest.parameter_name}</p>
                            <p className="text-[11px] text-[#8E8E93] mt-0.5 font-medium">
                              {latest.unit}{latest.ref_min !== null && latest.ref_max !== null ? ` · норма ${latest.ref_min}–${latest.ref_max}` : ''}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: hasAbnormal ? '#FFF4EF' : '#F0FFF4',
                              color: hasAbnormal ? '#FD6220' : '#1A7F37',
                              border: `1px solid ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}`,
                            }}>
                            {hasAbnormal ? 'отклонение' : 'норма'}
                          </span>
                        </div>
                        {sorted.length === 1 ? (
                          <div className="flex items-center gap-3">
                            <div className="rounded-[10px] px-5 py-2.5 text-center flex-shrink-0"
                              style={{background: hasAbnormal ? '#FFF4EF' : '#F0FFF4', border: `1px solid ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}`}}>
                              <p className="text-[26px] font-bold m-0" style={{color: hasAbnormal ? '#FD6220' : '#1A7F37'}}>
                                {sorted[0].value ?? sorted[0].value_text ?? '—'}
                              </p>
                              <p className="text-[10px] font-semibold text-[#8E8E93] mt-0.5">
                                {format(new Date(sorted[0].document_date + 'T12:00:00'), 'dd.MM.yy')}
                              </p>
                            </div>
                            <p className="text-[11px] font-medium text-[#8E8E93] flex-1 leading-relaxed">Добавь ещё анализы чтобы видеть динамику</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-end gap-2.5" style={{height: '64px'}}>
                              {sorted.map((v:any, i:number) => {
                                const isLast = i === sorted.length - 1
                                const barH = Math.max(8, Math.round((Number(v.value) / maxVal) * 52))
                                const barColor = v.is_abnormal ? (isLast ? '#FD6220' : '#FF9F6B') : (isLast ? '#34C759' : '#6EE48A')
                                return (
                                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-[12px] font-bold" style={{color: v.is_abnormal ? '#FD6220' : '#1A7F37'}}>
                                      {v.value ?? '—'}
                                    </span>
                                    <div className="w-full rounded-t-[4px]" style={{height: `${barH}px`, background: barColor}} />
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex gap-2.5 mt-1 mb-2.5">
                              {sorted.map((v:any, i:number) => (
                                <div key={i} className="flex-1 text-center">
                                  <span className="text-[10px] font-semibold text-[#8E8E93]">
                                    {format(new Date(v.document_date + 'T12:00:00'), 'dd.MM.yy')}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {latest.ref_max !== null && (
                              <div className="pt-2" style={{borderTop: `1px dashed ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}`}}>
                                <span className="text-[10px] font-medium" style={{color: hasAbnormal ? '#FD6220' : '#1A7F37'}}>
                                  — верхняя граница нормы: {latest.ref_max} {latest.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
