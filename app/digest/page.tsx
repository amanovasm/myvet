'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateRu } from '@/lib/utils'
import { RefreshCw, Sparkles } from 'lucide-react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

export default function DigestPage() {
  const [digests, setDigests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [petId, setPetId] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('pets').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '').limit(1).single().then(({ data }) => {
      if (!data) { setLoading(false); return }
      setPetId(data.id)
      load(data.id)
    })
  }, [])

  async function load(pid: string) {
    const { data } = await supabase.from('ai_digests').select('*').eq('pet_id', pid).order('created_at', { ascending: false }).limit(5)
    setDigests(data || [])
    setLoading(false)
  }

  async function generate() {
    if (!petId) return
    setGenerating(true)
    try {
      await fetch('/api/digest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ petId }) })
      load(petId)
    } catch {}
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>
      <div className="px-3 py-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-[#8E8E93]">Анализ недели</p>
          <h1 className="text-[20px] font-bold text-[#1C1C1E]">Дайджест</h1>
        </div>
        <button onClick={generate} disabled={generating || !petId}
          className="btn-light flex items-center gap-1.5 px-3 py-2 rounded-[10px] disabled:opacity-50">
          <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
          <span>{generating ? 'Анализирую...' : 'Обновить'}</span>
        </button>
      </div>

      <div className="px-3 flex flex-col gap-3 pb-4">
        <div className="card" style={{ borderLeft: '2.5px solid #FD6220', borderRadius: '0 13px 13px 0' }}>
          <p className="text-[9px] font-medium text-[#3C3C43] leading-relaxed">
            AI анализирует данные чек-инов и событий. Говорит языком истории Мави — не ставит диагнозы, а показывает паттерны.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : digests.length === 0 ? (
          <div className="text-center py-12 text-[#8E8E93]">
            <Sparkles size={32} className="mx-auto mb-3 text-[#FDD5C0]" />
            <p className="text-sm font-medium">Дайджестов пока нет</p>
            <p className="text-[10px] mt-1">Нажми «Обновить» чтобы создать первый</p>
          </div>
        ) : (
          digests.map((d, i) => (
            <div key={d.id} className={`card ${i > 0 ? 'opacity-70' : ''}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-[#FD6220]" />
                <span className="text-[8px] text-[#8E8E93]">{formatDateRu(d.period_start)} — {formatDateRu(d.period_end)}</span>
                {i === 0 && <span className="text-[7px] font-bold bg-[#FFF4EF] text-[#FD6220] px-1.5 py-0.5 rounded-full ml-auto">Последний</span>}
              </div>
              <p className="text-[10px] font-medium text-[#3C3C43] leading-relaxed whitespace-pre-line">{d.content}</p>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
