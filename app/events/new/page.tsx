'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cn, EVENT_TYPES, generateEventId } from '@/lib/utils'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import Link from 'next/link'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 justify-center py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('h-1.5 rounded-full transition-all', i === current ? 'w-4 bg-[#FD6220]' : 'w-1.5 bg-[#E5E5EA]')} />
      ))}
    </div>
  )
}

function TapGrid2({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={cn('rounded-[8px] py-1.5 px-1 text-center border-[1.5px] border-[#E5E5EA] bg-white cursor-pointer',
            value === opt.value && 'border-[#FD6220] bg-[#FFF4EF]')}>
          <span className={cn('text-[8px] font-semibold', value === opt.value ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function NewEventPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [petId, setPetId] = useState<string | null>(null)
  const [petName, setPetName] = useState('PET')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [identifier, setIdentifier] = useState('')

  // Step 1
  const [eventType, setEventType] = useState('')
  const [customName, setCustomName] = useState('')
  const [direction, setDirection] = useState<'negative' | 'neutral' | 'positive'>('negative')

  // Step 2
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(format(new Date(), 'HH:mm'))
  const [durationMin, setDurationMin] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [hadAura, setHadAura] = useState<boolean | null>(null)
  const [obsBefore, setObsBefore] = useState('')

  // Step 3
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
    const durationSecs = (durationMin * 60) + durationSec || null

    const { count } = await supabase.from('health_events')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', petId)
      .gte('occurred_at', `${date}T00:00:00`)

    const seq = (count || 0) + 1
    const id = generateEventId(petName, new Date(date), seq)
    setIdentifier(id)

    const finalType = isOther ? customName : eventType
    const finalDir = isOther ? direction : (selectedType?.direction as 'negative' | 'neutral' | 'positive') || 'neutral'

    await supabase.from('health_events').insert({
      pet_id: petId,
      identifier: id,
      event_type: finalType,
      direction: finalDir,
      occurred_at,
      duration_sec: isSeizure ? durationSecs : null,
      had_aura: isSeizure ? hadAura : null,
      observations_before: obsBefore || null,
      description: description || null,
      post_ictal_type: isSeizure ? postIctalType || null : null,
      post_ictal_notes: isSeizure && postIctalType === 'atypical' ? postIctalNotes || null : null,
      observations_after: obsAfter || null,
    })

    setDone(true)
    setTimeout(() => router.push('/events'), 1200)
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center">
        <Check size={28} className="text-white" />
      </div>
      <p className="font-bold">Событие сохранено</p>
      {identifier && <p className="text-[10px] text-[#8E8E93]">{identifier}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-4">
      {/* Header */}
      <div className="bg-white flex items-center justify-between px-3 py-2">
        <button onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          className="text-[#FD6220] text-[11px] font-bold">
          {step > 0 ? '‹ Назад' : '‹ События'}
        </button>
        <span className="text-[11px] font-bold text-[#1C1C1E]">
          Шаг {step + 1} из 3{step > 0 && selectedType ? ` · ${isOther ? customName || 'Другое' : selectedType.label}` : ''}
        </span>
        <Link href="/events" className="w-6 h-6 rounded-[7px] bg-[#F2F2F7] flex items-center justify-center">
          <X size={12} className="text-[#8E8E93]" />
        </Link>
      </div>

      <div className="px-3 pt-2">
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">
          {step === 0 ? 'Тип события' : step === 1 ? 'Детали' : 'Описание'}
        </h1>
        <StepDots current={step} total={3} />
      </div>

      <div className="px-3 flex flex-col gap-3 pb-4">

        {/* STEP 1: Choose type */}
        {step === 0 && (
          <>
            {/* Тревожные */}
            <div className="card" style={{ padding: '4px 0' }}>
              <div className="px-3 py-1.5 text-[8px] font-bold text-red-500 uppercase tracking-wide">Тревожные</div>
              {EVENT_TYPES.filter(t => t.direction === 'negative').map(t => (
                <button key={t.key} onClick={() => { setEventType(t.key); setDirection('negative') }}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F2F2F7] last:border-0 transition-colors',
                    eventType === t.key ? 'bg-[#FFF8F6]' : '')}>
                  <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0',
                    eventType === t.key ? 'bg-[#FFF4EF]' : 'bg-[#F2F2F7]')}>{t.emoji}</div>
                  <span className="text-[10px] font-semibold text-[#1C1C1E] flex-1 text-left">{t.label}</span>
                  <span className={cn('text-[11px] font-bold', eventType === t.key ? 'text-[#FD6220]' : 'text-[#E5E5EA]')}>✓</span>
                </button>
              ))}
            </div>

            {/* Нейтральные */}
            <div className="card" style={{ padding: '4px 0' }}>
              <div className="px-3 py-1.5 text-[8px] font-bold text-orange-400 uppercase tracking-wide">Нейтральные</div>
              {EVENT_TYPES.filter(t => t.direction === 'neutral' && t.key !== 'other').map(t => (
                <button key={t.key} onClick={() => { setEventType(t.key); setDirection('neutral') }}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F2F2F7] last:border-0',
                    eventType === t.key ? 'bg-[#FFF8F6]' : '')}>
                  <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0',
                    eventType === t.key ? 'bg-[#FFF4EF]' : 'bg-[#F2F2F7]')}>{t.emoji}</div>
                  <span className="text-[10px] font-semibold text-[#1C1C1E] flex-1 text-left">{t.label}</span>
                  <span className={cn('text-[11px] font-bold', eventType === t.key ? 'text-[#FD6220]' : 'text-[#E5E5EA]')}>✓</span>
                </button>
              ))}
            </div>

            {/* Позитивные */}
            <div className="card" style={{ padding: '4px 0' }}>
              <div className="px-3 py-1.5 text-[8px] font-bold text-green-500 uppercase tracking-wide">Позитивные</div>
              {EVENT_TYPES.filter(t => t.direction === 'positive').map(t => (
                <button key={t.key} onClick={() => { setEventType(t.key); setDirection('positive') }}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-[#F2F2F7] last:border-0',
                    eventType === t.key ? 'bg-[#EDFAF2]' : '')}>
                  <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center text-sm flex-shrink-0',
                    eventType === t.key ? 'bg-[#C6EFD0]' : 'bg-[#F2F2F7]')}>{t.emoji}</div>
                  <span className="text-[10px] font-semibold text-[#1C1C1E] flex-1 text-left">{t.label}</span>
                  <span className={cn('text-[11px] font-bold', eventType === t.key ? 'text-green-500' : 'text-[#E5E5EA]')}>✓</span>
                </button>
              ))}
            </div>

            {/* Другое */}
            <div className="card" style={{ padding: '4px 0' }}>
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
                <p className="section-title">Название события</p>
                <input value={customName} onChange={e => setCustomName(e.target.value)}
                  placeholder="Опиши событие..."
                  className="w-full border-[1.5px] border-[#FD6220] bg-[#FFF4EF] rounded-[8px] p-2.5 text-[11px] font-semibold text-[#1C1C1E] outline-none mb-3" />
                <p className="section-title">Направление</p>
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
              className="btn-brand disabled:opacity-50">Далее →</button>
          </>
        )}

        {/* STEP 2: Time, duration (seizure), aura (seizure), obs before */}
        {step === 1 && (
          <>
            <div className="card">
              <p className="section-title">Когда произошло</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
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
                  <p className="section-title">Длительность</p>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Минуты</p>
                      <div className="flex items-center justify-center gap-2 border border-[#E5E5EA] rounded-[8px] py-2">
                        <button onClick={() => setDurationMin(Math.max(0, durationMin - 1))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">−</button>
                        <span className="text-[11px] font-bold w-6 text-center">{durationMin}</span>
                        <button onClick={() => setDurationMin(durationMin + 1)} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">Секунды</p>
                      <div className="flex items-center justify-center gap-2 border border-[#E5E5EA] rounded-[8px] py-2">
                        <button onClick={() => setDurationSec(Math.max(0, durationSec - 5))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">−</button>
                        <span className="text-[11px] font-bold w-6 text-center">{durationSec}</span>
                        <button onClick={() => setDurationSec(Math.min(59, durationSec + 5))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                  <div className="text-[7px] font-bold text-[#FD6220] bg-[#FFF4EF] px-1.5 py-0.5 rounded-[4px] inline-block mb-1.5">Только для приступов</div>
                  <p className="section-title">Аура</p>
                  <TapGrid2
                    options={[{ value: 'true', label: 'Да' }, { value: 'false', label: 'Нет' }, { value: 'unknown', label: 'Не знаю' }]}
                    value={hadAura === null ? '' : hadAura === true ? 'true' : hadAura === false ? 'false' : 'unknown'}
                    onChange={v => setHadAura(v === 'true' ? true : v === 'false' ? false : null)}
                  />
                </div>
              </>
            )}

            <div className="card">
              <p className="section-title">Наблюдения до события</p>
              <textarea value={obsBefore} onChange={e => setObsBefore(e.target.value)}
                placeholder="Что предшествовало — поведение, активность, еда..."
                rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            <button onClick={() => setStep(2)} className="btn-brand">Далее →</button>
          </>
        )}

        {/* STEP 3: Description, post-ictal (seizure), obs after */}
        {step === 2 && (
          <>
            <div className="card">
              <p className="section-title">Описание события</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Как проходило, что наблюдала..."
                rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            {isSeizure && (
              <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                <div className="text-[7px] font-bold text-[#FD6220] inline-block mb-1.5">Только для приступов</div>
                <p className="section-title">Постиктальная фаза</p>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <button onClick={() => setPostIctalType('standard')}
                    className={cn('rounded-[8px] py-2 text-[8px] font-semibold border-[1.5px]',
                      postIctalType === 'standard' ? 'border-[#FD6220] bg-white text-[#FD6220]' : 'border-[#FDD5C0] text-[#8E8E93]')}>
                    Стандартная (поела)
                  </button>
                  <button onClick={() => setPostIctalType('atypical')}
                    className={cn('rounded-[8px] py-2 text-[8px] font-semibold border-[1.5px]',
                      postIctalType === 'atypical' ? 'border-[#FD6220] bg-white text-[#FD6220]' : 'border-[#FDD5C0] text-[#8E8E93]')}>
                    Нетипичная
                  </button>
                </div>
                {postIctalType === 'atypical' && (
                  <textarea value={postIctalNotes} onChange={e => setPostIctalNotes(e.target.value)}
                    placeholder="Дезориентация, агрессия, слепота..."
                    rows={2}
                    className="w-full border border-[#FDD5C0] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220] bg-white" />
                )}
              </div>
            )}

            <div className="card">
              <p className="section-title">Наблюдения после события</p>
              <textarea value={obsAfter} onChange={e => setObsAfter(e.target.value)}
                placeholder="Что происходило после..."
                rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>

            <div className="card" style={{ background: '#F9F9F9' }}>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Идентификатор</p>
              <p className="text-[12px] font-bold text-[#FD6220] tracking-wide">
                {petName.toUpperCase().slice(0, 4)}-{date.replace(/-/g, '-')}-XXX
              </p>
              <p className="text-[7px] text-[#8E8E93] mt-0.5">Присвоится автоматически при сохранении</p>
            </div>

            <button onClick={save} disabled={saving} className="btn-brand disabled:opacity-50">
              {saving ? 'Сохраняем...' : 'Сохранить событие'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
