'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { getAge, formatRelative, EVENT_TYPES } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

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

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [pet, setPet] = useState<any>(null)
  const [checkin, setCheckin] = useState<any>(null)
  const [lastEvent, setLastEvent] = useState<any>(null)
  const [digest, setDigest] = useState<any>(null)
  const [weight, setWeight] = useState<any>(null)
  const [meds, setMeds] = useState<any[]>([])

  const today = format(new Date(), 'yyyy-MM-dd')

  const loadData = useCallback(async () => {
    const { data: p } = await supabase.from('pets').select('*').limit(1).single()
    if (!p) { setLoading(false); return }
    setPet(p)

    const [c, ev, dg, wt, md] = await Promise.all([
      supabase.from('daily_checkins').select('*').eq('pet_id', p.id).eq('date', today).maybeSingle(),
      supabase.from('health_events').select('*').eq('pet_id', p.id).order('occurred_at', { ascending: false }).not('event_type', 'like', 'test_%').limit(1),
      supabase.from('ai_digests').select('*').eq('pet_id', p.id).order('created_at', { ascending: false }).limit(1),
      supabase.from('weight_log').select('*').eq('pet_id', p.id).order('measured_at', { ascending: false }).limit(1),
      supabase.from('medications').select('*').eq('pet_id', p.id).is('ended_at', null).order('name'),
    ])

    setCheckin(c.data || null)
    setLastEvent(ev.data?.[0] || null)
    setDigest(dg.data?.[0] || null)
    setWeight(wt.data?.[0] || null)
    setMeds(md.data || [])
    setLoading(false)
  }, [today])

  // Загружаем при монтировании
  useEffect(() => {
    loadData()
  }, [loadData])

  // Перезагружаем при возвращении на страницу (visibility change)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [loadData])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
      <div className="text-center">
        <div className="text-4xl mb-3">🐱</div>
        <p className="text-sm text-[#8E8E93] font-medium">Загружаем...</p>
      </div>
    </div>
  )

  if (!pet) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-[#F2F2F7]">
      <div className="text-5xl">🐱</div>
      <h1 className="text-xl font-bold text-center text-[#1C1C1E]">Добро пожаловать в myvet</h1>
      <p className="text-sm text-[#8E8E93] text-center">Начните с добавления вашего питомца</p>
      <Link href="/pet" className="bg-[#FD6220] text-white font-bold rounded-xl py-3 px-8 text-sm">
        Добавить питомца
      </Link>
    </div>
  )

  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white sticky top-0 z-10">
        <TopBar petName={pet.name} />
      </div>

      <div className="flex-1 px-3 py-3 flex flex-col gap-3">
        <p className="text-[12px] font-bold text-[#1C1C1E] capitalize">{todayStr}</p>

        {/* Профиль питомца */}
        <div className="bg-[#FFF4EF] rounded-[13px] border border-[#FDD5C0] p-[10px_11px]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FD6220] flex items-center justify-center text-xl flex-shrink-0">🐱</div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold text-[#1C1C1E]">{pet.name}</div>
              <div className="text-[9px] font-semibold text-[#FD6220] truncate">{pet.diagnoses || 'Диагноз не указан'}</div>
            </div>
            <Link href="/pet" className="text-[9px] font-bold text-[#FD6220] bg-white px-2 py-1 rounded-[6px] border border-[#FDD5C0] flex-shrink-0">
              Изменить
            </Link>
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
          <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
            <div className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2">Текущие препараты</div>
            {meds.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-1.5 py-1.5 ${i < meds.length - 1 ? 'border-b border-[#F2F2F7]' : ''}`}>
                <span className="text-[9px] font-medium text-[#3C3C43] flex-1">{m.name}</span>
                <span className="text-[9px] font-bold text-[#FD6220]">{m.dose_amount}{m.dose_unit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Чек-ин — проверяем по дате */}
        {checkin ? (
          <div className="bg-white rounded-[13px] border border-[#C6EFD0] p-[10px_11px]" style={{ background: '#F4FFF7' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide">Чек-ин сегодня</div>
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
          <div className="rounded-[13px] p-[10px_11px]" style={{ background: '#FFF4EF', border: '1.5px dashed #FD6220' }}>
            <div className="text-[8px] font-bold text-[#FD6220] uppercase tracking-wide mb-1.5">Чек-ин сегодня</div>
            <p className="text-[9px] font-semibold text-[#FD6220] mb-2">Ещё не заполнен</p>
            <Link href="/checkin" className="block w-full bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] text-center">
              Заполнить чек-ин
            </Link>
          </div>
        )}

        {/* Последнее событие */}
        {lastEvent && (
          <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
            <div className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Последнее событие</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${DIR_DOT[lastEvent.direction]}`} />
              <div className="flex-1">
                <div className="text-[10px] font-bold text-[#1C1C1E]">{EVENT_TYPES.find(t => t.key === lastEvent.event_type)?.label || lastEvent.event_type}</div>
                <div className="text-[8px] text-[#8E8E93]">{formatRelative(lastEvent.occurred_at)} · {lastEvent.identifier}</div>
              </div>
            </div>
          </div>
        )}

        {/* Дайджест */}
        {digest && (
          <div className="bg-white rounded-[13px] p-[10px_11px]" style={{ borderLeft: '2.5px solid #FD6220', border: '0.5px solid #E5E5EA', borderLeftWidth: '2.5px', borderLeftColor: '#FD6220' }}>
            <div className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Дайджест</div>
            <p className="text-[9px] font-medium text-[#3C3C43] leading-relaxed line-clamp-3">{digest.content}</p>
            <Link href="/digest" className="text-[9px] font-bold text-[#FD6220] mt-1 block">Читать →</Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
