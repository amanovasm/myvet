'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

export default function NewPetPage() {
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<'cat' | 'dog'>('cat')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'female' | 'male' | 'unknown'>('female')
  const [diagnoses, setDiagnoses] = useState('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Введи кличку'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const { data: p, error: err } = await supabase.from('pets').insert({
      name: name.trim(),
      species,
      breed: breed || null,
      birth_date: birthDate || null,
      gender,
      diagnoses: diagnoses || null,
      user_id: user.id,
    }).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    if (weight && p) {
      await supabase.from('weight_log').insert({
        pet_id: p.id,
        weight_kg: parseFloat(weight),
        measured_at: new Date().toISOString().slice(0, 10)
      })
    }

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-[52px] pb-[72px]">
      <TopBar showBack backHref="/" backLabel="Главная" title="Новый питомец" />
      <div className="px-3 pt-4 flex flex-col gap-3">
        {error && <p className="text-red-500 text-[11px] px-1">{error}</p>}

        <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-4 flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Кличка *</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Мурка"
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Вид *</p>
              <select value={species} onChange={e => setSpecies(e.target.value as 'cat' | 'dog')}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none">
                <option value="cat">Кошка</option>
                <option value="dog">Собака</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Пол</p>
              <select value={gender} onChange={e => setGender(e.target.value as any)}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none">
                <option value="female">Самка</option>
                <option value="male">Самец</option>
                <option value="unknown">Неизвестно</option>
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Порода</p>
            <input value={breed} onChange={e => setBreed(e.target.value)} placeholder="Шотландская"
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Дата рождения</p>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Вес (кг)</p>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="3.5"
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase mb-1">Диагноз</p>
            <input value={diagnoses} onChange={e => setDiagnoses(e.target.value)} placeholder="Эпилепсия, диабет..."
              className="w-full border border-[#E5E5EA] rounded-[8px] p-2.5 text-[13px] outline-none focus:border-[#FD6220]" />
          </div>
        </div>

        <button onClick={save} disabled={saving || !name.trim()}
          className="w-full bg-[#FD6220] text-white font-bold rounded-[12px] py-3.5 text-[13px] disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Добавить питомца'}
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
