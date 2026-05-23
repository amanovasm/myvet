'use client'
import { useState } from 'react'
import Nav from '@/components/nav'
import { FileText, Copy, Check } from 'lucide-react'

export default function ReportPage() {
  const [days, setDays]       = useState(90)
  const [report, setReport]   = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      const data = await res.json()
      setReport(data.report || '')
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="p-4 pb-24 max-w-md mx-auto">
      <div className="pt-4 mb-4">
        <h1 className="text-xl font-bold">Отчёт для врача</h1>
        <p className="text-sm text-gray-400 mt-1">Структурированная история для консультации</p>
      </div>

      {/* Период */}
      <div className="card mb-4">
        <p className="font-semibold mb-3">Период</p>
        <div className="grid grid-cols-3 gap-2">
          {[{v:30,label:'30 дней'},{v:90,label:'3 месяца'},{v:180,label:'6 месяцев'}].map(opt => (
            <button key={opt.v} onClick={() => setDays(opt.v)}
              className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${days === opt.v ? 'border-teal-500 bg-teal-50 text-teal-500' : 'border-gray-200 text-gray-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={generate} disabled={loading}
        className="btn-primary mb-4 flex items-center justify-center gap-2">
        <FileText size={18} />
        {loading ? 'Формируем отчёт...' : 'Сформировать отчёт'}
      </button>

      {report && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Готово</p>
            <button onClick={copy}
              className="flex items-center gap-1.5 text-sm text-teal-500 font-medium">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
            {report}
          </pre>
        </div>
      )}

      <Nav />
    </main>
  )
}
