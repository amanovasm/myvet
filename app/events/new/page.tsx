'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cn, EVENT_TYPES } from '@/lib/utils'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 justify-center py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn('h-1.5 rounded-full transition-all',
          i === current ? 'w-4 bg-[#FD6220]' : 'w-1.5 bg-[#E5E5EA]')} />
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
  const [savedIdentifier, setSavedIdentifier] = useState('')
  const [saveError, setSaveError] = useState('')

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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const userId = user.id
      supabase.from('pets').select('id,name').eq('user_id', userId).limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); setPetName(data.name) }
    })
    })()
  }, [])

  async function save() {
    if (!petId) return
    setSaving(true)
    setSaveError('')

    const occurred_at = new Date(`${date}T${time}`).toISOString()
    const finalType = isOther ? customName : eventType
    const finalDir: 'negative' | 'neutral' | 'positive' = isOther
      ? direction
      : ((selectedType?.direction as 'negative' | 'neutral' | 'positive') || 'neutral')

    let had_aura: boolean | null = null
    if (isSeizure) {
      if (aura === 'yes') had_aura = true
      else if (aura === 'no') had_aura = false
    }

    const res = await fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId,
        petName,
        date,
        event_type: finalType,
        direction: finalDir,
        occurred_at,
        duration_sec: isSeizure ? (durationMin * 60 + durationSec) || null : null,
        had_aura,
        observations_before: obsBefore || null,
        description: description || null,
        post_ictal_type: isSeizure && postIctalType ? postIctalType : null,
        post_ictal_notes: isSeizure && postIctalType === 'atypical' ? postIctalNotes || null : null,
        observations_after: obsAfter || null,
      })
    })

    const json = await res.json()
    setSaving(false)

    if (json.error) {
      setSaveError(`Ошибка: ${json.error}`)
    } else {
      setSavedIdentifier(json.identifier)
    }
  }

  if (savedIdentifier) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F2F2F7] p-6">
      <div className="w-16 h-16 rounded-full bg-[#FD6220] flex items-center justify-center">
        <Check size={30} className="text-white" />
      </div>
      <p className="font-bold text-[18px] text-[#1C1C1E] text-center">Событие сохранено!</p>
      <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-4 w-full">
        <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">Идентификатор</p>
        <p className="text-[14px] font-bold text-[#FD6220] font-mono">{savedIdentifier}</p>
        <p className="text-[9px] text-[#8E8E93] mt-1">Используй для поиска видео в Google Drive</p>
      </div>
      <button onClick={() => router.push('/events')}
        className="w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3 text-[12px]">
        Перейти к событиям
      </button>
    </div>
  )

  const TapBtn = ({ val, label, current, onSelect }: { val: string; label: string; current: string; onSelect: (v: string) => void }) => (
    <button onClick={() => onSelect(val)}
      className={cn('rounded-[8px] py-2 px-1 text-center border-[1.5px] cursor-pointer',
        current === val ? 'border-[#FD6220] bg-[#FFF4EF]' : 'border-[#E5E5EA] bg-white')}>
      <span className={cn('text-[8px] font-semibold block', current === val ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-4">
      <div className="bg-white flex items-center justify-between px-3 py-2 sticky top-0 z-10">
        <button onClick={() => step > 0 ? setStep(step - 1) : router.push('/events')}
          className="text-[#FD6220] text-[11px] font-bold">
          {step > 0 ? '‹ Назад' : '‹ События'}
        </button>
        <span className="text-[11px] font-bold text-[#1C1C1E]">Шаг {step + 1} из 3</span>
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
                <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Название</p>
                <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Опиши событие..."
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
              className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] w-full disabled:opacity-50">Далее →</button>
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
                    {[{ label: 'Минуты', val: durationMin, set: setDurationMin, step: 1, max: 60 },
                      { label: 'Секунды', val: durationSec, set: setDurationSec, step: 5, max: 55 }].map(f => (
                      <div key={f.label}>
                        <p className="text-[7px] font-bold text-[#8E8E93] uppercase mb-1">{f.label}</p>
                        <div className="flex items-center justify-center gap-2 border border-[#E5E5EA] rounded-[8px] py-2">
                          <button onClick={() => f.set(Math.max(0, f.val - f.step))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">−</button>
                          <span className="text-[11px] font-bold w-6 text-center">{f.val}</span>
                          <button onClick={() => f.set(Math.min(f.max, f.val + f.step))} className="w-5 h-5 rounded-[5px] bg-[#F2F2F7] font-bold">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                  <div className="text-[7px] font-bold text-[#FD6220] inline-block mb-2 bg-white px-1.5 py-0.5 rounded-[4px]">Только для приступов</div>
                  <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Аура</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <TapBtn val="yes" label="Да" current={aura} onSelect={v => setAura(v as AuraValue)} />
                    <TapBtn val="no" label="Нет" current={aura} onSelect={v => setAura(v as AuraValue)} />
                    <TapBtn val="unknown" label="Не знаю" current={aura} onSelect={v => setAura(v as AuraValue)} />
                  </div>
                </div>
              </>
            )}
            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Наблюдения до события</p>
              <textarea value={obsBefore} onChange={e => setObsBefore(e.target.value)} placeholder="Что предшествовало..." rows={3}
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
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Как проходило, что наблюдала..." rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>
            {isSeizure && (
              <div className="card" style={{ background: '#FFF4EF', borderColor: '#FDD5C0' }}>
                <div className="text-[7px] font-bold text-[#FD6220] inline-block mb-2 bg-white px-1.5 py-0.5 rounded-[4px]">Только для приступов</div>
                <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Постиктальная фаза</p>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  <TapBtn val="standard" label="Стандартная (поела)" current={postIctalType} onSelect={setPostIctalType} />
                  <TapBtn val="atypical" label="Нетипичная" current={postIctalType} onSelect={setPostIctalType} />
                </div>
                {postIctalType === 'atypical' && (
                  <textarea value={postIctalNotes} onChange={e => setPostIctalNotes(e.target.value)} placeholder="Дезориентация, агрессия..." rows={2}
                    className="w-full border border-[#FDD5C0] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none bg-white" />
                )}
              </div>
            )}
            <div className="card">
              <p className="text-[10px] font-bold text-[#1C1C1E] mb-2">Наблюдения после события</p>
              <textarea value={obsAfter} onChange={e => setObsAfter(e.target.value)} placeholder="Что происходило после..." rows={3}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>
            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-[13px] p-3">
                <p className="text-[9px] font-bold text-red-500">{saveError}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setStep(1)} className="bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[10px] py-2.5 text-[10px]">← Назад</button>
              <button onClick={save} disabled={saving}
                className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] disabled:opacity-50">
                {saving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
