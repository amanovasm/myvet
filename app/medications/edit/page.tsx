'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePet } from '@/lib/pet-context'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Trash2, Plus, Clock } from 'lucide-react'
import { format } from 'date-fns'

function EditMedInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { petId } = usePet()
  const medId = searchParams.get('id')
  const isNew = !medId

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showConfirmEnd, setShowConfirmEnd] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [note, setNote] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [doseAmount, setDoseAmount] = useState('')
  const [doseUnit, setDoseUnit] = useState('мг')
  const [schedules, setSchedules] = useState<{time: string, dose: string}[]>([
    { time: '08:00', dose: '' }
  ])
  const [oldDose, setOldDose] = useState<{amount: number, unit: string} | null>(null)

  useEffect(() => {
    if (!medId) return
    async function load() {
      const { data: med } = await supabase.from('medications').select('*').eq('id', medId).single()
      if (!med) { router.push('/medications'); return }
      setName(med.name)
      setDoseAmount(String(med.dose_amount || ''))
      setDoseUnit(med.dose_unit || 'мг')
      setOldDose({ amount: med.dose_amount, unit: med.dose_unit })

      const { data: schs } = await supabase.from('medication_schedules').select('*').eq('medication_id', medId).order('scheduled_time')
      if (schs && schs.length > 0) {
        setSchedules(schs.map((s: any) => ({
          time: s.scheduled_time.slice(0, 5),
          dose: String(s.dose_amount || med.dose_amount || '')
        })))
      }
      setLoading(false)
    }
    load()
  }, [medId])

  async function save() {
    if (!petId || !name) return
    setSaving(true)

    const doseNum = parseFloat(doseAmount) || 0
    const today = format(new Date(), 'yyyy-MM-dd')

    if (isNew) {
      // Create new medication
      const { data: med } = await supabase.from('medications').insert({
        pet_id: petId,
        name,
        dose_amount: doseNum,
        dose_unit: doseUnit,
        started_at: today,
        change_note: note || null,
      }).select().single()

      if (med) {
        // Create schedules
        for (const sch of schedules) {
          if (!sch.time) continue
          await supabase.from('medication_schedules').insert({
            medication_id: med.id,
            pet_id: petId,
            scheduled_time: sch.time,
            dose_amount: parseFloat(sch.dose) || doseNum,
            dose_unit: doseUnit,
          })
        }
        // Log creation
        await supabase.from('medication_changes').insert({
          pet_id: petId,
          medication_id: med.id,
          change_type: 'created',
          new_dose_amount: doseNum,
          new_dose_unit: doseUnit,
          note: note || null,
        })
      }
    } else {
      // Update existing
      await supabase.from('medications').update({
        name,
        dose_amount: doseNum,
        dose_unit: doseUnit,
        change_note: note || null,
      }).eq('id', medId)

      // Delete old schedules and recreate
      await supabase.from('medication_schedules').delete().eq('medication_id', medId)
      for (const sch of schedules) {
        if (!sch.time) continue
        await supabase.from('medication_schedules').insert({
          medication_id: medId,
          pet_id: petId,
          scheduled_time: sch.time,
          dose_amount: parseFloat(sch.dose) || doseNum,
          dose_unit: doseUnit,
        })
      }

      // Log change if dose changed
      const doseChanged = oldDose && (oldDose.amount !== doseNum || oldDose.unit !== doseUnit)
      await supabase.from('medication_changes').insert({
        pet_id: petId,
        medication_id: medId,
        change_type: doseChanged ? 'dose_changed' : 'schedule_changed',
        old_dose_amount: oldDose?.amount || null,
        old_dose_unit: oldDose?.unit || null,
        new_dose_amount: doseNum,
        new_dose_unit: doseUnit,
        note: note || null,
      })
    }

    setSaving(false)
    router.push('/medications')
  }

  async function endCourse() {
    if (!medId || !petId) return
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('medications').update({ ended_at: today }).eq('id', medId)
    await supabase.from('medication_changes').insert({
      pet_id: petId,
      medication_id: medId,
      change_type: 'completed',
      note: note || null,
    })
    router.push('/medications')
  }

  async function deleteMed() {
    if (!medId || !petId) return
    await supabase.from('medication_changes').insert({
      pet_id: petId,
      medication_id: medId,
      change_type: 'deleted',
      note: note || null,
    })
    await supabase.from('medications').delete().eq('id', medId)
    router.push('/medications')
  }

  if (loading) return <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] text-sm">Загружаем...</div>

  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-[52px] pb-[72px]">
      <TopBar showBack backHref="/medications" backLabel="Лечение" title={isNew ? 'Новый препарат' : 'Изменить препарат'} />

      <div className="px-3 pt-4 flex flex-col gap-3">

        {/* Основная форма */}
        <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Название *</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Леветирацетам"
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Доза</p>
              <input type="number" value={doseAmount} onChange={e => setDoseAmount(e.target.value)} placeholder="200"
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Единица</p>
              <select value={doseUnit} onChange={e => setDoseUnit(e.target.value)}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none">
                {['мг', 'мкг', 'мл', 'г', 'таб', 'кап'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Расписание */}
        <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-4">
          <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-3">Расписание приёмов</p>
          <div className="flex flex-col gap-2">
            {schedules.map((sch, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#F2F2F7] rounded-[8px] px-3 py-2.5">
                <Clock size={14} className="text-[#8E8E93] flex-shrink-0" />
                <input type="time" value={sch.time} onChange={e => {
                  const s = [...schedules]; s[i].time = e.target.value; setSchedules(s)
                }} className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium" />
                <input type="number" value={sch.dose} onChange={e => {
                  const s = [...schedules]; s[i].dose = e.target.value; setSchedules(s)
                }} placeholder={doseAmount || '0'} className="w-14 bg-transparent border-none outline-none text-[12px] text-[#8E8E93] text-right" />
                <span className="text-[11px] text-[#8E8E93]">{doseUnit}</span>
                {schedules.length > 1 && (
                  <button onClick={() => setSchedules(schedules.filter((_, j) => j !== i))}>
                    <Trash2 size={13} className="text-[#8E8E93]" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setSchedules([...schedules, { time: '12:00', dose: doseAmount }])}
              className="flex items-center gap-2 border border-dashed border-[#FD6220] rounded-[8px] px-3 py-2.5 text-[12px] font-bold text-[#FD6220]">
              <Plus size={13} /> Добавить приём
            </button>
          </div>
        </div>

        {/* Причина изменения */}
        {!isNew && (
          <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-4">
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Причина изменения (опционально)</p>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Врач скорректировал дозу"
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
          </div>
        )}

        <button onClick={save} disabled={saving || !name}
          className="w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3.5 text-[13px] disabled:opacity-50">
          {saving ? 'Сохраняем...' : isNew ? 'Добавить препарат' : 'Сохранить изменения'}
        </button>

        {!isNew && (
          <>
            <button onClick={() => setShowConfirmEnd(true)}
              className="w-full bg-white border border-[#E5E5EA] text-[#1C1C1E] font-bold rounded-[12px] py-3.5 text-[13px]">
              Завершить курс
            </button>
            <button onClick={() => setShowConfirmDelete(true)}
              className="w-full bg-white border border-red-200 text-red-500 font-bold rounded-[12px] py-3.5 text-[13px]">
              Удалить препарат
            </button>
          </>
        )}
      </div>

      {/* Модал завершения */}
      {showConfirmEnd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end p-4" onClick={() => setShowConfirmEnd(false)}>
          <div className="bg-white rounded-[16px] p-5 w-full" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[#1C1C1E] mb-1">Завершить курс?</p>
            <p className="text-[12px] text-[#8E8E93] mb-4">Препарат перейдёт в архив. Историю изменений сохраним.</p>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Причина (опционально)"
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[12px] outline-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmEnd(false)}
                className="flex-1 bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-3 text-[13px]">Отмена</button>
              <button onClick={endCourse}
                className="flex-1 bg-[#FD6220] text-white font-bold rounded-[10px] py-3 text-[13px]">Завершить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модал удаления */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end p-4" onClick={() => setShowConfirmDelete(false)}>
          <div className="bg-white rounded-[16px] p-5 w-full" onClick={e => e.stopPropagation()}>
            <p className="text-[15px] font-bold text-[#1C1C1E] mb-1">Удалить препарат?</p>
            <p className="text-[12px] text-[#8E8E93] mb-4">История приёмов удалится навсегда. Это нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirmDelete(false)}
                className="flex-1 bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-3 text-[13px]">Отмена</button>
              <button onClick={deleteMed}
                className="flex-1 bg-red-500 text-white font-bold rounded-[10px] py-3 text-[13px]">Удалить</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function EditMedPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#F2F2F7]" />}><EditMedInner /></Suspense>
}
