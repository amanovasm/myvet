import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useCurrentPet() {
  const [petId, setPetId] = useState<string | null>(null)
  const [pet, setPet] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }
      setUserId(user.id)

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (data) {
        setPet(data)
        setPetId(data.id)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { pet, petId, userId, loading }
}
