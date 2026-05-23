'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import TopBar from '@/components/TopBar'

export default function PetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [petId, setPetId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'cat' | 'dog'>('cat')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'female' | 'male' | 'unknown'>('female')
  const [diagnoses, setDiagnoses] = useState('')
  const [allergies, setAllergies] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    supabase.from('pets').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setPetId(data.id)
        setName(data.name || '')
        setSpecies(data.species || 'cat')
        setBreed(data.breed || '')
        setBirthDate(data.birth_date || '')
        setGender(data.gender || 'female')
        setDiagnoses(data.diagnoses || '')
        setAllergies(data.allergies || '')
        setVetNotes(data.vet_notes || '')
      }
      setLoading(false)
    })
  }, [])

  async function save() {
    if (!name) return
    setSaving(true)
    const data = { name, species, breed: breed || null, birth_date: birthDate || null, gender, diagnoses: diagnoses || null, allergies: allergies || null, vet_notes: vetNotes || null }
    let savedId = petId
    if (petId) {
      await supabase.from('pets').update(data).eq('id', petId)
    } else {
      const { data: p } = await supabase.from('pets').insert(data).select().single()
      savedId = p?.id || null
    }
    if (weight && savedId) {
      await supabase.from('weight_log').insert({ pet_id: savedId, weight_kg: parseFloat(weight), measured_at: format(new Date(), 'yyyy-MM-dd') })
    }
    setDone(true)
    setTimeout(() => router.push('/'), 1200)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8E8E93]">Загружаем...</div>

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center"><Check size={28} className="text-white" /></div>
      <p className="font-bold">Сохранено!</p>
    </div>
  )

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )

  const inp = "w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[10px] font-medium outline-none focus:border-[#FD6220]"
  const ta = `${inp} resize-none`

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-4">
      <div className="bg-white">
        <TopBar showBack backHref="/" backLabel="Главная" title={petId ? 'Профиль' : 'Добавить питомца'} />
      </div>
      <div className="px-3 py-3 flex flex-col gap-3">
        <div className="card">
          <Field label="Вид">
            <div className="grid grid-cols-2 gap-2">
              {([{ v: 'cat', l: '🐱 Кошка' }, { v: 'dog', l: '🐶 Собака' }] as const).map(o => (
                <button key={o.v} onClick={() => setSpecies(o.v)}
                  className={`py-2.5 rounded-[8px] border-[1.5px] text-[10px] font-bold transition-all ${species === o.v ? 'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]' : 'border-[#E5E5EA] text-[#8E8E93]'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Имя *">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Мави" className={inp} />
          </Field>
          <Field label="Пол">
            <div className="grid grid-cols-3 gap-1.5">
              {([{ v: 'female', l: 'Девочка' }, { v: 'male', l: 'Мальчик' }, { v: 'unknown', l: 'Неизвестно' }] as const).map(o => (
                <button key={o.v} onClick={() => setGender(o.v)}
                  className={`py-2 rounded-[8px] border-[1.5px] text-[8px] font-bold transition-all ${gender === o.v ? 'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]' : 'border-[#E5E5EA] text-[#8E8E93]'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Порода">
              <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Метис" className={inp} />
            </Field>
            <Field label="Дата рождения">
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className={inp} />
            </Field>
          </div>
        </div>

        <div className="card">
          <Field label="Текущий вес (кг)">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="3.5" step="0.1" className={inp} />
          </Field>
        </div>

        <div className="card">
          <Field label="Диагнозы">
            <textarea value={diagnoses} onChange={e => setDiagnoses(e.target.value)}
              placeholder="Идиопатическая эпилепсия, лекарственная энцефалопатия..." rows={3} className={ta} />
          </Field>
          <Field label="Аллергии и противопоказания">
            <textarea value={allergies} onChange={e => setAllergies(e.target.value)}
              placeholder="Непереносимость..." rows={2} className={ta} />
          </Field>
          <Field label="Заметки для врача">
            <textarea value={vetNotes} onChange={e => setVetNotes(e.target.value)}
              placeholder="Важная информация для ветеринара..." rows={3} className={ta} />
          </Field>
        </div>

        <button onClick={save} disabled={!name || saving} className="btn-brand disabled:opacity-50">
          {saving ? 'Сохраняем...' : petId ? 'Сохранить изменения' : 'Добавить питомца'}
        </button>
      </div>
    </div>
  )
}
