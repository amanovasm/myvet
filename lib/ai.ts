import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'
import { format, subDays } from 'date-fns'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function generateWeeklyDigest(petId: string): Promise<string> {
  const today = new Date()
  const weekAgo = subDays(today, 7)

  // Собираем все данные за неделю
  const [checkins, events, medications, allEvents] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('*')
      .eq('pet_id', petId)
      .gte('date', format(weekAgo, 'yyyy-MM-dd'))
      .order('date', { ascending: true }),

    supabase
      .from('health_events')
      .select('*')
      .eq('pet_id', petId)
      .gte('occurred_at', weekAgo.toISOString())
      .order('occurred_at', { ascending: true }),

    supabase
      .from('medications')
      .select('*')
      .eq('pet_id', petId)
      .is('ended_at', null)
      .order('started_at', { ascending: false }),

    // Вся история для поиска похожих паттернов
    supabase
      .from('health_events')
      .select('*')
      .eq('pet_id', petId)
      .order('occurred_at', { ascending: false })
      .limit(100),
  ])

  const APPETITE_LABELS  = { 1: 'плохой', 2: 'нормальный', 3: 'хороший' }
  const TOILET_LABELS    = { 1: 'не ходила', 2: 'нормально', 3: 'много' }
  const ACTIVITY_LABELS  = { 1: 'вялая', 2: 'нормальная', 3: 'активная' }

  const checkinText = (checkins.data || []).map(c =>
    `${c.date}: аппетит=${APPETITE_LABELS[c.appetite as 1|2|3]}, туалет=${TOILET_LABELS[c.toilet as 1|2|3]}, активность=${ACTIVITY_LABELS[c.activity as 1|2|3]}${c.note ? `, заметка: ${c.note}` : ''}`
  ).join('\n')

  const eventsText = (events.data || []).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM HH:mm')}: ${e.event_type} (${e.direction})${e.duration_sec ? `, длительность ${Math.round(e.duration_sec/60)} мин` : ''}${e.had_aura !== null ? `, аура: ${e.had_aura ? 'да' : 'нет'}` : ''}${e.observations ? `, наблюдения: ${e.observations}` : ''}`
  ).join('\n')

  const medsText = (medications.data || []).map(m =>
    `${m.name} ${m.dose_amount}${m.dose_unit}, ${m.frequency} (с ${m.started_at})`
  ).join('\n')

  const historyText = (allEvents.data || []).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${e.event_type}${e.observations ? ` — ${e.observations.slice(0, 100)}` : ''}`
  ).join('\n')

  const prompt = `Ты — ассистент для анализа здоровья животного. Твоя роль: находить паттерны в данных наблюдений и показывать их владельцу. Ты не ставишь диагнозы и не даёшь медицинских рекомендаций от себя. Ты говоришь языком истории: «в похожей ситуации раньше происходило вот это».

ДАННЫЕ ЗА ПОСЛЕДНИЕ 7 ДНЕЙ:

Ежедневные чек-ины:
${checkinText || 'нет данных'}

Health events:
${eventsText || 'событий не было'}

Текущие препараты:
${medsText || 'нет данных'}

ИСТОРИЯ СОБЫТИЙ (для поиска паттернов):
${historyText || 'нет истории'}

ЗАДАЧА:
Напиши еженедельный дайджест. Структура:
1. Коротко — как прошла неделя (2-3 предложения)
2. Паттерны — что повторяется? Есть ли связи между событиями? Если есть похожие ситуации в истории — обязательно упомяни: «В похожей ситуации [дата] произошло...»
3. На что обратить внимание на следующей неделе (не рекомендация, а наблюдение)

Тон: спокойный, нейтральный. Не пугай. Не используй медицинские термины без необходимости. Пиши на русском языке. Максимум 200 слов.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Сохраняем дайджест в БД
  await supabase.from('ai_digests').insert({
    pet_id: petId,
    period_start: format(weekAgo, 'yyyy-MM-dd'),
    period_end: format(today, 'yyyy-MM-dd'),
    content: content.text,
  })

  return content.text
}

