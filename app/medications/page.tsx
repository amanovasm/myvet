'use client'
import { useState, useEffect } from 'react'
import { supabase, Medication } from '@/lib/supabase'
import Nav from '@/components/nav'
import { Plus, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDateRu } from '@/lib/utils'

export default function MedicationsPage() {
  const [petId, setPetId]           = useState<string | null>(null)
  const [meds, setMeds]             = useState<Medication[]>([])
  const [history, setHistory]       = useState<Medication[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [saving, setSaving]         = useState(false)

  const [name, setName]             = useState('')
  const [dose, setDose]             = useState('')
  const [unit, setUnit]             = useState('mg')
  const [frequency, setFrequency]   = useState('')
  const [startedAt, setStartedAt]   = useState(new Date().toISOString().slice(0, 10))
  const [changeNote, setChangeNote] = useState('')

  useEffect(() => {
    supabase.from('pets').select('id').limit(1).single().then(({ data }) => {
      if (!data) return
      setPetId(data.id)
      loadMeds(data.id)
    })
  }, [])

  async function loadMeds(pid: string) {
    const { data: current } = await supabase
      .from('medications').select('*').eq('pet_id', pid)
      .is('ended_at', null).order('started_at', { ascending: false })
    const { data: past } = await supabase
      .from('medications').select('*').eq('pet_id', pid)
      .not('ended_at', 'is', null).order('ended_at', { ascending: false })
    setMeds(current || [])
    setHistory(past || [])
  }

  async function save() {
    if (!petId || !name) return
    setSaving(true)
    await supabase.from('medications').insert({
      pet_id: petId, name,
      dose_amount: dose ? parseFloat(dose) : null,
      dose_unit: unit, frequency: frequency || null,
      started_at: startedAt,
      change_note: changeNote || null,
    })
    setName(''); setDose(''); setFrequency(''); setChangeNote('')
    setShowForm(false)
    setSaving(false)
    loadMeds(petId)
  }

  async function endMed(medId: string) {
    await supabase.from('medications').update({ ended_at: new Date().toISOString().slice(0, 10) }).eq('id', medId)
    if (petId) loadMeds(petId)
  }

  return (
    <main className="p-4 pb-24 max-w-md mx-auto">
      <div className="flex items-center justify-between pt-4 mb-4">
        <h1 className="text-xl font-bold">Лечение</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-500 text-white px-3 py-2 rounded-xl text-sm font-medium">
          <Plus size={16} />
          Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showForm && (
        <div className="card mb-4 space-y-3">
          <p className="font-semibold">Новый препарат</p>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Название препарата *"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          <div className="grid grid-cols-3 gap-2">
            <input value={dose} onChange={e => setDose(e.target.value)}
              placeholder="Доза" type="number" step="0.1"
              className="col-span-2 rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
            <select value={unit} onChange={e => setUnit(e.target.value)}
              className="rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500">
              <option>mg</option>
              <option>mg/kg</option>
              <option>ml</option>
              <option>tab</option>
            </select>
          </div>
          <input value={frequency} onChange={e => setFrequency(e.target.value)}
            placeholder="Кратность (напр. 2 раза в день)"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Дата начала</label>
            <input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <input value={changeNote} onChange={e => setChangeNote(e.target.value)}
            placeholder="Причина изменения / комментарий"
            className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-teal-500" />
          <button onClick={save} disabled={!name || saving} className="btn-primary">
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Текущие препараты */}
      {meds.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">💊</div>
          <p>Препараты не добавлены</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {meds.map(med => (
            <div key={med.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{med.name}</p>
                  {med.dose_amount && (
                    <p className="text-sm text-gray-500">{med.dose_amount} {med.dose_unit}{med.frequency ? ` · ${med.frequency}` : ''}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">с {formatDateRu(med.started_at)}</p>
                  {med.change_note && <p className="text-xs text-gray-400">{med.change_note}</p>}
                </div>
                <button onClick={() => endMed(med.id)}
                  className="text-xs text-gray-400 border border-gray-200 rounded-lg px-2 py-1 flex-shrink-0">
                  Отменить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* История */}
      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-3">
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            История изменений ({history.length})
          </button>
          {showHistory && (
            <div className="space-y-2">
              {history.map(med => (
                <div key={med.id} className="card opacity-60">
                  <p className="font-medium text-sm">{med.name} — {med.dose_amount} {med.dose_unit}</p>
                  <p className="text-xs text-gray-400">{formatDateRu(med.started_at)} → {med.ended_at ? formatDateRu(med.ended_at) : 'сейчас'}</p>
                  {med.change_note && <p className="text-xs text-gray-400">{med.change_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Nav />
    </main>
  )
}
