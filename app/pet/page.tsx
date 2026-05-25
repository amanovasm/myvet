'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

interface FieldProps { label: string; children: React.ReactNode }
const Field = ({ label, children }: FieldProps) => (
  <div className="mb-3">
    <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1">{label}</p>
    {children}
  </div>
)

export default function PetPage() {
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
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      const userId = user.id
      supabase.from('pets').select('*').eq('user_id', userId).limit(1).single().then(({ data }) => {
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
    })()
  }, [])

  async function save() {
    if (!name) return
    setSaving(true)
    const petData = { name, species, breed: breed || null, birth_date: birthDate || null, gender, diagnoses: diagnoses || null, allergies: allergies || null, vet_notes: vetNotes || null }
    let savedId = petId
    if (petId) {
      await supabase.from('pets').update(petData).eq('id', petId)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase.from('pets').insert({ ...petData, user_id: user?.id }).select().single()
      savedId = p?.id || null
    }
    if (weight && savedId) {
      await supabase.from('weight_log').insert({ pet_id: savedId, weight_kg: parseFloat(weight), measured_at: format(new Date(), 'yyyy-MM-dd') })
    }
    setSaving(false)
    window.location.href = '/'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[#8E8E93]">Загружаем...</div>

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F2F2F7] p-6">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center">
        <Check size={28} className="text-white" />
      </div>
      <p className="font-bold text-base text-center">{petId ? 'Изменения сохранены!' : `${name} добавлена в систему!`}</p>
      <Link href="/" className="bg-[#FD6220] text-white font-bold rounded-xl py-3 px-10 text-sm">
        Перейти на главную
      </Link>
    </div>
  )

  const inp = "w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[10px] font-medium outline-none focus:border-[#FD6220] bg-white"
  const ta = `${inp} resize-none`

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-6">
      <div className="bg-white">
        <TopBar showBack={!!petId} backHref="/" backLabel="Главная" title={petId ? 'Профиль питомца' : 'Добавить питомца'} />
      </div>
      {!petId && (
        <div className="px-3 pt-3">
          <h1 className="text-[20px] font-bold text-[#1C1C1E]">Добро пожаловать!</h1>
          <p className="text-[10px] text-[#8E8E93] mt-0.5">Расскажите о вашем питомце</p>
        </div>
      )}
      <div className="px-3 py-3 flex flex-col gap-3">
        <div className="card">
          <Field label="Вид">
            <div className="grid grid-cols-2 gap-2">
              {([{ v: 'cat' as const, l: '🐱 Кошка' }, { v: 'dog' as const, l: '🐶 Собака' }]).map(o => (
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
              {([{ v: 'female' as const, l: 'Девочка' }, { v: 'male' as const, l: 'Мальчик' }, { v: 'unknown' as const, l: 'Неизвестно' }]).map(o => (
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
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="3.5" step="0.1" min="0" className={inp} />
          </Field>
        </div>
        <div className="card">
          <Field label="Диагнозы">
            <textarea value={diagnoses} onChange={e => setDiagnoses(e.target.value)} placeholder="Идиопатическая эпилепсия..." rows={3} className={ta} />
          </Field>
          <Field label="Аллергии и противопоказания">
            <textarea value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="Непереносимость..." rows={2} className={ta} />
          </Field>
          <Field label="Заметки для врача">
            <textarea value={vetNotes} onChange={e => setVetNotes(e.target.value)} placeholder="Важная информация..." rows={3} className={ta} />
          </Field>
        </div>
        <button onClick={save} disabled={!name || saving} className="btn-brand disabled:opacity-50">
          {saving ? 'Сохраняем...' : petId ? 'Сохранить изменения' : 'Добавить питомца'}
        </button>
        {petId && (
          <Link href="/" className="block text-center py-2.5 rounded-[10px] text-[10px] font-bold bg-[#F2F2F7] text-[#8E8E93]">
            ← Вернуться на главную
          </Link>
        )}
      </div>
      {petId && <BottomNav />}
    </div>
  )
}
