'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cn, EVENT_TYPES, generateEventId } from '@/lib/utils'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 justify-center py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('h-1.5 rounded-full transition-all', i === current ? 'w-4 bg-[#FD6220]' : 'w-1.5 bg-[#E5E5EA]')} />
      ))}
    </div>
  )
}

type AuraValue = 'yes' | 'no' | 'unknown' | ''

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [petId, setPetId] = useState<string | null>(null)
  const [petName, setPetName] = useState('PET')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [identifier, setIdentifier] = useState('')

  const [eventType, setEventType] = useState('')
  const [customName, setCustomName] = useState('')
  const [direction, setDirection] = useState<'negative' | 'neutral' | 'positive'>('negative')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [durationMin, setDurationMin] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [aura, setAura] = useState<AuraValue>('')
  const [obsBefore, setObsBefore] = useState('')
  const [description, setDescription] = useState('')
  const [postIctalType, setPostIctalType] = useState('')
  const [postIctalNotes, setPostIctalNotes] = useState('')
  const [obsAfter, setObsAfter] = useState('')

  const isSeizure = eventType === 'seizure'
  const isOther = eventType === 'other'
  const selectedType = EVENT_TYPES.find(t => t.key === eventType)

  useEffect(() => {
    supabase.from('pets').select('id,name').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); setPetName(data.name) }
    })
  }, [])

  async function save() {
    if (!petId) return
    setSaving(true)
    const occurred_at = new Date(`${date}T${time}`).toISOString()
    const durationSecs = isSeizure ? (durationMin * 60 + durationSec) || null : null

    const { count } = await supabase.from('health_events')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', petId)
      .gte('occurred_at', `${date}T00:00:00`)

    const seq = (count || 0) + 1
    const id = generateEventId(petName, new Date(date), seq)
    setIdentifier(id)

    const finalType = isOther ? customName : eventType
    const finalDir = isOther ? direction : ((selectedType?.direction as 'negative' | 'neutral' | 'positive') || 'neutral')

    // Конвертируем aura в boolean или null
    let hadAura: boolean | null = null
    if (isSeizure) {
      if (aura === 'yes') hadAura = true
      else if (aura === 'no') hadAura = false
      else hadAura = null // 'unknown' или не выбрано
    }

    await supabase.from('health_events').insert({
      pet_id: petId,
      identifier: id,
      event_type: finalType,
      direction: finalDir,
      occurred_at,
      duration_sec: durationSecs,
      had_aura: hadAura,
      observations_before: obsBefore || null,
      description: description || null,
      post_ictal_type: isSeizure && postIctalType ? postIctalType : null,
      post_ictal_notes: isSeizure && postIctalType === 'atypical' ? postIctalNotes || null : null,
      observations_after: obsAfter || null,
    })

    setSaving(false)
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F2F2F7]">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center">
        <Check size={28} className="text-white" />
      </div>
      <p className="font-bold text-[#1C1C1E]">Событие сохранено</p>
      {identifier && <p className="text-[10px] text-[#8E8E93] font-mono">{identifier}</p>}
      <button onClick={() => router.push('/events')}
        className="bg-[#FD6220] text-white font-bold rounded-xl py-3 px-8 text-sm mt-2">
        Перейти к событиям
      </button>
    </div>
  )

  const TapBtn = ({ val, label, current, onSelect, color }: { val: string; label: string; current: string; onSelect: (v: string) => void; color?: string }) => (
    <button onClick={() => onSelect(val)}
      className={cn('rounded-[8px] py-2 px-1 text-center border-[1.5px] cursor-pointer',
        current === val ? 'border-[#FD6220] bg-[#FFF4EF]' : 'border-[#E5E5EA] bg-white')}>
      <span className={cn('text-[8px] font-semibold block', current === val ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-4">
      <div className="bg-white flex items-center justify-between px-3 py-2">
        <button onClick={() => step > 0 ? setStep(step - 1) : router.push('/events')}
          className="text-[#FD6220] text-[11px] font-bold">
          {step > 0 ? '‹ Назад' : '‹ События'}
        </button>
        <span className="text-[11px] font-bold text-[#1C1C1E]">
          Шаг {step + 1} из 3
        </span>
        <button onClick={() => router.push('/events')}
          className="w-6 h-6 rounded-[7px] bg-[#F2F2F7] flex items-center justify-center">
          <X size={12} className="text-[#8E8E93]" />
        </button>
      </div>

      <div className="px-3 pt-2">
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">
          {step === 0 ? 'Тип события' : step === 1 ? 'Детали' : 'Описание'}
        </h1>
        <StepDots current={step} total={3} />
      </div>

      <div className="px-3 flex flex-col gap-3 pb-4">

        {step === 0 && (
          <>
            {[
              { label: 'Тревожные', color: 'text-red-500', types: EVENT_TYPES.filter(t => t.direction === 'negative') },
              { label: 'Нейтральные', color: 'text-orange-400', types: EVENT_TYPES.filter(t => t.direction === 'neutral' && t.key !== 'other') },
              { label: 'Позитивные', color: 'text-green-500', types: EVENT_TYPES.filter(t => t.direction === 'positive') },
            ].map(group => (
              <div key={group.label} className="bg-white rounded-[13px] border border-[#E5E5EA]" style={{ padding: '4px 0' }}>
                <div className={`px-3 py-1.5 text-[8px] font-bold uppercase tracking-wide ${group.color}`}>{group.label}</div>
                {group.types.map(t => (
                  <button key={t.key}
                    onClick={() => { setEventType(t.key); setDirection(t.direction as 'negative' | 'neutral' | 'positive') }}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F2F2F7] last:border-0',
                      eventType === t.key ? 'bg-[#FFF8F6]' : '')}>
                    <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0',
                      eventType === t.key ? 'bg-[#FFF4EF]' : 'bg-[#F2F2F7]')}>{t.emoji}</div>
                    <span className="text-[10px] font-semibold text-[#1C1C1E] flex-1 text-left">{t.label}</span>
                    <span className={cn('text-[11px] font-bold', eventType === t.key ? 'text-[#FD6220]' : 'text-[#E5E5EA]')}>✓</span>
                  </button>
                ))}
              </div>
            ))}

            <div className="bg-white rounded-[13px] border border-[#E5E5EA]" style={{ padding: '4px 0' }}>
              <div className="px-3 py-1.5 text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide">Другое</div>
              <button onClick={() => setEventType('other')}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2.5', eventType === 'other' ? 'bg-[#FFF8F6]' : '')}>
                <div className="w-7 h-7 rounded-[8px] bg-[#F2F2F7] flex items-center justify-center text-sm">📝</div>
                <span className="text-[10px] font-semibold text-[#1C1C1E] flex-1 text-left">Другое...</span>
                <span className={cn('text-[11px] font-bold', eventType === 'other' ? 'text-[#FD6220]' : 'text-[#E5E5EA]')}>✓</span>
              </button>
            </div>

            {isOther && (
              <div className="card">
                <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Название события</p>
                <input value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Опиши событие..."
                  className="w-full border-[1.5px] border-[#FD6220] bg-[#FFF4EF] rounded-[8px] p-2.5 text-[11px] font-semibold outline-none mb-3" />
                <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Направление</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['negative', 'neutral', 'positive'] as const).map(d => (
                    <button key={d} onClick={() => setDirection(d)}
                      className={cn('rounded-[8px] py-2 text-[8px] font-semibold border-[1.5px]',
                        direction === d ? 'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]' : 'border-[#E5E5EA] text-[#8E8E93]')}>
                      {d === 'negative' ? 'Тревожное' : d === 'neutral' ? 'Нейтральное' : 'Позитивное'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setStep(1)} disabled={!eventType || (isOther && !customName)}
              className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] w-full disabled:opacity-50">
              Далее →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Когда произошло</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Дата</p>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[9px] font-semibold outline-none focus:border-[#FD6220]" />
                </div>
                <div>
                  <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Время</p>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[9px] font-semibold outline-none focus:border-[#FD6220]" />
                </div>
              </div>
            </div>

            {isSeizure && (
              <>
                <div className="card">
                  <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Длительность</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Минуты</p>
                      <div className="flex items-center justify-center gap-2 border border-[#E5E5EA] rounded-[8px] py-2">
                        <button onClick={() => setDurationMin(Math.max(0, durationMin - 1))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">−</button>
                        <span className="text-[11px] font-bold w-6 text-center">{durationMin}</span>
                        <button onClick={() => setDurationMin(durationMin + 1)} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Секунды</p>
                      <div className="flex items-center justify-center gap-2 border border-[#E5E5EA] rounded-[8px] py-2">
                        <button onClick={() => setDurationSec(Math.max(0, durationSec - 5))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">−</button>
                        <span className="text-[11px] font-bold w-6 text-center">{durationSec}</span>
                        <button onClick={() => setDurationSec(Math.min(59, durationSec + 5))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                  <div className="text-[7px] font-bold text-[#FD6220] inline-block mb-1.5 bg-white px-1.5 py-0.5 rounded-[4px]">Только для приступов</div>
                  <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Аура</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <TapBtn val="yes" label="Да" current={aura} onSelect={(v) => setAura(v as AuraValue)} />
                    <TapBtn val="no" label="Нет" current={aura} onSelect={(v) => setAura(v as AuraValue)} />
                    <TapBtn val="unknown" label="Не знаю" current={aura} onSelect={(v) => setAura(v as AuraValue)} />
                  </div>
                </div>
              </>
            )}

            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Наблюдения до события</p>
              <textarea value={obsBefore} onChange={e => setObsBefore(e.target.value)}
                placeholder="Что предшествовало..." rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep(0)} className="bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-2.5 text-[10px]">← Назад</button>
              <button onClick={() => setStep(2)} className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px]">Далее →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Описание события</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Как проходило, что наблюдала..." rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            {isSeizure && (
              <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                <div className="text-[7px] font-bold text-[#FD6220] inline-block mb-1.5 bg-white px-1.5 py-0.5 rounded-[4px]">Только для приступов</div>
                <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Постиктальная фаза</p>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <TapBtn val="standard" label="Стандартная (поела)" current={postIctalType} onSelect={setPostIctalType} />
                  <TapBtn val="atypical" label="Нетипичная" current={postIctalType} onSelect={setPostIctalType} />
                </div>
                {postIctalType === 'atypical' && (
                  <textarea value={postIctalNotes} onChange={e => setPostIctalNotes(e.target.value)}
                    placeholder="Дезориентация, агрессия, слепота..." rows={2}
                    className="w-full border border-[#FDD5C0] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none bg-white" />
                )}
              </div>
            )}

            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Наблюдения после события</p>
              <textarea value={obsAfter} onChange={e => setObsAfter(e.target.value)}
                placeholder="Что происходило после..." rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            <div className="card" style={{ background: '#F9F9F9' }}>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Идентификатор</p>
              <p className="text-[11px] font-bold text-[#FD6220] font-mono">
                {petName.toUpperCase().slice(0, 4)}-{date}-XXX
              </p>
              <p className="text-[7px] text-[#8E8E93] mt-0.5">Присвоится при сохранении</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep(1)} className="bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-2.5 text-[10px]">← Назад</button>
              <button onClick={save} disabled={saving} className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] disabled:opacity-50">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
