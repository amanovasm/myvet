import * as amplitude from '@amplitude/analytics-browser'

let initialized = false

export function initAmplitude() {
  if (initialized || typeof window === 'undefined') return
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY
  if (!apiKey) return
  amplitude.init(apiKey, { defaultTracking: true })
  initialized = true
}

export function trackEvent(name: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return
  initAmplitude()
  amplitude.track(name, props)
}

export function identifyUser(userId: string, email?: string) {
  if (typeof window === 'undefined') return
  initAmplitude()
  amplitude.setUserId(userId)
  if (email) {
    const identify = new amplitude.Identify()
    identify.set('email', email)
    amplitude.identify(identify)
  }
}

export const Events = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  PET_CREATED: 'pet_created',
  PET_SWITCHED: 'pet_switched',
  CHECKIN_COMPLETED: 'checkin_completed',
  HEALTH_EVENT_CREATED: 'health_event_created',
  MEDICATION_DOSE_TAKEN: 'medication_dose_taken',
  MEDICATION_CREATED: 'medication_created',
  MEDICATION_ENDED: 'medication_ended',
  DOCUMENT_UPLOADED: 'document_uploaded',
  LAB_RESULT_ADDED: 'lab_result_added',
  DIGEST_GENERATED: 'digest_generated',
}
