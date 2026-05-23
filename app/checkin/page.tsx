'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ChevronLeft, Check } from 'lucide-react'
import Link from 'next/link'

type Val = 1 | 2 | 3

const APPETITE  = [{ v: 1, emoji: '😔', label: 'Плохой'    }, { v: 2, emoji: '😊', label: 'Норма'   }, { v: 3, emoji: '🌟', label: 'Хороший'   }]
const TOILET    = [{ v: 1, emoji: '❌', label: 'Не ходила'  }, { v: 2, emoji: '✅', label: 'Норма'   }, { v: 3, emoji: '💧', label: 'Много'      }]
const ACTIVITY  = [{ v: 1, emoji: '😴', label: 'Вялая'      }, { v: 2, emoji: '😊', label: 'Норма'   }, { v: 3, emoji: '⚡', label: 'Активная'  }]

function TapGroup({ options, value, onChange }: {
  options: { v: number; emoji: string; label: string }[]
  value: Val | null
  onChange: (v: Val) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(opt => (
        <button key={opt.v}
          onClick={() => onChange(opt.v as Val)}
          className={cn('tap-option', value === opt.v && 'selected')}>
          <span className="text-2xl">{opt.emoji}</span>
          <span className="text-xs font-medium">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function CheckinPage() {
  const router = useRouter()
  const [appetite, setAppetite]   = useState<Val | null>(null)
  const [toilet, setToilet]       = useState<Val | null>(null)
  const [activity, setActivity]   = useState<Val | null>(null)
  const [note, setNote]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)

  const canSave = appetite && toilet && activity

  async function save() {
    if (!canSave) return
    setSaving(true)
    const { data: pet } = await supabase.from('pets').select('id').limit(1).single()
    if (!pet) { setSaving(false); return }

    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('daily_checkins').upsert({
      pet_id: pet.id, date: today,
      appetite, toilet, activity,
      note: note || null,
    }, { onConflict: 'pet_id,date' })

    setDone(true)
    setTimeout(() => router.push('/'), 1000)
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center">
          <Check size={32} className="text-white" />
        </div>
        <p className="font-semibold text-lg">Чек-ин сохранён</p>
      </main>
    )
  }

  return (
    <main className="p-4 pb-8 space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/" className="p-2 -ml-2 text-gray-400">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">Чек-ин сегодня</h1>
      </div>

      <div className="space-y-5">
        <div>
          <p className="font-semibold mb-3">Аппетит</p>
          <TapGroup options={APPETITE} value={appetite} onChange={setAppetite} />
        </div>
        <div>
          <p className="font-semibold mb-3">Туалет</p>
          <TapGroup options={TOILET} value={toilet} onChange={setToilet} />
        </div>
        <div>
          <p className="font-semibold mb-3">Активность</p>
          <TapGroup options={ACTIVITY} value={activity} onChange={setActivity} />
        </div>
        <div>
          <p className="font-semibold mb-2">Заметки <span className="text-gray-400 font-normal text-sm">(необязательно)</span></p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Что-то необычное сегодня?"
            rows={3}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <button onClick={save} disabled={!canSave || saving}
        className="btn-primary">
        {saving ? 'Сохраняем...' : 'Сохранить'}
      </button>
    </main>
  )
}
