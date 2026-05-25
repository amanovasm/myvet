'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { ExternalLink, Plus, X, Check } from 'lucide-react'

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

interface LabEntry {
  mode: 'existing' | 'new' | null
  paramKey: string
  paramName: string
  paramUnit: string
  refMin: string
  refMax: string
  value: string
  date: string
  saved: boolean
}

const emptyEntry = (): LabEntry => ({
  mode: null, paramKey: '', paramName: '', paramUnit: '',
  refMin: '', refMax: '', value: '',
  date: format(new Date(), 'yyyy-MM-dd'), saved: false,
})

export default function DocumentsPage() {
  const [petId, setPetId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [labResults, setLabResults] = useState<any[]>([])
  const [existingParams, setExistingParams] = useState<any[]>([]) // unique params already in DB
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'docs' | 'dynamics'>('docs')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // PDF upload
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  // Lab entry
  const [showEntry, setShowEntry] = useState(false)
  const [entry, setEntry] = useState<LabEntry>(emptyEntry())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    supabase.from('pets').select('id').not('user_id', 'is', null).limit(1).single().then(({ data }) => {
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
    const docs = (await docsRes.json()).documents || []
    const results = (await labRes.json()).results || []
    setDocuments(docs)
    setLabResults(results)
    // Уникальные существующие показатели
    const seen = new Set()
    const uniq = results.filter((r: any) => {
      if (seen.has(r.parameter_key)) return false
      seen.add(r.parameter_key); return true
    })
    setExistingParams(uniq)
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !petId) return
    setUploading(true); setUploadStatus(null)
    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('file', file)
    formData.append('store_only', 'true')
    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()
    setUploading(false)
    if (json.error) setUploadStatus('error:' + json.error)
    else { setUploadStatus('success'); await loadAll(petId) }
    e.target.value = ''
  }

  function selectExisting(param: any) {
    setEntry(prev => ({
      ...prev, mode: 'existing',
      paramKey: param.parameter_key,
      paramName: param.parameter_name,
      paramUnit: param.unit || '',
      refMin: String(param.ref_min ?? ''),
      refMax: String(param.ref_max ?? ''),
    }))
  }

  async function saveEntry() {
    if (!petId || !entry.value || !entry.date) { setSaveError('Заполни значение и дату'); return }
    if (entry.mode === 'new' && !entry.paramName) { setSaveError('Введи название показателя'); return }
    setSaving(true); setSaveError('')

    const key = entry.mode === 'existing' ? entry.paramKey : entry.paramName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const isAbnormal = entry.refMin && entry.refMax
      ? Number(entry.value) < Number(entry.refMin) || Number(entry.value) > Number(entry.refMax)
      : false

    const { error } = await supabase.from('lab_results').insert({
      pet_id: petId,
      document_id: null,
      document_date: entry.date,
      category: 'manual',
      parameter_name: entry.paramName,
      parameter_key: key,
      value: Number(entry.value),
      unit: entry.paramUnit || null,
      ref_min: entry.refMin ? Number(entry.refMin) : null,
      ref_max: entry.refMax ? Number(entry.refMax) : null,
      is_abnormal: isAbnormal,
    })

    setSaving(false)
    if (error) { setSaveError(error.message); return }

    // Показатель сохранён — сбрасываем для следующего
    setEntry(prev => ({ ...emptyEntry(), saved: false }))
    await loadAll(petId)
  }

  async function openDoc(docId: string, fileUrl: string | null) {
    if (!fileUrl) { alert('Файл не загружен'); return }
    const res = await fetch(`/api/documents/view?docId=${docId}`)
    const json = await res.json()
    if (!json.url) { alert('Не удалось открыть файл'); return }
    
    // DOCX — открываем через Google Docs Viewer
    if (fileUrl.endsWith('.docx') || fileUrl.includes('.docx')) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(json.url)}&embedded=true`
      window.open(viewerUrl, '_blank')
    } else {
      // PDF — открываем напрямую
      window.open(json.url, '_blank')
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
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pt-[52px] pb-[72px]">
      <div className="bg-white"><TopBar /></div>

      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] text-[#8E8E93]">Медицина</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">Документы</h1>
      </div>

      {/* Форма добавления показателя */}
      {showEntry && (
        <div className="px-3 mb-3">
          <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-[#1C1C1E]">Добавить показатель</p>
              <button onClick={() => setShowEntry(false)}><X size={14} className="text-[#8E8E93]" /></button>
            </div>

            {/* Шаг 1: выбор типа */}
            {!entry.mode ? (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-[#8E8E93] mb-1">Это новый показатель или уже существующий?</p>
                {existingParams.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2">Существующие</p>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                      {existingParams.map((p: any) => (
                        <button key={p.parameter_key} onClick={() => selectExisting(p)}
                          className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#F2F2F7] text-left active:bg-[#FFF4EF]">
                          <span className="text-[11px] font-semibold text-[#1C1C1E]">{p.parameter_name}</span>
                          <span className="text-[9px] text-[#8E8E93]">{p.unit}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => setEntry(prev => ({ ...prev, mode: 'new' }))}
                  className="flex items-center gap-2 p-2.5 rounded-[10px] border-[1.5px] border-dashed border-[#FD6220] text-[#FD6220]">
                  <Plus size={14} />
                  <span className="text-[11px] font-bold">Новый показатель</span>
                </button>
              </div>
            ) : (
              /* Шаг 2: ввод данных */
              <div className="flex flex-col gap-2.5">
                {entry.mode === 'new' && (
                  <>
                    <div>
                      <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Название *</p>
                      <input value={entry.paramName} onChange={e => setEntry(prev => ({ ...prev, paramName: e.target.value }))}
                        placeholder="Например: АЛТ"
                        className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Единица</p>
                        <input value={entry.paramUnit} onChange={e => setEntry(prev => ({ ...prev, paramUnit: e.target.value }))}
                          placeholder="U/l"
                          className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Норма (мин–макс)</p>
                        <div className="flex gap-1">
                          <input value={entry.refMin} onChange={e => setEntry(prev => ({ ...prev, refMin: e.target.value }))}
                            placeholder="19"
                            className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                          <input value={entry.refMax} onChange={e => setEntry(prev => ({ ...prev, refMax: e.target.value }))}
                            placeholder="79"
                            className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {entry.mode === 'existing' && (
                  <div className="bg-[#F2F2F7] rounded-[10px] p-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#1C1C1E]">{entry.paramName}</span>
                    <button onClick={() => setEntry(prev => ({ ...prev, mode: null }))}
                      className="text-[9px] text-[#FD6220] font-bold">изменить</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Значение *</p>
                    <input type="number" value={entry.value} onChange={e => setEntry(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="95.9"
                      className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Дата *</p>
                    <input type="date" value={entry.date} onChange={e => setEntry(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[11px] outline-none focus:border-[#FD6220]" />
                  </div>
                </div>

                {saveError && <p className="text-[9px] text-red-500">{saveError}</p>}

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button onClick={() => setEntry(prev => ({ ...prev, mode: null }))}
                    className="bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-2.5 text-[10px]">← Назад</button>
                  <button onClick={saveEntry} disabled={saving}
                    className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] disabled:opacity-50">
                    {saving ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Табы */}
      <div className="px-3 mb-3">
        <div className="bg-white rounded-[10px] border border-[#E5E5EA] p-0.5 flex">
          <button onClick={() => { setTab('docs'); if(petId) loadAll(petId) }}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold', tab === 'docs' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Документы ({documents.length})
          </button>
          <button onClick={() => { setTab('dynamics'); if(petId) loadAll(petId) }}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold', tab === 'dynamics' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Динамика ({labResults.length})
          </button>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-2 pb-4">
        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : tab === 'docs' ? (
          <>
            <label className={cn('flex items-center justify-center gap-2 w-full rounded-[12px] py-3 text-[11px] font-bold cursor-pointer mb-1',
              uploading ? 'bg-[#F2F2F7] text-[#8E8E93]' : 'bg-[#FD6220] text-white')}>
              📎 {uploading ? 'Загружаю...' : 'Загрузить PDF или DOCX'}
              <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {uploadStatus && (
              <p className={cn('text-[9px] px-1 mb-1', uploadStatus.startsWith('error') ? 'text-red-500' : 'text-green-600')}>
                {uploadStatus.startsWith('error') ? '✕ ' + uploadStatus.slice(6) : '✓ Документ сохранён'}
              </p>
            )}
            {documents.length === 0 ? (
            <div className="text-center py-10 text-[#8E8E93]">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-medium">Документов пока нет</p>
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
          )}
          </>
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
            <button onClick={() => { setShowEntry(!showEntry); setEntry(emptyEntry()); setSaveError('') }}
              className="flex items-center justify-center gap-2 w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3 text-[11px] mb-1">
              <Plus size={14} /> Добавить показатель
            </button>
            {Object.entries(byParam).length === 0 ? (
              <div className="text-center py-10 text-[#8E8E93]">
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
                            style={{ background: hasAbnormal ? '#FFF4EF' : '#F0FFF4', color: hasAbnormal ? '#FD6220' : '#1A7F37', border: `1px solid ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}` }}>
                            {hasAbnormal ? 'отклонение' : 'норма'}
                          </span>
                        </div>
                        {sorted.length === 1 ? (
                          <div className="flex items-center gap-3">
                            <div className="rounded-[10px] px-5 py-2.5 text-center flex-shrink-0"
                              style={{ background: hasAbnormal ? '#FFF4EF' : '#F0FFF4', border: `1px solid ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}` }}>
                              <p className="text-[26px] font-bold m-0" style={{ color: hasAbnormal ? '#FD6220' : '#1A7F37' }}>
                                {sorted[0].value ?? '—'}
                              </p>
                              <p className="text-[10px] font-semibold text-[#8E8E93] mt-0.5">
                                {format(new Date(sorted[0].document_date + 'T12:00:00'), 'dd.MM.yy')}
                              </p>
                            </div>
                            <p className="text-[11px] font-medium text-[#8E8E93] flex-1 leading-relaxed">Добавь ещё результат чтобы видеть динамику</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-end gap-2.5" style={{ height: '64px' }}>
                              {sorted.map((v:any, i:number) => {
                                const isLast = i === sorted.length - 1
                                const barH = Math.max(8, Math.round((Number(v.value) / maxVal) * 52))
                                const barColor = v.is_abnormal ? (isLast ? '#FD6220' : '#FF9F6B') : (isLast ? '#34C759' : '#6EE48A')
                                return (
                                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                    <span className="text-[12px] font-bold" style={{ color: v.is_abnormal ? '#FD6220' : '#1A7F37' }}>{v.value ?? '—'}</span>
                                    <div className="w-full rounded-t-[4px]" style={{ height: `${barH}px`, background: barColor }} />
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
                              <div className="pt-2" style={{ borderTop: `1px dashed ${hasAbnormal ? '#FDD5C0' : '#A3E6B8'}` }}>
                                <span className="text-[10px] font-medium" style={{ color: hasAbnormal ? '#FD6220' : '#1A7F37' }}>
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
