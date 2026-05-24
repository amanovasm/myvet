import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const EVENT_LABELS: Record<string, string> = {
  seizure: 'Приступ', head_pressing: 'Хедпрессинг', food_refusal: 'Отказ от еды',
  loaf_position: 'Буханка', no_urine_24h: 'Нет мочи 24ч+', no_stool_48h: 'Нет стула 48ч+',
  vomiting: 'Рвота', strange_behavior: 'Странное поведение', claw_sharpening: 'Точение когтей',
  meowing: 'Мяуканье', chirping: 'Чириканье', active_play: 'Активные игры',
}
const evLabel = (key: string) => EVENT_LABELS[key] || key

const POST_ICTAL: Record<string, string> = {
  standard: 'Стандартная (поела)', atypical: 'Нетипичная',
}

const doseStr = (m: any) =>
  m.dose_amount ? `${m.dose_amount}${m.dose_unit || 'мг'}` : 'доза не указана'

export async function generateWeeklyDigest(petId: string): Promise<string> {
  const today = new Date()
  const weekAgo = subDays(today, 7)
  const monthAgo = subDays(today, 30)

  const [{ data: pet }, { data: checkins }, { data: events }, { data: meds }, { data: history }, { data: monthEvents }] = await Promise.all([
    supabase.from('pets').select('*').eq('id', petId).single(),
    supabase.from('daily_checkins').select('*').eq('pet_id', petId).gte('date', format(weekAgo, 'yyyy-MM-dd')).order('date'),
    supabase.from('health_events').select('*').eq('pet_id', petId).gte('occurred_at', weekAgo.toISOString()).order('occurred_at'),
    supabase.from('medications').select('*').eq('pet_id', petId).is('ended_at', null),
    supabase.from('health_events').select('*').eq('pet_id', petId).order('occurred_at', { ascending: false }).limit(100),
    supabase.from('health_events').select('*').eq('pet_id', petId).gte('occurred_at', monthAgo.toISOString()).eq('event_type', 'seizure'),
  ])

  const checkinText = (checkins || []).map(c =>
    `${c.date}: аппетит=${c.appetite}, стул=${c.stool_count}р/${c.stool_type||'—'}, моча=${c.urine_count}р/${c.urine_volume||'—'}, активность=${c.activity}, вода=${c.water_intake}`
  ).join('\n') || 'нет данных'

  const eventsText = (events || []).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM HH:mm')}: ${evLabel(e.event_type)}${e.duration_sec ? ` ${Math.round(e.duration_sec / 60)}мин` : ''}${e.description ? ` — ${e.description}` : ''}`
  ).join('\n') || 'событий не было'

  const medsText = (meds || []).map(m => `${m.name} ${doseStr(m)}`).join(', ') || 'нет данных'

  const historyText = (history || []).slice(0, 50).map(e =>
    `${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${evLabel(e.event_type)}${e.description ? ` — ${e.description.slice(0, 60)}` : ''}`
  ).join('\n') || 'нет истории'

  // Считаем приступы за месяц для определения кластера
  const seizuresThisWeek = (events || []).filter(e => e.event_type === 'seizure').length
  const seizuresThisMonth = (monthEvents || []).length
  const avgSeizuresPerWeek = seizuresThisMonth / 4

  // Анализируем тренд мочеиспускания
  const recentCheckins = (checkins || []).slice(-5)
  const urineTrend = recentCheckins.map(c => ({
    date: c.date,
    count: c.urine_count || 0,
    volume: c.urine_volume
  }))

  // Анализируем предвестники
  const appetiteTrend = recentCheckins.map(c => c.appetite)
  const activityTrend = recentCheckins.map(c => c.activity)

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Ты — умный медицинский ассистент для кошки по имени Мави с идиопатической эпилепсией, лекарственной энцефалопатией, панкреатитом и нерабочим детрузором мочевого пузыря.

ВАЖНЫЕ ЗНАНИЯ О МАВИ (из опыта владельца):
- Предвестники приступа: вялость + снижение аппетита + отказ от игр за 2-3 дня до
- Признаки проблем с мочевым пузырём: постепенное снижение мочеиспускания (2 дня без мочи → только ночной туалет → полное отсутствие)
- Хорошее самочувствие: чириканье, игры, лежание на спине, мочеиспускание 2-4 раза в день, тыгыдыки после туалета
- Кластер приступов (международный стандарт): 2+ приступа за 24 часа или 3+ за 7 дней

ДАННЫЕ ЗА НЕДЕЛЮ:
Чекины: ${checkinText}
События: ${eventsText}
Препараты: ${medsText}
Приступов за неделю: ${seizuresThisWeek}, за месяц: ${seizuresThisMonth} (среднее ${avgSeizuresPerWeek.toFixed(1)}/неделю)
Тренд мочеиспускания (последние дни): ${urineTrend.map(u => `${u.date}: ${u.count}р/${u.volume}`).join(', ')}

ИСТОРИЯ СОБЫТИЙ:
${historyText}

ЗАДАЧА: Создай структурированный дайджест с тремя блоками:

## 🔴 ТРЕВОГА (только если есть реальный повод)
Напиши ТОЛЬКО если: кластер приступов / моча отсутствует 2+ дня / отказ от еды 2+ дня / другие критичные сигналы.
Если тревоги нет — этот блок не включай.

