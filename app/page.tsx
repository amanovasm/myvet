import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/nav'
import { formatDateRu, APPETITE_EMOJI, TOILET_EMOJI, ACTIVITY_EMOJI } from '@/lib/utils'
import { format } from 'date-fns'
import { Heart, Sparkles, ChevronRight, Plus } from 'lucide-react'

// Получаем первого питомца
async function getPet() {
  const { data } = await supabase.from('pets').select('*').limit(1).single()
  return data
}

async function getTodayCheckin(petId: string) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('pet_id', petId)
    .eq('date', today)
    .single()
  return data
}

async function getRecentEvents(petId: string) {
  const { data } = await supabase
    .from('health_events')
    .select('*')
    .eq('pet_id', petId)
    .order('occurred_at', { ascending: false })
    .limit(3)
  return data || []
}

async function getLastDigest(petId: string) {
  const { data } = await supabase
    .from('ai_digests')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

export default async function Dashboard() {
  const pet = await getPet()

  if (!pet) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">🐱</div>
          <h1 className="text-2xl font-bold">Добро пожаловать в myvet</h1>
          <p className="text-gray-500">Давайте начнём с добавления вашего питомца</p>
          <Link href="/pet" className="btn-primary block">Добавить питомца</Link>
        </div>
      </main>
    )
  }

  const [checkin, events, digest] = await Promise.all([
    getTodayCheckin(pet.id),
    getRecentEvents(pet.id),
    getLastDigest(pet.id),
  ])

  const today = formatDateRu(new Date())

  return (
    <main className="pb-24 p-4 space-y-4">
      {/* Header */}
      <div className="pt-4 pb-2">
        <p className="text-sm text-gray-400">{today}</p>
        <h1 className="text-2xl font-bold">Привет, {pet.name} 🐱</h1>
      </div>

      {/* Сегодняшний чек-ин */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="section-title">Сегодня</span>
          {!checkin && (
            <span className="text-xs text-coral-500 font-medium">не заполнен</span>
          )}
        </div>

        {checkin ? (
          <div className="flex justify-around">
            <div className="text-center">
              <div className="text-2xl">{APPETITE_EMOJI[checkin.appetite as 1|2|3]}</div>
              <div className="text-xs text-gray-400 mt-1">Аппетит</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{TOILET_EMOJI[checkin.toilet as 1|2|3]}</div>
              <div className="text-xs text-gray-400 mt-1">Туалет</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{ACTIVITY_EMOJI[checkin.activity as 1|2|3]}</div>
              <div className="text-xs text-gray-400 mt-1">Активность</div>
            </div>
          </div>
        ) : (
          <Link href="/checkin"
            className="flex items-center justify-between py-3 px-4 bg-teal-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-teal-500" />
              <span className="font-medium text-teal-500">Заполнить чек-ин</span>
            </div>
            <ChevronRight size={18} className="text-teal-500" />
          </Link>
        )}
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/events/new"
          className="card flex items-center gap-3 active:bg-gray-50">
          <div className="w-10 h-10 rounded-xl bg-coral-50 flex items-center justify-center">
            <Plus size={20} className="text-coral-500" />
          </div>
          <div>
            <div className="font-semibold text-sm">Событие</div>
            <div className="text-xs text-gray-400">Health event</div>
          </div>
        </Link>
        <Link href="/digest"
          className="card flex items-center gap-3 active:bg-gray-50">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Sparkles size={20} className="text-teal-500" />
          </div>
          <div>
            <div className="font-semibold text-sm">Дайджест</div>
            <div className="text-xs text-gray-400">AI-анализ</div>
          </div>
        </Link>
      </div>

      {/* Последний дайджест */}
      {digest && (
        <div className="card border-l-4 border-teal-500">
          <div className="section-title">Последний дайджест</div>
          <p className="text-sm text-gray-600 line-clamp-3">{digest.content}</p>
          <Link href="/digest" className="text-xs text-teal-500 font-medium mt-2 block">
            Читать полностью →
          </Link>
        </div>
      )}

      {/* Последние события */}
      {events.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="section-title">Последние события</span>
            <Link href="/events" className="text-xs text-teal-500 font-medium">Все</Link>
          </div>
          <div className="space-y-2">
            {events.map(event => (
              <div key={event.id} className="flex items-center gap-3 py-1">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  event.direction === 'negative' ? 'bg-coral-500' :
                  event.direction === 'positive' ? 'bg-teal-500' : 'bg-amber-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{event.event_type}</div>
                  <div className="text-xs text-gray-400">{event.identifier}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Nav />
    </main>
  )
}
