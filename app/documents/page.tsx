'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react'

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

    if (json.needs_manual_input) {
      // PDF is image-based, show manual input form
      setPendingFile(file)
      setShowManual(true)
      setStatus({type:'info', text:'PDF содержит только изображение. Введите данные вручную.'})
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
            <p className="text-[8px] text-[#8E8E93] mb-2">
              Перепишите показатели из документа. Например:
              Фенобарбитал: 30 мкг/мл (норма 15-40)
              Леветирацетам: 43.2 мкг/мл (норма 10-37)
              Дата: 25.04.2026
            </p>
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
          <button onClick={() => setTab('docs')}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold',
              tab === 'docs' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Документы ({documents.length})
          </button>
          <button onClick={() => setTab('dynamics')}
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
              (() => {
                const allDates = Array.from(new Set(filteredResults.map((r: any) => r.document_date))).sort() as string[]
                const params = Object.entries(byParam)
                return (
                  <div className="bg-white rounded-[13px] border border-[#E5E5EA] overflow-x-auto">
                    <table className="w-full min-w-full">
                      <thead>
                        <tr style={{background:'#F9F9F9'}}>
                          <th className="text-[8px] font-bold text-[#8E8E93] p-2 text-left border-b border-[#F2F2F7] min-w-[110px]">Показатель</th>
                          {allDates.map(date => (
                            <th key={date} className="text-[8px] font-bold text-[#8E8E93] p-2 text-center border-b border-l border-[#F2F2F7] min-w-[60px]">
                              {format(new Date(date + 'T12:00:00'), 'dd.MM.yy')}
                            </th>
                          ))}
                          <th className="text-[8px] font-bold text-[#8E8E93] p-2 text-center border-b border-l border-[#F2F2F7] min-w-[80px]">Норма</th>
                        </tr>
                      </thead>
                      <tbody>
                        {params.map(([key, values], idx) => {
                          const latest = (values as any[])[values.length - 1]
                          const byDate: Record<string, any> = {}
                          ;(values as any[]).forEach((v: any) => { byDate[v.document_date] = v })
                          const hasAbnormal = (values as any[]).some((v: any) => v.is_abnormal)
                          return (
                            <tr key={key} className={idx % 2 === 0 ? '' : 'bg-[#FAFAFA]'}>
                              <td className="p-2 border-b border-[#F2F2F7]">
                                <div className="flex items-center gap-1">
                                  {hasAbnormal
                                    ? <AlertCircle size={9} className="text-red-500 flex-shrink-0" />
                                    : <CheckCircle size={9} className="text-green-500 flex-shrink-0" />}
                                  <span className="text-[9px] font-semibold text-[#1C1C1E] leading-tight">{latest.parameter_name}</span>
                                </div>
                              </td>
                              {allDates.map(date => {
                                const v = byDate[date]
                                return (
                                  <td key={date} className="p-2 text-center border-b border-l border-[#F2F2F7]">
                                    {v ? (
                                      <span className={cn('text-[11px] font-bold', v.is_abnormal ? 'text-red-500' : 'text-[#1C1C1E]')}>
                                        {v.value ?? v.value_text ?? '—'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-[#C7C7CC]">—</span>
                                    )}
                                  </td>
                                )
                              })}
                              <td className="p-2 text-center border-b border-l border-[#F2F2F7]">
                                {(latest.ref_min !== null || latest.ref_max !== null) ? (
                                  <span className="text-[7px] text-[#8E8E93] whitespace-nowrap">{latest.ref_min ?? '?'}–{latest.ref_max ?? '?'} {latest.unit}</span>
                                ) : (
                                  <span className="text-[7px] text-[#C7C7CC]">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