## 🟡 НАБЛЮДЕНИЕ
Паттерны которые стоит отслеживать. Если видишь предвестники приступа — скажи прямо: "Наблюдается паттерн предшествующий приступу у Мави". Сравни с историей.

## 🟢 САМОЧУВСТВИЕ
Коротко: хорошая неделя или нет, что говорит о самочувствии.

## ❓ ВОПРОСЫ ДЛЯ ВРАЧА
Только если есть конкретный повод. Формулируй как вопросы которые стоит задать ветеринару — не диагнозы, а вопросы. Например: "Стоит ли обсудить с врачом связь между снижением мочеиспускания и текущей дозой X?"

Пиши на русском. Конкретно, без воды. Если всё хорошо — так и скажи.
Важно: ты не ставишь диагнозы. Ты помогаешь владельцу задать правильные вопросы врачу.`
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
  const activeMeds = (meds || []).filter(m => !m.ended_at || m.ended_at >= format(today, 'yyyy-MM-dd'))

  const lines: string[] = [
    'ОТЧЁТ ДЛЯ ВЕТЕРИНАРА',
    `Сформирован: ${format(today, 'd MMMM yyyy', { locale: ru })}`,
    `Период: ${format(from, 'd MMMM yyyy', { locale: ru })} — ${format(today, 'd MMMM yyyy', { locale: ru })}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    'ЖИВОТНОЕ',
    '━━━━━━━━━━━━━━━━━━━━━',
    `Имя: ${pet?.name}`,
    `Вид: ${pet?.species === 'cat' ? 'Кошка' : 'Собака'}${pet?.breed ? ` · ${pet.breed}` : ''}`,
    `Диагнозы: ${pet?.diagnoses || 'не указаны'}`,
    `Противопоказания: ${pet?.allergies || 'нет'}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    'ВЕС',
    '━━━━━━━━━━━━━━━━━━━━━',
    (weights || []).length > 0
      ? (weights || []).map(w => `${w.measured_at}: ${w.weight_kg} кг`).join('\n')
      : 'нет данных',
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    'ТЕКУЩАЯ СХЕМА ЛЕЧЕНИЯ',
    '━━━━━━━━━━━━━━━━━━━━━',
    activeMeds.length > 0
      ? activeMeds.map(m => `• ${m.name} — ${doseStr(m)} (с ${m.started_at}${m.ended_at ? ` по ${m.ended_at}` : ''})`).join('\n')
      : 'нет данных',
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    'ИЗМЕНЕНИЯ В СХЕМЕ',
    '━━━━━━━━━━━━━━━━━━━━━',
  ]

  const medsChanged = (meds || []).filter(m => m.started_at >= format(from, 'yyyy-MM-dd'))
  if (medsChanged.length > 0) {
    medsChanged.forEach(m => {
      lines.push(`${m.started_at}: ${m.name} ${doseStr(m)}${m.change_note ? ` — ${m.change_note}` : ''}`)
    })
  } else {
    lines.push('изменений не было')
  }

  lines.push('', `━━━━━━━━━━━━━━━━━━━━━`, `ПРИСТУПЫ (${seizures.length})`, '━━━━━━━━━━━━━━━━━━━━━')

  if (seizures.length > 0) {
    seizures.forEach(e => {
      let line = `${format(new Date(e.occurred_at), 'dd.MM.yyyy HH:mm')} [${e.identifier}]`
      if (e.duration_sec) line += ` · ${Math.round(e.duration_sec / 60)} мин`
      if (e.had_aura === true) line += ' · с аурой'
      if (e.had_aura === false) line += ' · без ауры'
      lines.push(line)
      if (e.observations_before) lines.push(`  До: ${e.observations_before}`)
      if (e.description) lines.push(`  Во время: ${e.description}`)
      if (e.post_ictal_type) {
        lines.push(`  Постиктал: ${POST_ICTAL[e.post_ictal_type] || e.post_ictal_type}${e.post_ictal_notes ? ` — ${e.post_ictal_notes}` : ''}`)
      }
      if (e.observations_after) lines.push(`  После: ${e.observations_after}`)
    })
  } else {
    lines.push('приступов не зафиксировано')
  }

  lines.push('', '━━━━━━━━━━━━━━━━━━━━━', 'НАБЛЮДЕНИЯ И СОБЫТИЯ', '━━━━━━━━━━━━━━━━━━━━━')

  const otherEvents = (events || []).filter(e =>
    e.event_type !== 'seizure' &&
    !e.event_type.startsWith('test_') &&
    !e.identifier?.startsWith('TEST-') &&
    !e.identifier?.startsWith('DEBUG-')
  )

  if (otherEvents.length > 0) {
    otherEvents.forEach(e => {
      const sign = e.direction === 'positive' ? '+' : e.direction === 'negative' ? '−' : '·'
      lines.push(`${sign} ${format(new Date(e.occurred_at), 'dd.MM.yyyy')}: ${evLabel(e.event_type)}${e.description ? ` — ${e.description}` : ''}`)
    })
  } else {
    lines.push('других наблюдений нет')
  }

  lines.push(
    '', '━━━━━━━━━━━━━━━━━━━━━', 'ДИНАМИКА', '━━━━━━━━━━━━━━━━━━━━━',
    `Дней с чек-инами: ${(checkins || []).length} из ${days}`,
    `Заметки для врача: ${pet?.vet_notes || 'нет'}`,
    '',
    'Отчёт сформирован приложением myvet.kz'
  )

  return lines.join('\n')
}
