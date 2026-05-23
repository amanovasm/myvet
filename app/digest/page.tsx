'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/nav'
import { Sparkles, RefreshCw } from 'lucide-react'
import { formatDateRu } from '@/lib/utils'

export default function DigestPage() {
  const [digests, setDigests]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [petId, setPetId]       = useState<string | null>(null)

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (!data) { setLoading(false); return }
      setPetId(data.id)
      loadDigests(data.id)
    })
  }, [])

  async function loadDigests(pid: string) {
    const { data } = await supabase
      .from('ai_digests').select('*').eq('pet_id', pid)
      .order('created_at', { ascending: false }).limit(5)
    setDigests(data || [])
    setLoading(false)
  }

  async function generate() {
    if (!petId) return
    setGenerating(true)
    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId }),
      })
      if (res.ok) loadDigests(petId)
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  return (
    <main className="p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-xl font-bold">AI Дайджест</h1>
        <button onClick={generate} disabled={generating || !petId}
          className="flex items-center gap-1.5 bg-teal-500 text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
          <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Анализирую...' : 'Создать'}
        </button>
      </div>

      <div className="card mb-4 border-l-4 border-teal-500">
        <p className="text-sm text-gray-600">
          AI анализирует данные чек-инов и событий за последние 7 дней и находит паттерны из истории Мави.
          Не диагноз — зеркало наблюдений.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загружаем...</div>
      ) : digests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Sparkles size={40} className="mx-auto mb-3 text-teal-200" />
          <p>Дайджестов пока нет</p>
          <p className="text-sm mt-1">Нажми «Создать» чтобы проанализировать данные</p>
        </div>
      ) : (
        <div className="space-y-4">
          {digests.map((d, i) => (
            <div key={d.id} className={`card ${i === 0 ? 'border-teal-200' : 'opacity-70'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-teal-500" />
                <span className="text-xs text-gray-400">
                  {formatDateRu(d.period_start)} — {formatDateRu(d.period_end)}
                </span>
                {i === 0 && <span className="text-xs bg-teal-50 text-teal-500 px-2 py-0.5 rounded-full font-medium">Последний</span>}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-line">{d.content}</p>
            </div>
          ))}
        </div>
      )}

      <Nav />
    </main>
  )
}
