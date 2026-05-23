'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateEventId, cn } from '@/lib/utils'
import { ChevronLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const DEFAULT_TYPES = [
  { key: 'seizure',         label: 'Приступ',                   direction: 'negative' },
  { key: 'head_pressing',   label: 'Хедпрессинг',               direction: 'negative' },
  { key: 'food_refusal',    label: 'Отказ от еды',              direction: 'negative' },
  { key: 'loaf_position',   label: 'Буханка',                   direction: 'neutral'  },
  { key: 'no_urination',    label: 'Нет мочеиспускания',        direction: 'negative' },
  { key: 'vomiting',        label: 'Рвота',                     direction: 'negative' },
  { key: 'claw_sharpening', label: 'Точение когтей',            direction: 'positive' },
  { key: 'meowing',         label: 'Мяуканье / чириканье',      direction: 'positive' },
  { key: 'active_play',     label: 'Активные игры',             direction: 'positive' },
]

const DIR_STYLE: Record<string, string> = {
  negative: 'border-coral-500 bg-coral-50 text-coral-500',
  neutral:  'border-amber-500 bg-amber-50  text-amber-500',
  positive: 'border-teal-500  bg-teal-50   text-teal-500',
}

export default function NewEventPage() {
  const router = useRouter()
  const [petId, setPetId]           = useState<string | null>(null)
  const [petName, setPetName]       = useState('PET')
  const [eventType, setEventType]   = useState('')
  const [customType, setCustomType] = useState('')
  const [direction, setDirection]   = useState<'negative'|'neutral'|'positive'>('negative')
  const [date, setDate]             = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime]             = useState(format(new Date(), 'HH:mm'))
  const [durationMin, setDurationMin] = useState('')
  const [durationSec, setDurationSec] = useState('')
  const [hadAura, setHadAura]       = useState<boolean | null>(null)
  const [observations, setObservations] = useState('')
  const [saving, setSaving]         = useState(false)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    supabase.from('pets').select('id,name').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); setPetName(data.name) }
    })
  }, [])

  const isSeizure = eventType === 'seizure'
  const selectedDefault = DEFAULT_TYPES.find(t => t.key === eventType)

  function selectType(type: typeof DEFAULT_TYPES[0]) {
    setEventType(type.key)
    setDirection(type.direction as typeof direction)
  }

  async function save() {
    if (!petId || !eventType) return
    setSaving(true)

    const occurred_at = new Date(`${date}T${time}`).toISOString()
    const durationSecs = durationMin || durationSec
      ? (parseInt(durationMin || '0') * 60) + parseInt(durationSec || '0')
      : null

    // Считаем порядковый номер за день
    const { count } = await supabase
      .from('health_events')
      .select('*', { count: 'exact', head: true })
      .eq('pet_id', petId)
      .gte('occurred_at', `${date}T00:00:00`)
      .lte('occurred_at', `${date}T23:59:59`)

    const seq = (count || 0) + 1
    const identifier = generateEventId(petName, new Date(date), seq)
    const finalType = eventType === '__custom__' ? customType : eventType

    await supabase.from('health_events').insert({
      pet_id: petId,
      identifier,
      event_type: finalType,
      direction,
      occurred_at,
      duration_sec: durationSecs,
      had_aura: isSeizure ? hadAura : null,
      observations: observations || null,
    })

    setDone(true)
    setTimeout(() => router.push('/events'), 1000)
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center">
          <Check size={32} className="text-white" />
        </div>
        <p className="font-semibold text-lg">Событие сохранено</p>
      </main>
    )
  }

  return (
    <main className="p-4 pb-10 space-y-5 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/events" className="p-2 -ml-2 text-gray-400"><ChevronLeft size={24} /></Link>
        <h1 className="text-xl font-bold">Новое событие</h1>
      </div>

      {/* Тип события */}
      <div>
        <p className="font-semibold mb-3">Тип события</p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TYPES.map(type => (
            <button key={type.key}
              onClick={() => selectType(type)}
              className={cn(
                'px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all',
                eventType === type.key ? DIR_STYLE[type.direction] : 'border-gray-200 text-gray-500'
              )}>
              {type.label}
            </button>
          ))}
          <button onClick={() => setEventType('__custom__')}
            className={cn(
              'px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all',
              eventType === '__custom__' ? 'border-teal-500 bg-teal-50 text-teal-500' : 'border-gray-200 text-gray-500'
            )}>
            + Своё
          </button>
        </div>
        {eventType === '__custom__' && (
          <div className="mt-3 space-y-2">
            <input value={customType} onChange={e => setCustomType(e.target.value)}
              placeholder="Название события"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
            <div className="flex gap-2">
              {(['negative','neutral','positive'] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  className={cn('flex-1 py-2 rounded-xl border-2 text-xs font-medium transition-all', direction === d ? DIR_STYLE[d] : 'border-gray-200 text-gray-400')}>
                  {d === 'negative' ? 'Тревожное' : d === 'neutral' ? 'Нейтральное' : 'Позитивное'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Дата и время */}
      <div>
        <p className="font-semibold mb-3">Когда произошло</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Время</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          </div>
        </div>
      </div>

      {/* Длительность (для приступов) */}
      {isSeizure && (
        <div>
          <p className="font-semibold mb-3">Длительность</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Минуты</label>
              <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)}
                placeholder="0" min="0"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Секунды</label>
              <input type="number" value={durationSec} onChange={e => setDurationSec(e.target.value)}
                placeholder="0" min="0" max="59"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
            </div>
          </div>
        </div>
      )}

      {/* Аура (только для приступов) */}
      {isSeizure && (
        <div>
          <p className="font-semibold mb-3">Была аура?</p>
          <div className="grid grid-cols-3 gap-2">
            {[{ v: true, label: 'Да' }, { v: false, label: 'Нет' }, { v: null, label: 'Не заметила' }].map(opt => (
              <button key={String(opt.v)} onClick={() => setHadAura(opt.v)}
                className={cn('py-3 rounded-xl border-2 text-sm font-medium transition-all',
                  hadAura === opt.v ? 'border-teal-500 bg-teal-50 text-teal-500' : 'border-gray-200 text-gray-500')}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Наблюдения */}
      <div>
        <p className="font-semibold mb-2">Наблюдения <span className="text-gray-400 font-normal text-sm">(до / во время / после)</span></p>
        <textarea value={observations} onChange={e => setObservations(e.target.value)}
          placeholder="Опишите что происходило..."
          rows={4}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-teal-500" />
      </div>

      <button onClick={save} disabled={!eventType || saving}
        className="btn-primary">
        {saving ? 'Сохраняем...' : 'Сохранить событие'}
      </button>
    </main>
  )
}
