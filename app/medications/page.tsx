'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePet } from '@/lib/pet-context'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { Check, ChevronRight, Plus } from 'lucide-react'

interface DoseStatus {
  scheduleId: string
  medId: string
  medName: string
  doseAmount: number
  doseUnit: string
  scheduledTime: string
  takenAt?: string
}

export default function MedicationsPage() {
  const { petId } = usePet()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [doses, setDoses] = useState<Record<string, DoseStatus[]>>({})
  const [activeMeds, setActiveMeds] = useState<any[]>([])
  const [endedMeds, setEndedMeds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)
  const [tab, setTab] = useState<'today' | 'all'>('today')

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 3 - i)
    return { date: format(d, 'yyyy-MM-dd'), day: format(d, 'EEEEEE', { locale: ru }), num: format(d, 'd') }
  })

  useEffect(() => {
    if (petId) { loadDoses(petId, today); loadMeds(petId) }
    else setLoading(false)
  }, [petId])

  async function loadMeds(pid: string) {
    const { data: all } = await supabase.from('medications').select('*').eq('pet_id', pid).order('started_at', { ascending: false })
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    setActiveMeds((all || []).filter((m: any) => !m.ended_at || m.ended_at >= todayStr))
    setEndedMeds((all || []).filter((m: any) => m.ended_at && m.ended_at < todayStr))
  }

  async function loadDoses(pid: string, date: string) {
    setLoading(true)
    const res = await fetch(`/api/medications?petId=${pid}&date=${date}`)
    const { meds, schedules, taken } = await res.json()
    const grouped: Record<string, DoseStatus[]> = {}
    for (const med of meds || []) {
      const medSchedules = (schedules || []).filter((s: any) => s.medication_id === med.id)
      for (const sch of medSchedules) {
        const timeKey = sch.scheduled_time.slice(0, 5)
        const existing = (taken || []).find((t: any) => t.schedule_id === sch.id)
        const item: DoseStatus = {
          scheduleId: sch.id, medId: med.id, medName: med.name,
          doseAmount: sch.dose_amount || med.dose_amount,
          doseUnit: sch.dose_unit || med.dose_unit || 'мг',
          scheduledTime: timeKey, takenAt: existing?.taken_at,
        }
        if (!grouped[timeKey]) grouped[timeKey] = []
        grouped[timeKey].push(item)
      }
    }
    setDoses(grouped)
    setLoading(false)
  }

  async function toggleDose(item: DoseStatus) {
    if (!petId) return
    setMarking(item.scheduleId)
    if (item.takenAt) {
      await supabase.from('medication_doses').delete()
        .eq('schedule_id', item.scheduleId).eq('dose_date', selectedDate)
    } else {
      await supabase.from('medication_doses').upsert({
        pet_id: petId, medication_id: item.medId, schedule_id: item.scheduleId,
        dose_date: selectedDate, scheduled_time: item.scheduledTime, taken_at: new Date().toISOString(),
      })
    }
    await loadDoses(petId, selectedDate)
    setMarking(null)
  }

  const sortedTimes = Object.keys(doses).sort()

  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-[52px] pb-[72px]">
      <TopBar />

      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#8E8E93]">Медицина</p>
          <h1 className="text-[20px] font-bold text-[#1C1C1E]">Лечение</h1>
        </div>
        <Link href="/medications/edit"
          className="flex items-center gap-1.5 bg-[#FD6220] text-white font-bold rounded-[10px] px-3 py-2 text-[11px]">
          <Plus size={13} /> Добавить
        </Link>
      </div>

      {/* Табы */}
      <div className="px-3 mb-3">
        <div className="bg-white rounded-[10px] border border-[#E5E5EA] p-0.5 flex">
          <button onClick={() => setTab('today')}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold', tab === 'today' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Сегодня
          </button>
          <button onClick={() => setTab('all')}
            className={cn('flex-1 rounded-[8px] py-1.5 text-[9px] font-bold', tab === 'all' ? 'bg-[#FD6220] text-white' : 'text-[#8E8E93]')}>
            Все препараты
          </button>
        </div>
      </div>

      {tab === 'today' ? (
        <div className="px-3 flex flex-col gap-3">
          {/* Скроллер дней */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {weekDays.map(d => (
              <button key={d.date} onClick={() => { setSelectedDate(d.date); if(petId) loadDoses(petId, d.date) }}
                className={cn('flex-shrink-0 flex flex-col items-center w-10 py-1.5 rounded-[8px] text-[9px]',
                  d.date === selectedDate ? 'bg-[#FD6220] text-white font-bold' : 'bg-white text-[#8E8E93] border border-[#E5E5EA]')}>
                <span>{d.day}</span>
                <span className="text-[11px] font-bold mt-0.5">{d.num}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
          ) : sortedTimes.length === 0 ? (
            <div className="text-center py-10 text-[#8E8E93]">
              <p className="text-3xl mb-2">💊</p>
              <p className="text-sm">Нет препаратов на этот день</p>
            </div>
          ) : (
            sortedTimes.map(time => (
              <div key={time}>
                <p className="text-[11px] font-bold text-[#8E8E93] mb-1.5">{time}</p>
                {doses[time].map(item => (
                  <button key={item.scheduleId} onClick={() => toggleDose(item)} disabled={marking === item.scheduleId}
                    className={cn('w-full flex items-center gap-3 bg-white rounded-[12px] border p-3 mb-2',
                      item.takenAt ? 'border-green-200 bg-green-50' : 'border-[#E5E5EA]')}>
                    <div className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      item.takenAt ? 'bg-green-500 border-green-500' : 'border-[#E5E5EA]')}>
                      {item.takenAt && <Check size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn('text-[13px] font-bold', item.takenAt ? 'text-green-700' : 'text-[#1C1C1E]')}>{item.medName}</p>
                      <p className="text-[11px] text-[#8E8E93]">{item.doseAmount} {item.doseUnit}</p>
                    </div>
                    {item.takenAt && <p className="text-[9px] text-green-600">принято</p>}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="px-3 flex flex-col gap-3">
          {/* Активные */}
          {activeMeds.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#FD6220] uppercase tracking-wide mb-2 px-1">Активные</p>
              <div className="flex flex-col gap-2">
                {activeMeds.map(med => (
                  <Link key={med.id} href={`/medications/edit?id=${med.id}`}
                    className="flex items-center gap-3 bg-white rounded-[12px] border border-[#E5E5EA] p-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[#FFF4EF] flex items-center justify-center flex-shrink-0 text-lg">💊</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[#1C1C1E]">{med.name}</p>
                      <p className="text-[11px] text-[#8E8E93]">{med.dose_amount} {med.dose_unit}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Завершённые */}
          {endedMeds.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2 px-1">Завершённые</p>
              <div className="flex flex-col gap-2">
                {endedMeds.map(med => (
                  <Link key={med.id} href={`/medications/edit?id=${med.id}`}
                    className="flex items-center gap-3 bg-[#F9F9F9] rounded-[12px] border border-[#E5E5EA] p-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F2F2F7] flex items-center justify-center flex-shrink-0 text-lg opacity-50">💊</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-[#8E8E93]">{med.name}</p>
                      <p className="text-[11px] text-[#C7C7CC]">Завершён {med.ended_at}</p>
                    </div>
                    <ChevronRight size={16} className="text-[#C7C7CC]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeMeds.length === 0 && endedMeds.length === 0 && (
            <div className="text-center py-12 text-[#8E8E93]">
              <p className="text-3xl mb-2">💊</p>
              <p className="text-sm">Нет препаратов</p>
              <Link href="/medications/edit" className="text-[#FD6220] text-[12px] font-bold mt-2 block">+ Добавить</Link>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
