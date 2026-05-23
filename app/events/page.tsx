import { supabase } from '@/lib/supabase'
import Nav from '@/components/nav'
import Link from 'next/link'
import { formatDateTimeRu, durationLabel } from '@/lib/utils'
import { Plus } from 'lucide-react'

const DIR_DOT: Record<string, string> = {
  negative: 'bg-coral-500',
  neutral:  'bg-amber-500',
  positive: 'bg-teal-500',
}

const TYPE_LABELS: Record<string, string> = {
  seizure:         'Приступ',
  head_pressing:   'Хедпрессинг',
  food_refusal:    'Отказ от еды',
  loaf_position:   'Буханка',
  no_urination:    'Нет мочеиспускания',
  vomiting:        'Рвота',
  strange_behavior:'Странное поведение',
  claw_sharpening: 'Точение когтей',
  meowing:         'Мяуканье',
  active_play:     'Активные игры',
}

async function getEvents() {
  const { data: pet } = await supabase.from('pets').select('id').limit(1).single()
  if (!pet) return []
  const { data } = await supabase
    .from('health_events')
    .select('*')
    .eq('pet_id', pet.id)
    .order('occurred_at', { ascending: false })
  return data || []
}

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <main className="p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-xl font-bold">Health Events</h1>
        <Link href="/events/new"
          className="flex items-center gap-1.5 bg-teal-500 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} />
          Новое
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p>Событий пока нет</p>
          <Link href="/events/new" className="text-teal-500 font-medium text-sm mt-2 block">
            Добавить первое событие
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="card">
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${DIR_DOT[event.direction]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">
                      {TYPE_LABELS[event.event_type] || event.event_type}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{event.identifier}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatDateTimeRu(event.occurred_at)}
                    {event.duration_sec ? ` · ${durationLabel(event.duration_sec)}` : ''}
                    {event.had_aura ? ' · с аурой' : ''}
                  </div>
                  {event.observations && (
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{event.observations}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Nav />
    </main>
  )
}
