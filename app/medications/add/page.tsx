'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Check, Minus, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface ScheduleEntry { time: string; dose: string }

export default function AddMedicationPage() {
  const router = useRouter()
  const [petId, setPetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [name, setName] = useState('')
  const [doseAmount, setDoseAmount] = useState('')
  const [doseUnit, setDoseUnit] = useState('мг')
  const [startedAt, setStartedAt] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endedAt, setEndedAt] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([{ time: '08:00', dose: '' }])

  useEffect(() => {
    supabase.from('pets').select('id').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '').limit(1).single().then(({ data }) => {
      if (data) setPetId(data.id)
    })
  }, [])

  function addSchedule() {
    setSchedules([...schedules, { time: '12:00', dose: '' }])
  }

  function removeSchedule(i: number) {
    setSchedules(schedules.filter((_, idx) => idx !== i))
  }

  function updateSchedule(i: number, field: 'time' | 'dose', val: string) {
    setSchedules(schedules.map((s, idx) => idx === i ? { ...s, [field]: val } : s))
  }

  async function save() {
    if (!petId || !name || schedules.length === 0) return
    setSaving(true)

    const { data: med } = await supabase.from('medications').insert({
      pet_id: petId,
      name,
      dose_amount: doseAmount ? parseFloat(doseAmount) : null,
      dose_unit: doseUnit,
      started_at: startedAt,
      ended_at: endedAt || null,
      change_note: changeNote || null,
    }).select().single()

    if (med) {
      for (const s of schedules) {
        await supabase.from('medication_schedules').insert({
          medication_id: med.id,
          pet_id: petId,
          scheduled_time: s.time + ':00',
          dose_amount: s.dose ? parseFloat(s.dose) : parseFloat(doseAmount) || null,
          dose_unit: doseUnit,
        })
      }
    }

    setDone(true)
    setTimeout(() => router.push('/medications'), 1200)
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center">
        <Check size={28} className="text-white" />
      </div>
      <p className="font-bold">{name} добавлен</p>
      <p className="text-[10px] text-[#8E8E93]">Появится в трекере на каждый день</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-4">
      <div className="bg-white flex items-center justify-between px-3 py-2">
        <button onClick={() => router.back()} className="text-[#FD6220] text-[11px] font-bold">Отменить</button>
        <span className="text-[12px] font-bold text-[#1C1C1E]">Новый препарат</span>
        <button onClick={save} disabled={!name || saving} className="text-[#FD6220] text-[11px] font-bold disabled:opacity-40">Готово</button>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">

        {/* Основная информация */}
        <div className="card">
          <div className="mb-3">
            <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Название *</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Кеппра"
              className="w-full border-[1.5px] border-[#FD6220] bg-[#FFF4EF] rounded-[8px] p-2.5 text-[11px] font-semibold outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Доза</p>
              <input value={doseAmount} onChange={e => setDoseAmount(e.target.value)}
                type="number" placeholder="200"
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-semibold outline-none focus:border-[#FD6220]" />
            </div>
            <div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Единица</p>
              <select value={doseUnit} onChange={e => setDoseUnit(e.target.value)}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-semibold outline-none focus:border-[#FD6220] bg-white">
                <option>мг</option>
                <option>мг/кг</option>
                <option>мл</option>
                <option>таб</option>
                <option>кап</option>
              </select>
            </div>
          </div>
        </div>

        {/* Расписание приёмов */}
        <div className="card">
          <p className="section-title mb-3">Время приёмов</p>
          {schedules.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-2 border-b border-[#F2F2F7]">
              <button onClick={() => removeSchedule(i)}
                className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <Minus size={10} className="text-white" />
              </button>
              <input type="time" value={s.time} onChange={e => updateSchedule(i, 'time', e.target.value)}
                className="bg-[#F2F2F7] border-none rounded-[6px] px-2 py-1 text-[11px] font-bold text-[#1C1C1E] outline-none" />
              <input value={s.dose || doseAmount} onChange={e => updateSchedule(i, 'dose', e.target.value)}
                placeholder={doseAmount || 'доза'}
                type="number"
                className="flex-1 border border-[#E5E5EA] rounded-[6px] p-1.5 text-[9px] font-semibold outline-none focus:border-[#FD6220]" />
              <span className="text-[9px] font-bold text-[#FD6220]">{doseUnit}</span>
            </div>
          ))}
          <button onClick={addSchedule} className="flex items-center gap-1.5 mt-2 py-1.5">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Plus size={10} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-[#FD6220]">Добавить время</span>
          </button>
        </div>

        {/* Даты */}
        <div className="card">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Начало курса</p>
              <input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[9px] font-semibold outline-none focus:border-[#FD6220]" />
            </div>
            <div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Окончание</p>
              <input type="date" value={endedAt} onChange={e => setEndedAt(e.target.value)}
                placeholder="Бессрочно"
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[9px] font-semibold outline-none focus:border-[#FD6220]" />
            </div>
          </div>
        </div>

        {/* Комментарий */}
        <div className="card">
          <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Причина изменения / комментарий</p>
          <input value={changeNote} onChange={e => setChangeNote(e.target.value)}
            placeholder="Назначил невролог..."
            className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium outline-none focus:border-[#FD6220]" />
        </div>

        <div className="card" style={{ background: '#F9F9F9' }}>
          <p className="text-[8px] font-medium text-[#8E8E93] leading-relaxed">
            После сохранения препарат появится в трекере на каждый день в указанное время. Прошлые изменения дозировки сохраняются в архиве.
          </p>
        </div>

        <button onClick={save} disabled={!name || saving} className="btn-brand disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Сохранить препарат'}
        </button>
      </div>
    </div>
  )
}