// Генерация отчёта для врача
export async function generateVetReport(petId: string, days: number = 90): Promise<string> {
  const today = new Date()
  const from = subDays(today, days)

  const [pet, checkins, events, medications, weights] = await Promise.all([
    supabase.from('pets').select('*').eq('id', petId).single(),
    supabase.from('daily_checkins').select('*').eq('pet_id', petId).gte('date', format(from, 'yyyy-MM-dd')).order('date'),
    supabase.from('health_events').select('*').eq('pet_id', petId).gte('occurred_at', from.toISOString()).order('occurred_at'),
    supabase.from('medications').select('*').eq('pet_id', petId).order('started_at', { ascending: false }),
    supabase.from('weight_log').select('*').eq('pet_id', petId).order('measured_at', { ascending: false }).limit(5),
  ])

  const p = pet.data
  const seizures = (events.data || []).filter(e => e.event_type === 'seizure')

  let report = `ОТЧЁТ ДЛЯ ВЕТЕРИНАРА
Сформирован: ${format(today, 'dd.MM.yyyy')}
Период: ${format(from, 'dd.MM.yyyy')} — ${format(today, 'dd.MM.yyyy')}

━━━━━━━━━━━━━━━━━━━━━━━━
ЖИВОТНОЕ
━━━━━━━━━━━━━━━━━━━━━━━━
Имя: ${p?.name}
Вид: ${p?.species === 'cat' ? 'Кошка' : 'Собака'}
Порода: ${p?.breed || 'не указана'}
Диагнозы: ${p?.diagnoses || 'не указаны'}
Аллергии/противопоказания: ${p?.allergies || 'нет'}

━━━━━━━━━━━━━━━━━━━━━━━━
ВЕС
━━━━━━━━━━━━━━━━━━━━━━━━
${(weights.data || []).map(w => `${w.measured_at}: ${w.weight_kg} кг`).join('\n') || 'нет данных'}

━━━━━━━━━━━━━━━━━━━━━━━━
ТЕКУЩАЯ СХЕМА ЛЕЧЕНИЯ
━━━━━━━━━━━━━━━━━━━━━━━━
${(medications.data || []).filter(m => !m.ended_at).map(m =>
  `• ${m.name} — ${m.dose_amount}${m.dose_unit}, ${m.frequency} (с ${m.started_at})`
).join('\n') || 'нет данных'}

━━━━━━━━━━━━━━━━━━━━━━━━
ИЗМЕНЕНИЯ В ЛЕЧЕНИИ ЗА ПЕРИОД
━━━━━━━━━━━━━━━━━━━━━━━━
${(medications.data || []).filter(m => m.started_at >= format(from, 'yyyy-MM-dd')).map(m =>
  `${m.started_at}: ${m.name} ${m.dose_amount}${m.dose_unit}${m.change_note ? ` — ${m.change_note}` : ''}`
).join('\n') || 'изменений не было'}

━━━━━━━━━━━━━━━━━━━━━━━━
ПРИСТУПЫ (${seizures.length} за период)
━━━━━━━━━━━━━━━━━━━━━━━━
${seizures.map(e =>
  `${format(new Date(e.occurred_at), 'dd.MM.yyyy HH:mm')} [${e.identifier}]${e.duration_sec ? ` — ${Math.round(e.duration_sec/60)} мин` : ''}${e.had_aura ? ', с аурой' : ''}${e.observations ? `\n  ${e.observations}` : ''}`
).join('\n') || 'приступов не зафиксировано'}

━━━━━━━━━━━━━━━━━━━━━━━━
ДРУГИЕ HEALTH EVENTS
━━━━━━━━━━━━━━━━━━━━━━━━
${(events.data || []).filter(e => e.event_type !== 'seizure').map(e =>
  `${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${e.event_type}${e.observations ? ` — ${e.observations}` : ''}`
).join('\n') || 'других событий не зафиксировано'}

━━━━━━━━━━━━━━━━━━━━━━━━
ДИНАМИКА СОСТОЯНИЯ
━━━━━━━━━━━━━━━━━━━━━━━━
Дней с данными: ${(checkins.data || []).length} из ${days}
Среднее аппетита: ${((checkins.data || []).reduce((s,c) => s + c.appetite, 0) / Math.max((checkins.data||[]).length, 1)).toFixed(1)} / 3
Средняя активность: ${((checkins.data || []).reduce((s,c) => s + c.activity, 0) / Math.max((checkins.data||[]).length, 1)).toFixed(1)} / 3

━━━━━━━━━━━━━━━━━━━━━━━━
ЗАМЕТКИ ДЛЯ ВРАЧА
━━━━━━━━━━━━━━━━━━━━━━━━
${p?.vet_notes || 'нет'}

Отчёт сформирован приложением myvet.kz`

  return report
}
