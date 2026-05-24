'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Upload, ChevronRight, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

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
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [tab, setTab] = useState<'docs' | 'dynamics'>('docs')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); loadAll(data.id) }
      else setLoading(false)
    })
  }, [])

  async function loadAll(pid: string) {
    setLoading(true)
    const [docsRes, labRes] = await Promise.all([
      fetch(`/api/documents?petId=${pid}`),
      fetch(`/api/lab-results?petId=${pid}`),
    ])
    const { documents } = await docsRes.json()
    const { results } = await labRes.json()
    setDocuments(documents || [])
    setLabResults(results || [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !petId) return
    if (file.type !== 'application/pdf') {
      setUploadError('Только PDF файлы')
      return
    }
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const formData = new FormData()
    formData.append('petId', petId)
    formData.append('file', file)

    const res = await fetch('/api/documents', { method: 'POST', body: formData })
    const json = await res.json()

    if (json.error) {
      setUploadError('Ошибка: ' + json.error)
    } else {
      setUploadSuccess(`Загружено! Извлечено ${json.parameters_count} показателей`)
      await loadAll(petId)
    }
    setUploading(false)
    e.target.value = ''
  }

  // Group lab results by parameter_key for dynamics
  const categories = [...new Set(labResults.map(r => r.category))]
  const filteredResults = selectedCategory === 'all' ? labResults : labResults.filter(r => r.category === selectedCategory)

  // Group by parameter_key
  const byParam: Record<string, any[]> = {}
  filteredResults.forEach(r => {
    if (!byParam[r.parameter_key]) byParam[r.parameter_key] = []
    byParam[r.parameter_key].push(r)
  })

  // Only show params with 2+ measurements
  const dynamicParams = Object.entries(byParam).filter(([, vals]) => vals.length >= 1)

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>

      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] text-[#8E8E93]">Медицина</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">Документы</h1>
      </div>

      {/* Upload */}
      <div className="px-3 mb-3">
        <label className={cn('flex items-center justify-center gap-2 w-full rounded-[12px] py-3 text-[11px] font-bold cursor-pointer',
          uploading ? 'bg-[#F2F2F7] text-[#8E8E93]' : 'bg-[#FD6220] text-white')}>
          <Upload size={14} />
          {uploading ? 'Анализирую PDF...' : 'Загрузить PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadError && <p className="text-[9px] text-red-500 mt-1 px-1">{uploadError}</p>}
        {uploadSuccess && <p className="text-[9px] text-green-600 mt-1 px-1">✓ {uploadSuccess}</p>}
        {uploading && <p className="text-[8px] text-[#8E8E93] mt-1 px-1 text-center">AI читает документ и извлекает показатели...</p>}
      </div>

      {/* Tabs */}
      <div className="px-3 mb-3">
        <div className="bg-white rounded-[10px] border border-[#E5E5EA] p-0.5 flex">
          <button onClick={() => setTab('docs')}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold transition-all',
              tab === 'docs' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Документы ({documents.length})
          </button>
          <button onClick={() => setTab('dynamics')}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold transition-all',
              tab === 'dynamics' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Динамика ({labResults.length})
          </button>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-2 pb-4">
        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : tab === 'docs' ? (
          // DOCUMENTS LIST
          documents.length === 0 ? (
            <div className="text-center py-12 text-[#8E8E93]">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-medium">Документов пока нет</p>
              <p className="text-[10px] mt-1">Загрузи PDF с анализами или выписками</p>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_12px]">
                <div className="flex items-start gap-2.5">
                  <div className={cn('text-[7px] font-bold px-1.5 py-0.5 rounded-[5px] border flex-shrink-0 mt-0.5',
                    DOC_TYPE_COLOR[doc.document_type] || DOC_TYPE_COLOR.other)}>
                    {DOC_TYPE_LABEL[doc.document_type] || 'Документ'}
                  </div>
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
          // DYNAMICS VIEW
          <>
            {/* Category filter */}
            {categories.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button onClick={() => setSelectedCategory('all')}
                  className={cn('flex-shrink-0 text-[8px] font-bold px-2.5 py-1 rounded-full border',
                    selectedCategory === 'all' ? 'bg-[#FD6220] text-white border-[#FD6220]' : 'bg-white text-[#8E8E93] border-[#E5E5EA]')}>
                  Все
                </button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={cn('flex-shrink-0 text-[8px] font-bold px-2.5 py-1 rounded-full border',
                      selectedCategory === cat ? 'bg-[#FD6220] text-white border-[#FD6220]' : 'bg-white text-[#8E8E93] border-[#E5E5EA]')}>
                    {DOC_TYPE_LABEL[cat] || cat}
                  </button>
                ))}
              </div>
            )}

            {dynamicParams.length === 0 ? (
              <div className="text-center py-12 text-[#8E8E93]">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-sm font-medium">Показателей пока нет</p>
                <p className="text-[10px] mt-1">Загрузи PDF с анализами</p>
              </div>
            ) : (
              dynamicParams.map(([key, values]) => {
                const sorted = [...values].sort((a, b) => a.document_date.localeCompare(b.document_date))
                const latest = sorted[sorted.length - 1]
                const hasAbnormal = sorted.some(v => v.is_abnormal)

                return (
                  <div key={key} className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_12px]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {hasAbnormal
                          ? <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                          : <CheckCircle size={12} className="text-green-500 flex-shrink-0" />}
                        <span className="text-[10px] font-bold text-[#1C1C1E]">{latest.parameter_name}</span>
                      </div>
                      {latest.unit && <span className="text-[8px] text-[#8E8E93]">{latest.unit}</span>}
                    </div>

                    {/* Values timeline */}
                    <div className="flex gap-2 overflow-x-auto">
                      {sorted.map((v, i) => (
                        <div key={i} className="flex-shrink-0 text-center">
                          <div className={cn('text-[11px] font-bold',
                            v.is_abnormal ? 'text-red-500' : 'text-[#1C1C1E]')}>
                            {v.value ?? v.value_text ?? '—'}
                          </div>
                          <div className="text-[7px] text-[#8E8E93]">
                            {format(new Date(v.document_date + 'T12:00:00'), 'dd.MM.yy')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reference range */}
                    {(latest.ref_min !== null || latest.ref_max !== null) && (
                      <div className="mt-1.5 text-[7px] text-[#8E8E93]">
                        Норма: {latest.ref_min ?? '?'} — {latest.ref_max ?? '?'} {latest.unit}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
