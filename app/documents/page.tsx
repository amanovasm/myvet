'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Upload, AlertCircle, CheckCircle, X, FileText, ExternalLink } from 'lucide-react'

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
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{type: 'error'|'success'|'info', text: string} | null>(null)
  const [tab, setTab] = useState<'docs' | 'dynamics'>('docs')
  const [selectedCategory, setSelectedCategory] = useState('all')
  // Manual input state
  const [showManual, setShowManual] = useState(false)
  const [manualText, setManualText] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [submittingManual, setSubmittingManual] = useState(false)

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

  async function openDoc(docId: string, fileUrl: string | null) {
    if (!fileUrl) { alert('Файл не загружен в хранилище'); return }
    const res = await fetch(`/api/documents/view?docId=${docId}`)
    const json = await res.json()
    if (json.url) window.open(json.url, '_blank')
    else alert('Не удалось открыть файл')
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !petId) return
    if (file.type !== 'application/pdf') { setStatus({type:'error', text:'Только PDF файлы'}); return }

    setUploading(true)
    setStatus(null)

    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('file', file)

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()
    setUploading(false)

    if (json.needs_manual_input || (json.document && json.parameters_count === 0)) {
      setPendingFile(file)
      setShowManual(true)
      if (json.document) await loadAll(petId) // save doc but show manual form
      setStatus({type:'info', text:'Не удалось извлечь показатели автоматически. Введи данные вручную.'})
    } else if (json.error) {
      setStatus({type:'error', text:'Ошибка: ' + json.error})
    } else {
      setStatus({type:'success', text:`Готово! Извлечено ${json.parameters_count} показателей`})
      await loadAll(petId)
    }
    e.target.value = ''
  }

  async function submitManual() {
    if (!petId || !manualText.trim()) return
    setSubmittingManual(true)
    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('manual_text', manualText)
    if (pendingFile) formData.append('file', pendingFile)

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()
    setSubmittingManual(false)

    if (json.error) {
      setStatus({type:'error', text:'Ошибка: ' + json.error})
    } else {
      setStatus({type:'success', text:`Готово! Извлечено ${json.parameters_count} показателей`})
      setShowManual(false)
      setManualText('')
      setPendingFile(null)
      await loadAll(petId)
    }
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

      <div className="px-3 mb-2">
        <label className={cn('flex items-center justify-center gap-2 w-full rounded-[12px] py-3 text-[11px] font-bold cursor-pointer',
          uploading ? 'bg-[#F2F2F7] text-[#8E8E93]' : 'bg-[#FD6220] text-white')}>
          <Upload size={14} />
          {uploading ? 'Читаю PDF...' : 'Загрузить PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {status && (
          <p className={cn('text-[9px] mt-1.5 px-1',
            status.type === 'error' ? 'text-red-500' :
            status.type === 'success' ? 'text-green-600' : 'text-[#FD6220] font-semibold')}>
            {status.type === 'success' ? '✓ ' : status.type === 'info' ? 'ℹ ' : '✕ '}{status.text}
          </p>
        )}
      </div>

      {/* Manual input form */}
      {showManual && (
        <div className="px-3 mb-3">
          <div className="bg-white rounded-[13px] border border-[#FDD5C0] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#FD6220]">Введите данные вручную</p>
              <button onClick={() => { setShowManual(false); setManualText('') }}>
                <X size={14} className="text-[#8E8E93]" />
              </button>
            </div>
            <p className="text-[9px] text-[#8E8E93] mb-2 leading-relaxed">
              Скопируй данные из документа или введи вручную. Формат:
            </p>
            <div className="bg-[#F2F2F7] rounded-[8px] p-2 mb-2">
              <p className="text-[9px] font-mono text-[#3C3C43] leading-relaxed">
                АЛТ: 95.9 U/l (норма 19-79)<br/>
                Глюкоза: 4.9 mmol/l (норма 3.3-6.3)<br/>
                Дата: 06.04.2024
              </p>
            </div>
            <textarea value={manualText} onChange={e => setManualText(e.target.value)}
              placeholder="Введите показатели из документа..." rows={5}
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220] mb-2" />
            <button onClick={submitManual} disabled={!manualText.trim() || submittingManual}
              className="w-full bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] disabled:opacity-50">
              {submittingManual ? 'AI анализирует...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
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
              <p className="text-[10px] mt-1">Загрузи PDF с анализами</p>
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
                                const barColor = v.is_abnormal
                                  ? (isLast ? '#FD6220' : '#FF9F6B')
                                  : (isLast ? '#34C759' : '#6EE48A')
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
