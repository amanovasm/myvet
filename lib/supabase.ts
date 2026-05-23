import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы из схемы БД
export type Appetite  = 1 | 2 | 3
export type Toilet    = 1 | 2 | 3
export type Activity  = 1 | 2 | 3
export type Direction = 'negative' | 'neutral' | 'positive'

export interface Pet {
  id: string
  name: string
  species: 'cat' | 'dog'
  breed?: string
  birth_date?: string
  gender?: 'male' | 'female' | 'unknown'
  diagnoses?: string
  allergies?: string
  vet_notes?: string
  created_at: string
}

export interface DailyCheckin {
  id: string
  pet_id: string
  date: string
  appetite: Appetite
  toilet: Toilet
  activity: Activity
  note?: string
  created_at: string
}

export interface HealthEvent {
  id: string
  pet_id: string
  identifier: string
  event_type: string
  direction: Direction
  occurred_at: string
  duration_sec?: number
  had_aura?: boolean
  observations?: string
  created_at: string
}

export interface Medication {
  id: string
  pet_id: string
  name: string
  dose_amount?: number
  dose_unit?: string
  frequency?: string
  started_at: string
  ended_at?: string
  change_note?: string
  created_at: string
}

export interface WeightLog {
  id: string
  pet_id: string
  weight_kg: number
  measured_at: string
  note?: string
  created_at: string
}

export interface AiDigest {
  id: string
  pet_id: string
  period_start: string
  period_end: string
  content: string
  created_at: string
}
