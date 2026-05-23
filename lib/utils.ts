import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const APPETITE_LABELS  = { 1: 'Плохой',      2: 'Норма',      3: 'Хороший'  }
export const TOILET_LABELS    = { 1: 'Не ходила',   2: 'Норма',      3: 'Много'    }
export const ACTIVITY_LABELS  = { 1: 'Вялая',        2: 'Норма',      3: 'Активная' }

export const APPETITE_EMOJI   = { 1: '😔', 2: '😊', 3: '🌟' }
export const TOILET_EMOJI     = { 1: '❌', 2: '✅', 3: '💧' }
export const ACTIVITY_EMOJI   = { 1: '😴', 2: '😊', 3: '⚡' }

export const DIRECTION_COLORS = {
  negative: 'bg-coral-50 text-coral-500 border-coral-500',
  neutral:  'bg-amber-50  text-amber-500  border-amber-500',
  positive: 'bg-teal-50   text-teal-500   border-teal-500',
}

export const DIRECTION_LABELS = {
  negative: 'Тревожное',
  neutral:  'Нейтральное',
  positive: 'Позитивное',
}

// Генерация идентификатора health event: MAVI-2026-05-22-001
export function generateEventId(petName: string, date: Date, seq: number): string {
  const name = petName.toUpperCase().slice(0, 4)
  const dateStr = format(date, 'yyyy-MM-dd')
  const num = String(seq).padStart(3, '0')
  return `${name}-${dateStr}-${num}`
}

export function formatDateRu(date: string | Date): string {
  return format(new Date(date), 'd MMMM yyyy', { locale: ru })
}

export function formatDateTimeRu(date: string | Date): string {
  return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: ru })
}

export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return sec > 0 ? `${min} мин ${sec} сек` : `${min} мин`
}
