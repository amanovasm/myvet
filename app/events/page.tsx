import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { EVENT_TYPES, formatTimeRu, durationLabel } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const DIR_DOT: Record<string, string> = {
  negative: 'bg-red-500', neutral: 'bg-orange-400', positive: 'bg-green-500',
}
const DIR_TAG: Record<string, string> = {
  negative: 'bg-[#FFF4EF] text-[#FD6220]',
  neutral: 'bg-[#FFF9EF] text-orange-500',
  positive: 'bg-[#EDFAF2] text-green-500',
}

async function getEvents() {
  const { data: pet } = await supabase.from('pets').select('id').limit(1).single()
  if (!pet) return []
  const { data } = await supabase
    .from('health_events').select('*').eq('pet_id', pet.id)
    .order('occurred_at', { ascending: false })
  return data || []
}

export default async function EventsPage() {
  const events = await getEvents()

  const grouped = events.reduce((acc, ev) => {
    const key = format(new Date(ev.occurred_at), 'd MMMM yyyy', { locale: ru })
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {} as Record<string, any[]>)

  const eventLabel = (key: string) => EVENT_TYPES.find(t => t.key === key)?.label || key

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>

      <div className="px-3 py-2">
        <p className="text-[10px] text-[#8E8E93]">Наблюдения</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">События</h1>
      </div>

      {/* Кнопка добавить — крупная, яркая */}
      <div className="px-3 mb-3">
        <Link href="/events/new" className="btn-brand block text-center py-3 text-[11px] rounded-[12px]">
          + Добавить событие
        </Link>
      </div>

      <div className="px-3 flex flex-col gap-2 pb-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-[#8E8E93]">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium">Событий пока нет</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, evs]) => (
            <div key={date}>
              <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5 px-1">{date}</p>
              <div className="card" style={{ padding: '6px 10px' }}>
                {evs.map((ev, i) => (
                  <div key={ev.id} className={`flex items-start gap-2 py-2 ${i < evs.length - 1 ? 'border-b border-[#F2F2F7]' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${DIR_DOT[ev.direction]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-[#1C1C1E]">{eventLabel(ev.event_type)}</div>
                      <div className="text-[8px] text-[#8E8E93] mt-0.5">
                        {ev.identifier} · {formatTimeRu(ev.occurred_at)}
                        {ev.duration_sec ? ` · ${durationLabel(ev.duration_sec)}` : ''}
                        {ev.had_aura === true ? ' · с аурой' : ''}
                      </div>
                      {ev.description && (
                        <p className="text-[8px] text-[#3C3C43] mt-1 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                    <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-[4px] flex-shrink-0 ${DIR_TAG[ev.direction]}`}>
                      {ev.direction === 'negative' ? '−' : ev.direction === 'positive' ? '+' : '·'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
