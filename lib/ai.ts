import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function generateWeeklyDigest(petId: string): Promise<string> {
  const today = new Date()
  const weekAgo = subDays(today, 7)

  const [{ data: pet }, { data: checkins }, { data: events }, { data: meds }, { data: history }] = await Promise.all([
    supabase.from('pets').select('*').eq('id', petId).single(),
    supabase.from('daily_checkins').select('*').eq('pet_id', petId).gte('date', format(weekAgo, 'yyyy-MM-dd')).order('date'),
    supabase.from('health_events').select('*').eq('pet_id', petId).gte('occurred_at', weekAgo.toISOString()).order('occurred_at'),
    supabase.from('medications').select('*').eq('pet_id', petId).is('ended_at', null),
    supabase.from('health_events').select('*').eq('pet_id', petId).order('occurred_at', { ascending: false }).limit(50),
  ])

  const checkinText = (checkins || []).map(c =>
    `${c.date}: аппетит=${c.appetite}, стул=${c.stool_count}р/${c.stool_type}, моча=${c.urine_count}р/${c.urine_volume}, активность=${c.activity}, вода=${c.water_intake}`
  ).join('\n') || 'нет данных'

  const eventsText = (events || []).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM HH:mm')}: ${e.event_type}${e.duration_sec ? ` ${Math.round(e.duration_sec / 60)}мин` : ''}${e.description ? ` — ${e.description}` : ''}`
  ).join('\n') || 'событий не было'

  const medsText = (meds || []).map(m => `${m.name} ${m.dose_amount}${m.dose_unit}`).join(', ') || 'нет данных'

  const historyText = (history || []).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${e.event_type}${e.description ? ` — ${e.description.slice(0, 80)}` : ''}`
  ).join('\n') || 'нет истории'

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Ты — ассистент для анализа здоровья животного. Твоя роль: находить паттерны в данных и показывать их владельцу языком истории животного. Ты не ставишь диагнозы. Ты говоришь: «в похожей ситуации раньше происходило вот это».

ЖИВОТНОЕ: ${pet?.name}, ${pet?.species === 'cat' ? 'кошка' : 'собака'}
ДИАГНОЗЫ: ${pet?.diagnoses || 'не указаны'}
ПРЕПАРАТЫ: ${medsText}

ЧЕКИНЫ ЗА НЕДЕЛЮ:
${checkinText}

СОБЫТИЯ ЗА НЕДЕЛЮ:
${eventsText}

ИСТОРИЯ (для паттернов):
${historyText}

Напиши дайджест. Структура:
1. Как прошла неделя (2-3 предложения)
2. Паттерны — что повторяется? Если есть похожие ситуации в истории — обязательно упомяни: «В похожей ситуации [дата] произошло...»
3. На что обратить внимание (не рекомендация — наблюдение)

Тон: спокойный, нейтральный. Пиши на русском. Максимум 200 слов.`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  await supabase.from('ai_digests').insert({
    pet_id: petId,
    period_start: format(weekAgo, 'yyyy-MM-dd'),
    period_end: format(today, 'yyyy-MM-dd'),
    content: text,
  })

  return text
}

