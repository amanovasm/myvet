import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateRu(date: string | Date) {
  return format(new Date(date), 'd MMMM yyyy', { locale: ru })
}

export function formatDateTimeRu(date: string | Date) {
  return format(new Date(date), 'd MMMM yyyy, HH:mm', { locale: ru })
}

export function formatTimeRu(date: string | Date) {
  return format(new Date(date), 'HH:mm')
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { locale: ru, addSuffix: true })
}

export function durationLabel(seconds: number) {
  if (seconds < 60) return `${seconds} сек`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m} мин ${s} сек` : `${m} мин`
}

export function generateEventId(petName: string, date: Date, seq: number) {
  const name = petName.toUpperCase().slice(0, 4)
  const d = format(date, 'yyyy-MM-dd')
  return `${name}-${d}-${String(seq).padStart(3, '0')}`
}

export function getAge(birthDate: string) {
  const birth = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()
  if (years === 0) return `${months} мес`
  if (months < 0) return `${years - 1} лет`
  return `${years} лет`
}

export const APPETITE_OPTIONS = [
  { value: 'refused', label: 'Отказ' },
  { value: 'weak', label: 'Слабый' },
  { value: 'moderate', label: 'Умеренный' },
  { value: 'good', label: 'Хороший' },
  { value: 'excellent', label: 'Отличный' },
  { value: 'above_normal', label: 'Выше нормы' },
]

export const STOOL_TYPE_OPTIONS = [
  { value: 'formed', label: 'Сформир.' },
  { value: 'soft', label: 'Мягкий' },
  { value: 'liquid', label: 'Жидкий' },
  { value: 'dark', label: 'Тёмный' },
  { value: 'light', label: 'Светлый' },
  { value: 'refused', label: 'Нет стула' },
]

export const URINE_VOLUME_OPTIONS = [
  { value: 'low', label: 'Мало' },
  { value: 'normal', label: 'Норма' },
  { value: 'high', label: 'Много' },
  { value: 'refused', label: 'Нет мочи' },
]

export const ACTIVITY_OPTIONS = [
  { value: 'lethargic', label: 'Вялая' },
  { value: 'moderate', label: 'Средняя' },
  { value: 'active', label: 'Активная' },
]

export const WATER_OPTIONS = [
  { value: '100-200', label: '100–200 мл' },
  { value: '250-400', label: '250–400 мл' },
  { value: '450-600', label: '450–600 мл' },
  { value: '600+', label: 'Более 600 мл' },
  { value: 'refused', label: 'Отказ от воды' },
]

export const EVENT_TYPES = [
  { key: 'seizure', label: 'Приступ', direction: 'negative', emoji: '⚡' },
  { key: 'head_pressing', label: 'Хедпрессинг', direction: 'negative', emoji: '🔴' },
  { key: 'no_urine_24h', label: 'Нет мочи 24ч+', direction: 'negative', emoji: '🚫' },
  { key: 'no_stool_48h', label: 'Нет стула 48ч+', direction: 'negative', emoji: '🚫' },
  { key: 'vomiting', label: 'Рвота', direction: 'negative', emoji: '🤢' },
  { key: 'food_refusal', label: 'Отказ от еды', direction: 'negative', emoji: '❌' },
  { key: 'loaf_position', label: 'Буханка', direction: 'neutral', emoji: '🫙' },
  { key: 'strange_behavior', label: 'Странное поведение', direction: 'neutral', emoji: '❓' },
  { key: 'claw_sharpening', label: 'Точение когтей', direction: 'positive', emoji: '😸' },
  { key: 'meowing', label: 'Мяуканье', direction: 'positive', emoji: '🎵' },
  { key: 'chirping', label: 'Чириканье', direction: 'positive', emoji: '🐦' },
  { key: 'active_play', label: 'Активные игры', direction: 'positive', emoji: '⚡' },
  { key: 'other', label: 'Другое...', direction: 'neutral', emoji: '📝' },
]

export const DIRECTION_COLORS = {
  negative: { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-500', border: 'border-red-200' },
  neutral: { bg: 'bg-orange-50', text: 'text-orange-500', dot: 'bg-orange-400', border: 'border-orange-200' },
  positive: { bg: 'bg-green-50', text: 'text-green-500', dot: 'bg-green-500', border: 'border-green-200' },
}
