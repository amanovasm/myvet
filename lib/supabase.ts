import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface Pet {
  id: string
  name: string
  species: 'cat' | 'dog'
  breed?: string
  birth_date?: string
  gender?: 'female' | 'male' | 'unknown'
  diagnoses?: string
  allergies?: string
  vet_notes?: string
  created_at: string
}

export interface WeightLog {
  id: string
  pet_id: string
  weight_kg: number
  measured_at: string
  note?: string
}

export interface DailyCheckin {
  id: string
  pet_id: string
  date: string
  appetite: string
  stool_count: number
  stool_type: string
  stool_smell: boolean
  urine_count: number
  urine_volume: string
  activity: string
  water_intake: string
  note?: string
  created_at: string
}

export interface HealthEvent {
  id: string
  pet_id: string
  identifier: string
  event_type: string
  direction: 'negative' | 'neutral' | 'positive'
  occurred_at: string
  duration_sec?: number
  had_aura?: boolean
  observations_before?: string
  description?: string
  post_ictal_type?: string
  post_ictal_notes?: string
  observations_after?: string
  created_at: string
}

export interface Medication {
  id: string
  pet_id: string
  name: string
  dose_amount?: number
  dose_unit?: string
  started_at: string
  ended_at?: string
  change_note?: string
  created_at: string
}

export interface MedicationSchedule {
  id: string
  medication_id: string
  pet_id: string
  scheduled_time: string
  dose_amount?: number
  dose_unit?: string
}

export interface MedicationDose {
  id: string
  pet_id: string
  medication_id: string
  schedule_id: string
  dose_date: string
  scheduled_time: string
  taken_at?: string
  skipped?: boolean
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
