'use client'
import { useState } from 'react'
import { FileText, Copy, Check, Share } from 'lucide-react'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

const PERIODS = [{ days: 30, label: '30 дней' }, { days: 90, label: '3 месяца' }, { days: 180, label: '6 месяцев' }]

export default function ReportPage() {
  const [days, setDays] = useState(90)
  const [report, setReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) })
      const data = await res.json()
      setReport(data.report || '')
    } catch {}
    setLoading(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(report)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: 'Отчёт для ветеринара', text: report })
    } else {
      copy()
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>
      <div className="px-3 py-2">
        <p className="text-[10px] text-[#8E8E93]">Для ветеринара</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">Отчёт</h1>
      </div>

      <div className="px-3 flex flex-col gap-3 pb-4">
        {/* Период */}
        <div className="card">
          <p className="section-title mb-2">Период</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setDays(p.days)}
                className={cn('rounded-[8px] py-2 border-[1.5px] text-[9px] font-bold transition-all',
                  days === p.days ? 'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]' : 'border-[#E5E5EA] text-[#8E8E93]')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="btn-brand flex items-center justify-center gap-2 disabled:opacity-50">
          <FileText size={16} />
          {loading ? 'Формируем отчёт...' : 'Сформировать отчёт'}
        </button>

        {report && (
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-[#1C1C1E]">Готово</p>
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex items-center gap-1 text-[9px] font-bold text-[#FD6220]">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button onClick={share}
                  className="flex items-center gap-1 text-[9px] font-bold text-[#FD6220]">
                  <Share size={12} />
                  Поделиться
                </button>
              </div>
            </div>
            <pre className="text-[8px] font-medium text-[#3C3C43] whitespace-pre-wrap leading-relaxed font-mono bg-[#F9F9F9] rounded-[8px] p-2.5">
              {report}
            </pre>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
