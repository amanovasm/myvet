import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getAge, formatRelative, APPETITE_OPTIONS, ACTIVITY_OPTIONS } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const { data: pet } = await supabase.from('pets').select('*').limit(1).single()
  if (!pet) return { pet: null, checkin: null, lastEvent: null, digest: null, weight: null, meds: [] }

  const today = format(new Date(), 'yyyy-MM-dd')
  const [{ data: checkin }, { data: events }, { data: digest }, { data: weights }, { data: meds }] = await Promise.all([
    supabase.from('daily_checkins').select('*').eq('pet_id', pet.id).eq('date', today).single(),
    supabase.from('health_events').select('*').eq('pet_id', pet.id).order('occurred_at', { ascending: false }).limit(1),
    supabase.from('ai_digests').select('*').eq('pet_id', pet.id).order('created_at', { ascending: false }).limit(1),
    supabase.from('weight_log').select('*').eq('pet_id', pet.id).order('measured_at', { ascending: false }).limit(1),
    supabase.from('medications').select('*').eq('pet_id', pet.id).is('ended_at', null).order('name'),
  ])

  return {
    pet,
    checkin: checkin || null,
    lastEvent: events?.[0] || null,
    digest: digest?.[0] || null,
    weight: weights?.[0] || null,
    meds: meds || [],
  }
}

const APPETITE_LABEL: Record<string, string> = {
  refused: 'Отказ', weak: 'Слабый', moderate: 'Умеренный',
  good: 'Хороший', excellent: 'Отличный', above_normal: 'Выше нормы',
}
const ACTIVITY_LABEL: Record<string, string> = {
  lethargic: 'Вялая', moderate: 'Средняя', active: 'Активная',
}
const DIR_DOT: Record<string, string> = {
  negative: 'bg-red-500', neutral: 'bg-orange-400', positive: 'bg-green-500',
}

export default async function Dashboard() {
  const { pet, checkin, lastEvent, digest, weight, meds } = await getData()

  if (!pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-5xl">🐱</div>
        <h1 className="text-xl font-bold text-center">Добро пожаловать в myvet</h1>
        <p className="text-sm text-[#8E8E93] text-center">Начните с добавления вашего питомца</p>
        <Link href="/pet" className="btn-brand block">Добавить питомца</Link>
      </div>
    )
  }

  const todayStr = format(new Date(), 'd MMMM yyyy, EEEE', { locale: ru })

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white sticky top-0 z-10">
        <TopBar petName={pet.name} />
      </div>

      <div className="flex-1 px-3 py-3 flex flex-col gap-3">
        {/* Дата */}
        <p className="text-[12px] font-bold text-[#1C1C1E] capitalize">{todayStr}</p>

        {/* Профиль питомца */}
        <div className="card-brand">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FD6220] flex items-center justify-center text-xl flex-shrink-0">🐱</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#1C1C1E]">{pet.name}</div>
              <div className="text-[9px] font-semibold text-[#FD6220] truncate">{pet.diagnoses || 'Диагноз не указан'}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-[#FDD5C0]">
            {weight && (
              <div className="text-center flex-1">
                <div className="text-[11px] font-bold text-[#FD6220]">{weight.weight_kg} кг</div>
                <div className="text-[7px] font-semibold text-[#8E8E93]">Вес</div>
              </div>
            )}
            {pet.birth_date && (
              <div className="text-center flex-1">
                <div className="text-[11px] font-bold text-[#1C1C1E]">{getAge(pet.birth_date)}</div>
                <div className="text-[7px] font-semibold text-[#8E8E93]">Возраст</div>
              </div>
            )}
            <div className="text-center flex-1">
              <div className="text-[11px] font-bold text-[#1C1C1E]">{pet.species === 'cat' ? 'Кошка' : 'Собака'}</div>
              <div className="text-[7px] font-semibold text-[#8E8E93]">Вид</div>
            </div>
          </div>
        </div>

        {/* Препараты */}
        {meds.length > 0 && (
          <div className="card">
            <div className="section-label">Текущие препараты</div>
            {meds.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-1.5 py-1.5 ${i < meds.length - 1 ? 'border-b border-[#F2F2F7]' : ''}`}>
                <span className="text-[9px] font-medium text-[#3C3C43] flex-1">{m.name}</span>
                <span className="text-[9px] font-bold text-[#FD6220]">{m.dose_amount}{m.dose_unit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Чек-ин */}
        {checkin ? (
          <div className="card" style={{ background: '#F4FFF7', borderColor: '#C6EFD0' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="section-label" style={{ color: '#1C1C1E' }}>Чек-ин сегодня</div>
              <span className="text-[7px] font-bold text-[#8E8E93] bg-[#F2F2F7] px-1.5 py-0.5 rounded-[5px]">🔒 Закрыт</span>
            </div>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#1C1C1E]">{APPETITE_LABEL[checkin.appetite] || checkin.appetite}</div>
                <div className="text-[7px] text-[#8E8E93]">Аппетит</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#1C1C1E]">{checkin.stool_count}р</div>
                <div className="text-[7px] text-[#8E8E93]">Стул</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#1C1C1E]">{checkin.urine_count}р</div>
                <div className="text-[7px] text-[#8E8E93]">Моча</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold text-[#1C1C1E]">{ACTIVITY_LABEL[checkin.activity] || checkin.activity}</div>
                <div className="text-[7px] text-[#8E8E93]">Активность</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ background: '#FFF4EF', border: '1.5px dashed #FD6220' }}>
            <div className="section-label" style={{ color: '#FD6220' }}>Чек-ин сегодня</div>
            <p className="text-[9px] font-semibold text-[#FD6220] mb-2">Ещё не заполнен</p>
            <Link href="/checkin" className="btn-brand block text-center">Заполнить чек-ин</Link>
          </div>
        )}

        {/* Последнее событие */}
        {lastEvent && (
          <div className="card">
            <div className="section-label">Последнее событие</div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DIR_DOT[lastEvent.direction]}`} />
              <div className="flex-1">
                <div className="text-[10px] font-bold text-[#1C1C1E]">{lastEvent.event_type}</div>
                <div className="text-[8px] text-[#8E8E93]">{formatRelative(lastEvent.occurred_at)} · {lastEvent.identifier}</div>
              </div>
            </div>
          </div>
        )}

        {/* Дайджест */}
        {digest && (
          <div className="card" style={{ borderLeft: '2.5px solid #FD6220', borderRadius: '0 13px 13px 0' }}>
            <div className="section-label">Дайджест</div>
            <p className="text-[9px] font-medium text-[#3C3C43] leading-relaxed line-clamp-3">{digest.content}</p>
            <Link href="/digest" className="text-[9px] font-bold text-[#FD6220] mt-1 block">Читать →</Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