export async function generateVetReport(petId: string, days = 90): Promise<string> {
  const today = new Date()
  const from = subDays(today, days)

  const [{ data: pet }, { data: checkins }, { data: events }, { data: meds }, { data: weights }] = await Promise.all([
    supabase.from('pets').select('*').eq('id', petId).single(),
    supabase.from('daily_checkins').select('*').eq('pet_id', petId).gte('date', format(from, 'yyyy-MM-dd')).order('date'),
    supabase.from('health_events').select('*').eq('pet_id', petId).gte('occurred_at', from.toISOString()).order('occurred_at'),
    supabase.from('medications').select('*').eq('pet_id', petId).order('started_at', { ascending: false }),
    supabase.from('weight_log').select('*').eq('pet_id', petId).order('measured_at', { ascending: false }).limit(5),
  ])

  const seizures = (events || []).filter(e => e.event_type === 'seizure')
  const activeMeds = (meds || []).filter(m => !m.ended_at)

  const EVENT_LABELS: Record<string, string> = {
    seizure: 'Приступ', head_pressing: 'Хедпрессинг', food_refusal: 'Отказ от еды',
    loaf_position: 'Буханка', no_urine_24h: 'Нет мочи 24ч+', no_stool_48h: 'Нет стула 48ч+',
    vomiting: 'Рвота', strange_behavior: 'Странное поведение', claw_sharpening: 'Точение когтей',
    meowing: 'Мяуканье', chirping: 'Чириканье', active_play: 'Активные игры',
  }
  const evLabel = (key: string) => EVENT_LABELS[key] || key
  const POST_ICTAL: Record<string, string> = { standard: 'Стандартная (поела)', atypical: 'Нетипичная' }
  const doseStr = (m: any) => m.dose_amount ? `${m.dose_amount}${m.dose_unit || 'мг'}` : 'доза не указана'

  return `ОТЧЁТ ДЛЯ ВЕТЕРИНАРА
Сформирован: ${format(today, 'd MMMM yyyy', { locale: ru })}
Период: ${format(from, 'd MMMM yyyy', { locale: ru })} — ${format(today, 'd MMMM yyyy', { locale: ru })}

━━━━━━━━━━━━━━━━━━━━━
ЖИВОТНОЕ
━━━━━━━━━━━━━━━━━━━━━
Имя: ${pet?.name}
Вид: ${pet?.species === 'cat' ? 'Кошка' : 'Собака'}${pet?.breed ? ` · ${pet.breed}` : ''}
Диагнозы: ${pet?.diagnoses || 'не указаны'}
Противопоказания: ${pet?.allergies || 'нет'}

━━━━━━━━━━━━━━━━━━━━━
ВЕС
━━━━━━━━━━━━━━━━━━━━━
${(weights || []).map(w => `${w.measured_at}: ${w.weight_kg} кг`).join('\n') || 'нет данных'}

━━━━━━━━━━━━━━━━━━━━━
ТЕКУЩАЯ СХЕМА ЛЕЧЕНИЯ
━━━━━━━━━━━━━━━━━━━━━
${activeMeds.map(m => `• ${m.name} — ${doseStr(m)} (с ${m.started_at})`).join('\n') || 'нет данных'}

━━━━━━━━━━━━━━━━━━━━━
ИЗМЕНЕНИЯ В СХЕМЕ
━━━━━━━━━━━━━━━━━━━━━
${(meds || []).filter(m => m.started_at >= format(from, 'yyyy-MM-dd')).map(m => `${m.started_at}: ${m.name} ${doseStr(m)}${m.change_note ? \` — \${m.change_note}\` : ''}`).join('\n') || 'изменений не было'}

━━━━━━━━━━━━━━━━━━━━━
ПРИСТУПЫ (${seizures.length})
━━━━━━━━━━━━━━━━━━━━━
${seizures.map(e => `${format(new Date(e.occurred_at), 'dd.MM.yyyy HH:mm')} [${e.identifier}]${e.duration_sec ? ` · ${Math.round(e.duration_sec / 60)} мин` : ''}${e.had_aura ? ' · с аурой' : ''}${e.description ? `\n  ${e.description}` : ''}${e.post_ictal_type ? `\n  Постиктал: ${POST_ICTAL[e.post_ictal_type] || e.post_ictal_type}${e.post_ictal_notes ? \` — \${e.post_ictal_notes}\` : ''}` : ''}`).join('\n\n') || 'приступов не зафиксировано'}

━━━━━━━━━━━━━━━━━━━━━
ДРУГИЕ СОБЫТИЯ
━━━━━━━━━━━━━━━━━━━━━
${(events || []).filter(e => e.event_type !== 'seizure').map(e => `${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${evLabel(e.event_type)}${e.description ? \` — \${e.description}\` : ''}`).join('\n') || 'других событий нет'}

━━━━━━━━━━━━━━━━━━━━━
ДИНАМИКА
━━━━━━━━━━━━━━━━━━━━━
Дней с чек-инами: ${(checkins || []).length} из ${days}
Заметки для врача: ${pet?.vet_notes || 'нет'}

Отчёт сформирован приложением myvet.kz`
}
