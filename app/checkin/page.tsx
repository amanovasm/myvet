'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cn, APPETITE_OPTIONS, STOOL_TYPE_OPTIONS, URINE_VOLUME_OPTIONS, ACTIVITY_OPTIONS, WATER_OPTIONS } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Check } from 'lucide-react'
import Link from 'next/link'

interface TapGridProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  cols?: number
}

function TapGrid({ options, value, onChange, cols = 3 }: TapGridProps) {
  return (
    <div className={`grid gap-1.5 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-[8px] py-[5px] px-[3px] text-center border-[1.5px] border-[#E5E5EA] bg-white cursor-pointer',
            value === opt.value && 'border-[#FD6220] bg-[#FFF4EF]',
            opt.value === 'refused' && 'col-span-full'
          )}
        >
          <span className={cn('text-[8px] font-semibold', value === opt.value ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}

interface StepperProps { value: number; onChange: (v: number) => void; min?: number; max?: number }

function Stepper({ value, onChange, min = 0, max = 20 }: StepperProps) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(min, value - 1))}
        className="w-6 h-6 rounded-[6px] bg-[#F2F2F7] text-[#1C1C1E] font-bold text-sm flex items-center justify-center">−</button>
      <span className="text-[12px] font-bold text-[#1C1C1E] min-w-[16px] text-center">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-6 rounded-[6px] bg-[#F2F2F7] text-[#1C1C1E] font-bold text-sm flex items-center justify-center">+</button>
    </div>
  )
}

export default function CheckinPage() {
  const [petId, setPetId] = useState<string | null>(null)
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [appetite, setAppetite] = useState('')
  const [stoolCount, setStoolCount] = useState(0)
  const [stoolType, setStoolType] = useState('')
  const [stoolSmell, setStoolSmell] = useState<boolean | null>(null)
  const [urineCount, setUrineCount] = useState(0)
  const [urineVolume, setUrineVolume] = useState('')
  const [activity, setActivity] = useState('')
  const [water, setWater] = useState('')
  const [note, setNote] = useState('')

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), 'd MMMM, EEEE', { locale: ru })

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (!data) { setLoading(false); return }
      setPetId(data.id)
      supabase.from('daily_checkins').select('*').eq('pet_id', data.id).eq('date', today).limit(1).then((c) => {
        if (c.data && c.data.length > 0) setExisting(c.data[0])
        setLoading(false)
      })
    })
  }, [])

  async function save() {
    if (!petId || !appetite || !activity || !water) return
    setSaving(true)
    await supabase.from('daily_checkins').upsert({
      pet_id: petId, date: today,
      appetite, stool_count: stoolCount, stool_type: stoolType || null,
      stool_smell: stoolSmell, urine_count: urineCount,
      urine_volume: urineVolume || null, activity, water_intake: water,
      note: note || null,
    }, { onConflict: 'pet_id,date' })
    setSaving(false)
    setDone(true)
  }

  const APPETITE_LABEL: Record<string, string> = {
    refused: 'Отказ', weak: 'Слабый', moderate: 'Умеренный',
    good: 'Хороший', excellent: 'Отличный', above_normal: 'Выше нормы',
  }
  const ACTIVITY_LABEL: Record<string, string> = {
    lethargic: 'Вялая', moderate: 'Средняя', active: 'Активная',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[#8E8E93] text-sm">Загружаем...</p>
    </div>
  )

  // Заполнен — показываем результат
  if (existing || done) {
    const data = existing || { appetite, stool_count: stoolCount, stool_type: stoolType, stool_smell: stoolSmell, urine_count: urineCount, urine_volume: urineVolume, activity, water_intake: water, note }
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
        <div className="bg-white">
          <TopBar showBack backHref="/" backLabel="Главная" title="Чек-ин" />
        </div>
        <div className="px-3 py-2 mb-1">
          <p className="text-[10px] text-[#8E8E93]">Ежедневно</p>
          <h1 className="text-[20px] font-bold text-[#1C1C1E]">Чек-ин</h1>
          <p className="text-[10px] text-[#8E8E93] capitalize">{todayLabel}</p>
        </div>
        <div className="px-3 flex flex-col gap-3">
          {done && (
            <div className="flex items-center gap-2 bg-[#F4FFF7] border border-[#C6EFD0] rounded-[13px] p-3">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-[10px] font-bold text-[#1C1C1E]">Чек-ин сохранён!</p>
            </div>
          )}
          <div className="card" style={{ background: '#F4FFF7', borderColor: '#C6EFD0' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#1C1C1E]">✅ Сегодня заполнен</span>
              <span className="text-[7px] font-bold text-[#8E8E93] bg-[#F2F2F7] px-1.5 py-0.5 rounded-[5px]">🔒 Закрыт</span>
            </div>
            {[
              ['Аппетит', APPETITE_LABEL[data.appetite] || data.appetite],
              ['Стул', `${data.stool_count} раз · ${data.stool_type || '—'}`],
              ['Запах стула', data.stool_smell === true ? 'Есть' : data.stool_smell === false ? 'Нет' : '—'],
              ['Моча', `${data.urine_count} раз · ${data.urine_volume || '—'}`],
              ['Активность', ACTIVITY_LABEL[data.activity] || data.activity],
              ['Вода', data.water_intake],
              ...(data.note ? [['Заметки', data.note]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5 border-b border-[#F2F2F7] last:border-0">
                <span className="text-[8px] font-semibold text-[#8E8E93]">{k}</span>
                <span className="text-[9px] font-bold text-[#1C1C1E]">{v}</span>
              </div>
            ))}
          </div>
          <Link href="/" className="btn-brand block text-center">
            ← На главную
          </Link>
          <p className="text-[9px] text-[#8E8E93] text-center">Чек-ин закрыт для редактирования</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  const canSave = appetite && activity && water

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white">
        <TopBar showBack backHref="/" backLabel="Главная" title="Чек-ин" />
      </div>
      <div className="px-3 py-2 mb-1">
        <p className="text-[10px] text-[#8E8E93]">Ежедневно</p>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">Чек-ин</h1>
        <p className="text-[10px] text-[#8E8E93] capitalize">{todayLabel}</p>
      </div>
      <div className="px-3 flex flex-col gap-3 pb-4">
        <div className="card">
          <div className="section-title">Аппетит *</div>
          <TapGrid options={APPETITE_OPTIONS} value={appetite} onChange={setAppetite} cols={3} />
        </div>
        <div className="card">
          <div className="section-title">Стул</div>
          <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7]">
            <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
            <Stepper value={stoolCount} onChange={setStoolCount} />
          </div>
          <div className="mt-2">
            <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Характер</p>
            <TapGrid options={STOOL_TYPE_OPTIONS} value={stoolType} onChange={setStoolType} cols={3} />
          </div>
          <div className="mt-2">
            <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Запах</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setStoolSmell(false)}
                className={cn('rounded-[8px] py-[5px] border-[1.5px] border-[#E5E5EA] bg-white', stoolSmell === false && 'border-[#FD6220] bg-[#FFF4EF]')}>
                <span className={cn('text-[8px] font-semibold', stoolSmell === false ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>Без запаха</span>
              </button>
              <button onClick={() => setStoolSmell(true)}
                className={cn('rounded-[8px] py-[5px] border-[1.5px] border-[#E5E5EA] bg-white', stoolSmell === true && 'border-[#FD6220] bg-[#FFF4EF]')}>
                <span className={cn('text-[8px] font-semibold', stoolSmell === true ? 'text-[#FD6220]' : 'text-[#8E8E93]')}>С запахом</span>
              </button>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="section-title">Мочеиспускание</div>
          <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7]">
            <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
            <Stepper value={urineCount} onChange={setUrineCount} />
          </div>
          <div className="mt-2">
            <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Объём</p>
            <TapGrid options={URINE_VOLUME_OPTIONS} value={urineVolume} onChange={setUrineVolume} cols={2} />
          </div>
        </div>
        <div className="card">
          <div className="section-title">Активность *</div>
          <TapGrid options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} cols={3} />
        </div>
        <div className="card">
          <div className="section-title">Вода *</div>
          <TapGrid options={WATER_OPTIONS} value={water} onChange={setWater} cols={2} />
        </div>
        <div className="card">
          <div className="section-title">Заметки <span className="text-[8px] font-normal text-[#8E8E93]">(необязательно)</span></div>
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Что-то необычное сегодня?" rows={2}
            className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
        </div>
        <button onClick={save} disabled={!canSave || saving} className="btn-brand disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Сохранить чек-ин'}
        </button>
      </div>
    </div>
  )
}
