'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { Check } from 'lucide-react'

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
  const [petId, setPetId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [doses, setDoses] = useState<Record<string, DoseStatus[]>>({})
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<string | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 3 - i)
    return { date: format(d, 'yyyy-MM-dd'), day: format(d, 'EEEEEE', { locale: ru }), num: format(d, 'd') }
  })

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); loadDoses(data.id, format(new Date(), 'yyyy-MM-dd')) }
      else setLoading(false)
    })
  }, [])

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
          scheduleId: sch.id,
          medId: med.id,
          medName: med.name,
          doseAmount: sch.dose_amount || med.dose_amount,
          doseUnit: sch.dose_unit || med.dose_unit || 'мг',
          scheduledTime: timeKey,
          takenAt: existing?.taken_at,
        }
        if (!grouped[timeKey]) grouped[timeKey] = []
        grouped[timeKey].push(item)
      }
    }
    setDoses(grouped)
    setLoading(false)
  }

  async function markDose(dose: DoseStatus) {
    if (!petId || dose.takenAt) return
    setMarking(dose.scheduleId)

    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId,
        medicationId: dose.medId,
        scheduleId: dose.scheduleId,
        doseDate: selectedDate,
        scheduledTime: dose.scheduledTime,
      })
    })

    const json = await res.json()
    if (json.ok) {
      await loadDoses(petId, selectedDate)
    }
    setMarking(null)
  }

  function changeDate(date: string) {
    setSelectedDate(date)
    if (petId) loadDoses(petId, date)
  }

  const sortedTimes = Object.keys(doses).sort()

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>

      <div className="bg-white px-3 py-2 border-b border-[#F2F2F7]">
        <p className="text-[13px] font-bold text-[#1C1C1E] text-center mb-2">
          {format(new Date(selectedDate + 'T12:00:00'), 'EEEE, d MMMM', { locale: ru })}
        </p>
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
        <Link href="/medications/add"
          className="block w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3 text-[11px] text-center">
          + Добавить лекарство
        </Link>

        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>
        ) : sortedTimes.length === 0 ? (
          <div className="text-center py-12 text-[#8E8E93]">
            <p className="text-4xl mb-3">💊</p>
            <p className="text-sm font-medium">Препаратов нет</p>
          </div>
        ) : (
          sortedTimes.map(time => (
            <div key={time}>
              <p className="text-[11px] font-bold text-[#1C1C1E] mb-1.5 px-1">{time}</p>
              <div className="flex flex-col gap-1.5">
                {doses[time].map(dose => (
                  <div key={dose.scheduleId}
                    className={cn('rounded-[11px] p-2.5 flex items-center gap-2.5 border',
                      dose.takenAt ? 'bg-[#F4FFF7] border-[#C6EFD0]' : 'bg-[#F0F7FF] border-[#D0E8FF]')}>
                    <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0',
                      dose.takenAt ? 'bg-[#C6EFD0]' : 'bg-[#D0E8FF]')}>💊</div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold text-[#1C1C1E]">{dose.medName}</div>
                      <div className="text-[8px] text-[#8E8E93]">
                        {dose.doseAmount} {dose.doseUnit}
                        {dose.takenAt
                          ? ` · дано в ${format(new Date(dose.takenAt), 'HH:mm')}`
                          : ' · ещё не отмечено'}
                      </div>
                    </div>
                    {dose.takenAt ? (
                      <div className="w-6 h-6 rounded-full bg-[#C6EFD0] flex items-center justify-center flex-shrink-0">
                        <Check size={12} className="text-green-600" />
                      </div>
                    ) : (
                      <button
                        onClick={() => markDose(dose)}
                        disabled={marking === dose.scheduleId}
                        className="w-6 h-6 rounded-full bg-[#E8F0FE] flex items-center justify-center flex-shrink-0 text-[#185FA5] font-bold text-lg disabled:opacity-50">
                        +
                      </button>
                    )}
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
