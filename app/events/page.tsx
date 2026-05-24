'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { EVENT_TYPES, formatTimeRu, durationLabel, cn } from '@/lib/utils'

const DIR_DOT: Record<string, string> = {
  negative: 'bg-red-500', neutral: 'bg-orange-400', positive: 'bg-green-500',
}
const DIR_TAG: Record<string, string> = {
  negative: 'bg-[#FFF4EF] text-[#FD6220]',
  neutral: 'bg-[#FFF9EF] text-orange-500',
  positive: 'bg-[#EDFAF2] text-green-500',
}

interface HealthEvent {
  id: string; identifier: string; event_type: string
  direction: string; occurred_at: string
  duration_sec?: number; had_aura?: boolean | null; description?: string
}

function EventsContent() {
  const searchParams = useSearchParams()
  const [petId, setPetId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [events, setEvents] = useState<HealthEvent[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return { date: format(d, 'yyyy-MM-dd'), day: format(d, 'EEEEEE', { locale: ru }), num: format(d, 'd') }
  })

  const loadEvents = useCallback(async (pid: string, date: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('health_events').select('*').eq('pet_id', pid)
      .gte('occurred_at', `${date}T00:00:00`)
      .lte('occurred_at', `${date}T23:59:59`)
      .order('occurred_at', { ascending: false })
    setEvents((data as HealthEvent[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); loadEvents(data.id, format(new Date(), 'yyyy-MM-dd')) }
      else setLoading(false)
    })
  }, [loadEvents])

  // Перезагружаем при возврате со страницы сохранения
  useEffect(() => {
    const refresh = searchParams.get('refresh')
    if (refresh && petId) loadEvents(petId, selectedDate)
  }, [searchParams, petId, selectedDate, loadEvents])

  function changeDate(date: string) {
    setSelectedDate(date)
    if (petId) loadEvents(petId, date)
  }

  const eventLabel = (key: string) => EVENT_TYPES.find(t => t.key === key)?.label || key
  const selectedLabel = format(new Date(selectedDate + 'T12:00:00'), 'EEEE, d MMMM', { locale: ru })

  return (
    <>
      <div className="bg-white px-3 py-2 border-b border-[#F2F2F7]">
        <p className="text-[13px] font-bold text-[#1C1C1E] text-center mb-2 capitalize">{selectedLabel}</p>
        <div className="flex justify-around">
          {weekDays.map(d => (
            <button key={d.date} onClick={() => changeDate(d.date)} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-semibold text-[#8E8E93] capitalize">{d.day}</span>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold',
                d.date === selectedDate ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
                {d.num}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        <Link href="/events/new"
          className="block w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3 text-[11px] text-center">
          + Добавить событие
        </Link>

        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-[#8E8E93]">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-medium">Событий за этот день нет</p>
          </div>
        ) : (
          <div className="bg-white rounded-[13px] border border-[#E5E5EA]" style={{ padding: '6px 10px' }}>
            {events.map((ev, i) => (
              <div key={ev.id} className={`flex items-start gap-2 py-2.5 ${i < events.length - 1 ? 'border-b border-[#F2F2F7]' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${DIR_DOT[ev.direction]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-[#1C1C1E]">{eventLabel(ev.event_type)}</div>
                  <div className="text-[8px] text-[#8E8E93] mt-0.5">
                    {ev.identifier} · {formatTimeRu(ev.occurred_at)}
                    {ev.duration_sec ? ` · ${durationLabel(ev.duration_sec)}` : ''}
                    {ev.had_aura === true ? ' · с аурой' : ev.had_aura === false ? ' · без ауры' : ''}
                  </div>
                  {ev.description && <p className="text-[8px] text-[#3C3C43] mt-1 line-clamp-2">{ev.description}</p>}
                </div>
                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-[4px] flex-shrink-0 ${DIR_TAG[ev.direction]}`}>
                  {ev.direction === 'negative' ? '−' : ev.direction === 'positive' ? '+' : '·'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>
      <Suspense fallback={<p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>}>
        <EventsContent />
      </Suspense>
      <BottomNav />
    </div>
  )
}
