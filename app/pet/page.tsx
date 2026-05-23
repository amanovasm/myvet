'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, Check } from 'lucide-react'
import Link from 'next/link'
import Nav from '@/components/nav'

export default function PetPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [done, setDone]         = useState(false)
  const [petId, setPetId]       = useState<string | null>(null)

  const [name, setName]         = useState('')
  const [species, setSpecies]   = useState<'cat'|'dog'>('cat')
  const [breed, setBreed]       = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender]     = useState<'female'|'male'|'unknown'>('female')
  const [diagnoses, setDiagnoses] = useState('')
  const [allergies, setAllergies] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const [weight, setWeight]     = useState('')

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

    const petData = {
      name, species, breed: breed || null,
      birth_date: birthDate || null,
      gender, diagnoses: diagnoses || null,
      allergies: allergies || null,
      vet_notes: vetNotes || null,
    }

    let savedPetId = petId

    if (petId) {
      await supabase.from('pets').update(petData).eq('id', petId)
    } else {
      const { data } = await supabase.from('pets').insert(petData).select().single()
      savedPetId = data?.id
    }

    // Сохраняем вес если указан
    if (weight && savedPetId) {
      await supabase.from('weight_log').insert({
        pet_id: savedPetId,
        weight_kg: parseFloat(weight),
        measured_at: new Date().toISOString().slice(0, 10),
      })
    }

    setDone(true)
    setTimeout(() => router.push('/'), 1200)
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Загружаем...</div>
    </main>
  }

  if (done) {
    return <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-full bg-teal-500 flex items-center justify-center">
        <Check size={32} className="text-white" />
      </div>
      <p className="font-semibold text-lg">Сохранено!</p>
    </main>
  }

  return (
    <main className="p-4 pb-24 space-y-5 max-w-md mx-auto">
      <div className="flex items-center gap-3 pt-4">
        <Link href="/" className="p-2 -ml-2 text-gray-400"><ChevronLeft size={24} /></Link>
        <h1 className="text-xl font-bold">{petId ? 'Профиль питомца' : 'Добавить питомца'}</h1>
      </div>

      {/* Вид */}
      <div>
        <p className="font-semibold mb-3">Вид</p>
        <div className="grid grid-cols-2 gap-2">
          {[{v:'cat',label:'🐱 Кошка'},{v:'dog',label:'🐶 Собака'}].map(opt => (
            <button key={opt.v} onClick={() => setSpecies(opt.v as 'cat'|'dog')}
              className={`py-3 rounded-xl border-2 font-medium transition-all ${species === opt.v ? 'border-teal-500 bg-teal-50 text-teal-500' : 'border-gray-200 text-gray-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Имя */}
      <div>
        <label className="font-semibold block mb-2">Имя *</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Мави"
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
      </div>

      {/* Пол */}
      <div>
        <p className="font-semibold mb-3">Пол</p>
        <div className="grid grid-cols-3 gap-2">
          {[{v:'female',label:'Девочка'},{v:'male',label:'Мальчик'},{v:'unknown',label:'Неизвестно'}].map(opt => (
            <button key={opt.v} onClick={() => setGender(opt.v as typeof gender)}
              className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${gender === opt.v ? 'border-teal-500 bg-teal-50 text-teal-500' : 'border-gray-200 text-gray-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Порода и дата рождения */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-semibold block mb-2 text-sm">Порода</label>
          <input value={breed} onChange={e => setBreed(e.target.value)}
            placeholder="Метис"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
        </div>
        <div>
          <label className="font-semibold block mb-2 text-sm">Дата рождения</label>
          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
        </div>
      </div>

      {/* Вес */}
      <div>
        <label className="font-semibold block mb-2">Текущий вес (кг)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
          placeholder="3.5" step="0.1" min="0"
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
      </div>

      {/* Диагнозы */}
      <div>
        <label className="font-semibold block mb-2">Диагнозы</label>
        <textarea value={diagnoses} onChange={e => setDiagnoses(e.target.value)}
          placeholder="Идиопатическая эпилепсия, лекарственная энцефалопатия, панкреатит..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-teal-500" />
      </div>

      {/* Противопоказания */}
      <div>
        <label className="font-semibold block mb-2">Аллергии и противопоказания</label>
        <textarea value={allergies} onChange={e => setAllergies(e.target.value)}
          placeholder="Непереносимость..."
          rows={2}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-teal-500" />
      </div>

      {/* Заметки для врача */}
      <div>
        <label className="font-semibold block mb-2">Постоянные заметки для врача</label>
        <textarea value={vetNotes} onChange={e => setVetNotes(e.target.value)}
          placeholder="Важная информация которую нужно знать врачу..."
          rows={3}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-teal-500" />
      </div>

      <button onClick={save} disabled={!name || saving}
        className="btn-primary">
        {saving ? 'Сохраняем...' : petId ? 'Сохранить изменения' : 'Добавить питомца'}
      </button>

      <Nav />
    </main>
  )
}
