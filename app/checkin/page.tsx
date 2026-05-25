'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useCurrentPet } from '@/lib/hooks'
import { cn, APPETITE_OPTIONS, STOOL_TYPE_OPTIONS, URINE_VOLUME_OPTIONS, ACTIVITY_OPTIONS, WATER_OPTIONS } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

const APPETITE_LABEL: Record<string,string> = { refused:'Отказ',weak:'Слабый',moderate:'Умеренный',good:'Хороший',excellent:'Отличный',above_normal:'Выше нормы' }
const ACTIVITY_LABEL: Record<string,string> = { lethargic:'Вялая',moderate:'Средняя',active:'Активная' }
const WATER_LABEL: Record<string,string> = { refused:'Отказ','100-200':'100–200 мл','250-400':'250–400 мл','450-600':'450–600 мл','600+':'Более 600 мл' }
const STOOL_LABEL: Record<string,string> = { formed:'Сформир.',soft:'Мягкий',liquid:'Жидкий',dark:'Тёмный',light:'Светлый',refused:'Нет стула' }
const URINE_LABEL: Record<string,string> = { low:'Мало',normal:'Норма',high:'Много',refused:'Нет мочи' }

function TapGrid({ options, value, onChange, cols=3 }: { options:{value:string;label:string}[]; value:string; onChange:(v:string)=>void; cols?:number }) {
  return (
    <div className={`grid gap-1.5 ${cols===2?'grid-cols-2':'grid-cols-3'}`}>
      {options.map(opt=>(
        <button key={opt.value} onClick={()=>onChange(opt.value)}
          className={cn('rounded-[8px] py-[6px] px-[3px] text-center border-[1.5px] cursor-pointer',
            value===opt.value?'border-[#FD6220] bg-[#FFF4EF]':'border-[#E5E5EA] bg-white',
            opt.value==='refused'&&'col-span-full')}>
          <span className={cn('text-[8px] font-semibold',value===opt.value?'text-[#FD6220]':'text-[#8E8E93]')}>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

function Stepper({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={()=>onChange(Math.max(0,value-1))} className="w-7 h-7 rounded-[6px] bg-[#F2F2F7] font-bold text-base flex items-center justify-center">−</button>
      <span className="text-[13px] font-bold text-[#1C1C1E] min-w-[20px] text-center">{value}</span>
      <button onClick={()=>onChange(Math.min(20,value+1))} className="w-7 h-7 rounded-[6px] bg-[#F2F2F7] font-bold text-base flex items-center justify-center">+</button>
    </div>
  )
}

export default function CheckinPage() {
  const [petId, setPetId] = useState<string|null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(),'yyyy-MM-dd'))
  const [checkin, setCheckin] = useState<any>(null)   // null = нет записи, object = есть запись
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

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

  // Загружаем через API (серверная проверка)
  const loadCheckin = useCallback(async (pid:string, date:string) => {
    setLoading(true)
    setCheckin(null)
    try {
      const res = await fetch(`/api/checkin?petId=${pid}&date=${date}`)
      const json = await res.json()
      setCheckin(json.checkin) // null если нет, объект если есть
    } catch {
      setCheckin(null)
    }
    setLoading(false)
  }, [])

  useEffect(()=>{
    ;(async()=>{
      const {data:{user}} = await supabase.auth.getUser()
      if (!user){window.location.href='/login';return}
      const {data} = await supabase.from('pets').select('id').eq('user_id',user.id).limit(1).single()
      if (data){setPetId(data.id);loadCheckin(data.id,today)}
      else setLoading(false)
    })()
  },[loadCheckin, today])

  function changeDate(d:string){
    setSelectedDate(d)
    setErrors([])
    setAppetite(''); setStoolCount(0); setStoolType(''); setStoolSmell(null)
    setUrineCount(0); setUrineVolume(''); setActivity(''); setWater(''); setNote('')
    if (petId) loadCheckin(petId, d)
  }

  function validate():string[]{
    const errs:string[] = []
    if (!appetite) errs.push('Укажите аппетит')
    const stoolOk = stoolType==='refused' || (stoolCount>0 && stoolType!=='')
    if (!stoolOk) errs.push('Стул: укажите количество раз и характер, или выберите «Нет стула»')
    const urineOk = urineVolume==='refused' || (urineCount>0 && urineVolume!=='')
    if (!urineOk) errs.push('Моча: укажите количество раз и объём, или выберите «Нет мочи»')
    if (!activity) errs.push('Укажите активность')
    if (!water) errs.push('Укажите потребление воды')
    return errs
  }

  async function save(){
    const errs = validate()
    if (errs.length>0) { setErrors(errs); return }
    if (!petId) return
    setSaving(true)
    setErrors([])

    // Используем API — там серверная проверка на дубли
    const res = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId, date: selectedDate,
        appetite,
        stool_count: stoolType==='refused' ? 0 : stoolCount,
        stool_type: stoolType||null,
        stool_smell: stoolSmell,
        urine_count: urineVolume==='refused' ? 0 : urineCount,
        urine_volume: urineVolume||null,
        activity,
        water_intake: water,
        note: note||null,
      })
    })
    const json = await res.json()
    setSaving(false)

    if (json.checkin) {
      // Устанавливаем запись — форма мгновенно скрывается
      setCheckin(json.checkin)
    }
  }

  const selectedLabel = format(new Date(selectedDate+'T12:00:00'),'EEEE, d MMMM',{locale:ru})

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pt-[52px] pb-[72px]">
      <div className="bg-white"><TopBar /></div>

      {/* Недельный скроллер */}
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

        ) : checkin ? (
          // ── УЖЕ ЗАПОЛНЕН — показываем данные, форма недоступна ──
          <>
            <div className="bg-[#FFF4EF] rounded-[13px] border border-[#FDD5C0] p-3 flex items-start gap-3">
              <span className="text-xl mt-0.5">🔒</span>
              <div>
                <p className="text-[11px] font-bold text-[#FD6220]">
                  {isToday ? 'Вы уже сделали чек-ин сегодня' : 'Чек-ин за этот день заполнен'}
                </p>
                {isToday && <p className="text-[9px] text-[#8E8E93] mt-0.5">Возвращайтесь завтра 🐱</p>}
              </div>
            </div>

            <div className="bg-white rounded-[13px] p-[10px_11px]" style={{background:'#F4FFF7',border:'0.5px solid #C6EFD0'}}>
              <p className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wide mb-2">Данные чек-ина</p>
              {([
                ['Аппетит', APPETITE_LABEL[checkin.appetite]||checkin.appetite||'—'],
                ['Стул', checkin.stool_type==='refused'?'Нет стула':`${checkin.stool_count??0} раз · ${STOOL_LABEL[checkin.stool_type]||checkin.stool_type||'—'}`],
                ['Запах стула', checkin.stool_smell===true?'Есть':checkin.stool_smell===false?'Нет':'—'],
                ['Моча', checkin.urine_volume==='refused'?'Нет мочи':`${checkin.urine_count??0} раз · ${URINE_LABEL[checkin.urine_volume]||checkin.urine_volume||'—'}`],
                ['Активность', ACTIVITY_LABEL[checkin.activity]||checkin.activity||'—'],
                ['Вода', WATER_LABEL[checkin.water_intake]||checkin.water_intake||'—'],
                ...(checkin.note?[['Заметки',checkin.note]]:[]),
              ] as [string,string][]).map(([k,v])=>(
                <div key={k} className="flex justify-between py-1.5 border-b border-[#F2F2F7] last:border-0">
                  <span className="text-[8px] font-semibold text-[#8E8E93]">{k}</span>
                  <span className="text-[9px] font-bold text-[#1C1C1E] text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
          </>

        ) : isToday ? (
          // ── ФОРМА — только для сегодняшнего дня без записи ──
          <>
            {errors.length>0 && (
              <div className="bg-red-50 border border-red-200 rounded-[13px] p-3">
                <p className="text-[9px] font-bold text-red-500 mb-1">Заполните обязательные поля:</p>
                {errors.map((e,i)=><p key={i} className="text-[8px] text-red-400">· {e}</p>)}
              </div>
            )}

            <div className={cn('bg-white rounded-[13px] border p-[10px_11px]', errors.some(e=>e.includes('аппетит'))?'border-red-300':'border-[#E5E5EA]')}>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-[#1C1C1E]">Аппетит</span>
                <span className="text-[8px] text-red-400 font-bold">*</span>
              </div>
              <TapGrid options={APPETITE_OPTIONS} value={appetite} onChange={setAppetite} cols={3} />
            </div>

            <div className={cn('bg-white rounded-[13px] border p-[10px_11px]', errors.some(e=>e.includes('Стул'))?'border-red-300':'border-[#E5E5EA]')}>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-[#1C1C1E]">Стул</span>
                <span className="text-[8px] text-red-400 font-bold">*</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7] mb-2">
                <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
                <Stepper value={stoolCount} onChange={setStoolCount} />
              </div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Характер</p>
              <TapGrid options={STOOL_TYPE_OPTIONS} value={stoolType} onChange={setStoolType} cols={3} />
              {stoolType && stoolType!=='refused' && (
                <>
                  <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5 mt-2">Запах</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{v:false,l:'Без запаха'},{v:true,l:'С запахом'}].map(o=>(
                      <button key={String(o.v)} onClick={()=>setStoolSmell(o.v)}
                        className={cn('rounded-[8px] py-[6px] border-[1.5px]',stoolSmell===o.v?'border-[#FD6220] bg-[#FFF4EF]':'border-[#E5E5EA] bg-white')}>
                        <span className={cn('text-[8px] font-semibold',stoolSmell===o.v?'text-[#FD6220]':'text-[#8E8E93]')}>{o.l}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={cn('bg-white rounded-[13px] border p-[10px_11px]', errors.some(e=>e.includes('Моча'))?'border-red-300':'border-[#E5E5EA]')}>
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-[#1C1C1E]">Мочеиспускание</span>
                <span className="text-[8px] text-red-400 font-bold">*</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#F2F2F7] mb-2">
                <span className="text-[9px] font-medium text-[#3C3C43]">Количество раз</span>
                <Stepper value={urineCount} onChange={setUrineCount} />
              </div>
              <p className="text-[8px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1.5">Объём</p>
              <TapGrid options={URINE_VOLUME_OPTIONS} value={urineVolume} onChange={setUrineVolume} cols={2} />
            </div>

            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-[#1C1C1E]">Активность</span>
                <span className="text-[8px] text-red-400 font-bold">*</span>
              </div>
              <TapGrid options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} cols={3} />
            </div>

            <div className="bg-white rounded-[13px] border border-[#E5E5EA] p-[10px_11px]">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-[#1C1C1E]">Вода</span>
                <span className="text-[8px] text-red-400 font-bold">*</span>
              </div>
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

            <button onClick={save} disabled={saving}
              className="bg-[#FD6220] text-white font-bold rounded-[10px] py-3 text-[11px] w-full disabled:opacity-50">
              {saving?'Сохраняем...':'Сохранить чек-ин'}
            </button>
          </>

        ) : (
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
