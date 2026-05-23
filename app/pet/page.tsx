'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { Check } from 'lucide-react'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export default function PetPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [petId, setPetId] = useState(null)
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('cat')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('female')
  const [diagnoses, setDiagnoses] = useState('')
  const [allergies, setAllergies] = useState('')
  const [vetNotes, setVetNotes] = useState('')
  const [weight, setWeight] = useState('')

  useEffect(() => {
    supabase.from('pets').select('*').limit(1).single().then(({ data }) => {
      if (data) { setPetId(data.id); setName(data.name||''); setSpecies(data.species||'cat'); setBreed(data.breed||''); setBirthDate(data.birth_date||''); setGender(data.gender||'female'); setDiagnoses(data.diagnoses||''); setAllergies(data.allergies||''); setVetNotes(data.vet_notes||'') }
      setLoading(false)
    })
  }, [])

  async function save() {
    if (!name) return
    setSaving(true)
    const petData = { name, species, breed: breed||null, birth_date: birthDate||null, gender, diagnoses: diagnoses||null, allergies: allergies||null, vet_notes: vetNotes||null }
    let savedId = petId
    if (petId) { await supabase.from('pets').update(petData).eq('id', petId) }
    else { const { data: p } = await supabase.from('pets').insert(petData).select().single(); savedId = p?.id||null }
    if (weight && savedId) await supabase.from('weight_log').insert({ pet_id: savedId, weight_kg: parseFloat(weight), measured_at: format(new Date(),'yyyy-MM-dd') })
    setDone(true)
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Загружаем...</div>

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F2F2F7] p-6">
      <div className="w-14 h-14 rounded-full bg-[#FD6220] flex items-center justify-center"><Check size={28} className="text-white" /></div>
      <p className="font-bold text-base text-center">{petId ? 'Изменения сохранены!' : `${name} добавлена в систему!`}</p>
      <Link href="/" className="bg-[#FD6220] text-white font-bold rounded-xl py-3 px-10 text-sm">Перейти на главную</Link>
    </div>
  )

  const inp = "w-full border border-[#E5E5EA] rounded-lg p-2.5 text-xs font-medium outline-none focus:border-[#FD6220] bg-white"
  const Field = ({ label, children }) => <div className="mb-3"><p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{label}</p>{children}</div>

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-6">
      <div className="bg-white"><TopBar showBack={!!petId} backHref="/" backLabel="Главная" title={petId ? 'Профиль питомца' : 'Добавить питомца'} /></div>
      {!petId && <div className="px-3 pt-3"><h1 className="text-xl font-bold">Добро пожаловать!</h1><p className="text-xs text-gray-400 mt-0.5">Расскажите о вашем питомце</p></div>}
      <div className="px-3 py-3 flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-[#E5E5EA] p-3">
          <Field label="Вид"><div className="grid grid-cols-2 gap-2">{[{v:'cat',l:'🐱 Кошка'},{v:'dog',l:'🐶 Собака'}].map(o=><button key={o.v} onClick={()=>setSpecies(o.v)} className={`py-2.5 rounded-lg border-2 text-xs font-bold ${species===o.v?'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]':'border-[#E5E5EA] text-gray-400'}`}>{o.l}</button>)}</div></Field>
          <Field label="Имя *"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Мави" className={inp} /></Field>
          <Field label="Пол"><div className="grid grid-cols-3 gap-1.5">{[{v:'female',l:'Девочка'},{v:'male',l:'Мальчик'},{v:'unknown',l:'Неизвестно'}].map(o=><button key={o.v} onClick={()=>setGender(o.v)} className={`py-2 rounded-lg border-2 text-xs font-bold ${gender===o.v?'border-[#FD6220] bg-[#FFF4EF] text-[#FD6220]':'border-[#E5E5EA] text-gray-400'}`}>{o.l}</button>)}</div></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Порода"><input value={breed} onChange={e=>setBreed(e.target.value)} placeholder="Метис" className={inp} /></Field>
            <Field label="Дата рождения"><input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className={inp} /></Field>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5EA] p-3">
          <Field label="Текущий вес (кг)"><input type="number" value={weight} onChange={e=>setWeight(e.target.value)} placeholder="3.5" step="0.1" className={inp} /></Field>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E5EA] p-3">
          <Field label="Диагнозы"><textarea value={diagnoses} onChange={e=>setDiagnoses(e.target.value)} placeholder="Идиопатическая эпилепсия..." rows={3} className={`${inp} resize-none`} /></Field>
          <Field label="Противопоказания"><textarea value={allergies} onChange={e=>setAllergies(e.target.value)} placeholder="Непереносимость..." rows={2} className={`${inp} resize-none`} /></Field>
          <Field label="Заметки для врача"><textarea value={vetNotes} onChange={e=>setVetNotes(e.target.value)} placeholder="Важная информация..." rows={3} className={`${inp} resize-none`} /></Field>
        </div>
        <button onClick={save} disabled={!name||saving} className="bg-[#FD6220] text-white font-bold rounded-xl py-3 text-sm w-full disabled:opacity-50">{saving?'Сохраняем...':petId?'Сохранить изменения':'Добавить питомца'}</button>
        {petId && <Link href="/" className="bg-[#F2F2F7] text-gray-400 font-bold rounded-xl py-3 text-sm w-full text-center block">← Вернуться на главную</Link>}
      </div>
      {petId && <BottomNav />}
    </div>
  )
}
