'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { cn, APPETITE_OPTIONS, STOOL_TYPE_OPTIONS, URINE_VOLUME_OPTIONS, ACTIVITY_OPTIONS, WATER_OPTIONS } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { Check } from 'lucide-react'

const APPETITE_LABEL: Record<string, string> = {
  refused:'Отказ',weak:'Слабый',moderate:'Умеренный',
  good:'Хороший',excellent:'Отличный',above_normal:'Выше нормы',
}
const ACTIVITY_LABEL: Record<string, string> = {
  lethargic:'Вялая',moderate:'Средняя',active:'Активная',
}
const WATER_LABEL: Record<string, string> = {
  refused:'Отказ','100-200':'100–200 мл','250-400':'250–400 мл',
  '450-600':'450–600 мл','600+':'Более 600 мл',
}
const STOOL_LABEL: Record<string, string> = {
  formed:'Сформир.',soft:'Мягкий',liquid:'Жидкий',
  dark:'Тёмный',light:'Светлый',refused:'Нет стула',
}
const URINE_LABEL: Record<string, string> = {
  low:'Мало',normal:'Норма',high:'Много',refused:'Нет мочи',
}

function TapGrid({ options, value, onChange, cols=3 }: {
  options:{value:string;label:string}[]; value:string; onChange:(v:string)=>void; cols?:number
}) {
  return (
    <div className={`grid gap-1.5 ${cols===2?'grid-cols-2':'grid-cols-3'}`}>
      {options.map(opt=>(
        <button key={opt.value} onClick={()=>onChange(opt.value)}
          className={cn('rounded-[8px] py-[6px] px-[3px] text-center border-[1.5px] cursor-pointer',
            value===opt.value?'border-[#FD6220] bg-[#FFF4EF]':'border-[#E5E5EA] bg-white',
            opt.value==='refused'&&'col-span-full')}>
          <span className={cn('text-[8px] font-semibold',value===opt.value?'text-[#FD6220]':'text-[#8E8E93]')}>
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  )
}

function Stepper({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>onChange(Math.max(0,value-1))} className="w-6 h-6 rounded-[6px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">−</button>
      <span className="text-[12px] font-bold text-[#1C1C1E] min-w-[16px] text-center">{value}</span>
      <button onClick={()=>onChange(Math.min(20,value+1))} className="w-6 h-6 rounded-[6px] bg-[#F2F2F7] font-bold text-sm flex items-center justify-center">+</button>
    </div>
  )
}

export default function CheckinPage() {
  const [petId, setPetId] = useState<string|null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(),'yyyy-MM-dd'))
  const [existing, setExisting] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const [appetite, setAppetite] = useState('')
  const [stoolCount, setStoolCount] = useState(0)
  const [stoolType, setStoolType] = useState('')
  const [stoolSmell, setStoolSmell] = useState<boolean|null>(null)
  const [urineCount, setUrineCount] = useState(0)
  const [urineVolume, setUrineVolume] = useState('')
  const [activity, setActivity] = useState('')
  const [water, setWater] = useState('')
  const [note, setNote] = useState('')

  const today = format(new Date(),'yyyy-MM-dd')
  const isToday = selectedDate === today

  const weekDays = Array.from({length:7},(_,i)=>{
    const d = subDays(new Date(),6-i)
    return {date:format(d,'yyyy-MM-dd'),day:format(d,'EEEEEE',{locale:ru}),num:format(d,'d')}
  })

  const loadCheckin = useCallback(async (pid:string, date:string) => {
    setLoading(true)
    setJustSaved(false)
    const {data} = await supabase
      .from('daily_checkins').select('*').eq('pet_id',pid).eq('date',date).limit(1)
    setExisting(data&&data.length>0 ? data[0] : null)
    setLoading(false)
  }, [])

  useEffect(()=>{
    supabase.from('pets').select('id').limit(1).single().then(({data})=>{
      if(data){setPetId(data.id);loadCheckin(data.id,today)}
      else setLoading(false)
    })
  },[loadCheckin,today])

  function changeDate(date:string){
    setSelectedDate(date)
    // сбрасываем форму
    setAppetite('');setStoolCount(0);setStoolType('');setStoolSmell(null)
    setUrineCount(0);setUrineVolume('');setActivity('');setWater('');setNote('')
    if(petId) loadCheckin(petId,date)
  }

  async function save(){
    if(!petId||!appetite||!activity||!water) return
    setSaving(true)
    await supabase.from('daily_checkins').upsert({
      pet_id:petId, date:selectedDate,
      appetite, stool_count:stoolCount, stool_type:stoolType||null,
      stool_smell:stoolSmell, urine_count:urineCount,
      urine_volume:urineVolume||null, activity, water_intake:water,
      note:note||null,
    },{onConflict:'pet_id,date'})
    setSaving(false)
    setJustSaved(true)
    // Перезагружаем данные из БД — это покажет заполненный чек-ин
    await loadCheckin(petId, selectedDate)
  }

  const selectedLabel = format(new Date(selectedDate+'T12:00:00'),'EEEE, d MMMM',{locale:ru})
  const canSave = appetite && activity && water

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar /></div>

      <div className="bg-white px-3 py-2 border-b border-[#F2F2F7]">
        <p className="text-[13px] font-bold text-[#1C1C1E] text-center mb-2 capitalize">{selectedLabel}</p>
        <div className="flex justify-around">
          {weekDays.map(d=>(
            <button key={d.date} onClick={()=>changeDate(d.date)} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-semibold text-[#8E8E93] capitalize">{d.day}</span>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold',
                d.date===selectedDate?'bg-[#FD6220] text-white':'text-[#8E8E93]')}>
                {d.num}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        {loading ? (
          <p className="text-center text-[#8E8E93] text-sm py-8">Загружаем...</p>

        ) : existing ? (
          // ЧЕК-ИН УЖЕ ЕСТЬ — показываем данные, редактировать нельзя
          <>
            {justSaved && (
              <div className="flex items-center gap-2 bg-[#F4FFF7] border border-[#C6EFD0] rounded-[13px] p-3">
                <Check size={14} className="text-green-500 flex-shrink-0" />
                <p className="text-[10px] font-bold text-[#1C1C1E]">Чек-ин сохранён!</p>
              </div>
            )}
            <div className="bg-white rounded-[13px] p-[10px_11px]" style={{background:'#F4FFF7',border:'0.5px solid #C6EFD0'}}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-[#1C1C1E]">✅ Чек-ин заполнен</span>
                <span className="text-[7px] font-bold text-[#8E8E93] bg-[#F2F2F7] px-1.5 py-0.5 rounded-[5px]">🔒 Закрыт</span>
              </div>
              {([
                ['Аппетит', APPETITE_LABEL[existing.appetite]||existing.appetite],
                ['Стул', `${existing.stool_count??0} раз · ${STOOL_LABEL[existing.stool_type]||existing.stool_type||'—'}`],
                ['Запах стула', existing.stool_smell===true?'Есть':existing.stool_smell===false?'Нет':'—'],
                ['Моча', `${existing.urine_count??0} раз · ${URINE_LABEL[existing.urine_volume]||existing.urine_volume||'—'}`],
                ['Активность', ACTIVITY_LABEL[existing.activity]||existing.activity],
                ['Вода', WATER_LABEL[existing.water_intake]||existing.water_intake],
                ...(existing.note?[['Заметки',existing.note]]:[]),
              ] as [string,string][]).map(([k,v])=>(
                <div key={k} className="flex justify-between py-1.5 border-b border-[#F2F2F7] last:border-0">
                  <span className="text-[8px] font-semibold text-[#8E8E93]">{k}</span>
                  <span className="text-[9px] font-bold text-[#1C1C1E]">{v}</span>
                </div>
              ))}
            </div>
            {isToday && (
              <div className="bg-[#FFF4EF] rounded-[13px] border border-[#FDD5C0] p-3 text-center">
                <p className="text-[10px] font-semibold text-[#FD6220]">Вы уже провели чек-ин сегодня.</p>
                <p className="text-[9px] text-[#8E8E93] mt-0.5">Возвращайтесь завтра 🐱</p>
              </div>
            )}
          </>

        ) : isToday ? (
          // СЕГОДНЯ, НЕТ ЗАПИСИ — показываем форму
          <>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-3">Аппетит *</div>
              <TapGrid options={APPETITE_OPTIONS} value={appetite} onChange={setAppetite} cols={3} />
            </div>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-2">Стул</div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7] mb-2">
                <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
                <Stepper value={stoolCount} onChange={setStoolCount} />
              </div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Характер</p>
              <TapGrid options={STOOL_TYPE_OPTIONS} value={stoolType} onChange={setStoolType} cols={3} />
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5 mt-2">Запах</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[{v:false,l:'Без запаха'},{v:true,l:'С запахом'}].map(o=>(
                  <button key={String(o.v)} onClick={()=>setStoolSmell(o.v)}
                    className={cn('rounded-[8px] py-[6px] border-[1.5px] cursor-pointer',
                      stoolSmell===o.v?'border-[#FD6220] bg-[#FFF4EF]':'border-[#E5E5EA] bg-white')}>
                    <span className={cn('text-[8px] font-semibold',stoolSmell===o.v?'text-[#FD6220]':'text-[#8E8E93]')}>{o.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-2">Мочеиспускание</div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7] mb-2">
                <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
                <Stepper value={urineCount} onChange={setUrineCount} />
              </div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Объём</p>
              <TapGrid options={URINE_VOLUME_OPTIONS} value={urineVolume} onChange={setUrineVolume} cols={2} />
            </div>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-2">Активность *</div>
              <TapGrid options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} cols={3} />
            </div>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-2">Вода *</div>
              <TapGrid options={WATER_OPTIONS} value={water} onChange={setWater} cols={2} />
            </div>
            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="text-[10px] font-bold text-[#1C1C1E] mb-2">
                Заметки <span className="text-[8px] font-normal text-[#8E8E93]">(необязательно)</span>
              </div>
              <textarea value={note} onChange={e=>setNote(e.target.value)}
                placeholder="Что-то необычное сегодня?" rows={2}
                className="w-full border border-[#E5E5EA] rounded-[8px] p-2 text-[10px] font-medium resize-none outline-none focus:border-[#FD6220]" />
            </div>
            <button onClick={save} disabled={!canSave||saving}
              className="bg-[#FD6220] text-white font-bold rounded-[10px] py-2.5 text-[10px] w-full disabled:opacity-50">
              {saving?'Сохраняем...':'Сохранить чек-ин'}
            </button>
          </>

        ) : (
          // ПРОШЛЫЙ ДЕНЬ без данных
          <div className="text-center py-12 text-[#8E8E93]">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-medium">Чек-ин за этот день не заполнен</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
