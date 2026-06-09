'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

interface PetContextType {
  pets: any[]
  activePet: any | null
  activePetId: string | null
  petId: string | null
  setActivePetId: (id: string) => void
  loading: boolean
  refetch: () => void
}

const PetContext = createContext<PetContextType>({
  pets: [], activePet: null, activePetId: null, petId: null,
  setActivePetId: () => {}, loading: false, refetch: () => {}
})

export function PetProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<any[]>([])
  const [activePetId, setActivePetIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setPets(data)
        const saved = localStorage.getItem('activePetId')
        const valid = saved && data.find((p: any) => p.id === saved)
        setActivePetIdState(valid ? saved : data[0].id)
      } else {
        setPets([])
        setActivePetIdState(null)
      }
    } catch (e) {
      console.error('Pet context error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load()
      if (event === 'SIGNED_OUT') {
        setPets([])
        setActivePetIdState(null)
        setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function setActivePetId(id: string) {
    setActivePetIdState(id)
    localStorage.setItem('activePetId', id)
  }

  const activePet = pets.find(p => p.id === activePetId) || null

  return (
    <PetContext.Provider value={{ pets, activePet, activePetId, petId: activePetId, setActivePetId, loading, refetch: load }}>
      {children}
    </PetContext.Provider>
  )
}

export function usePet() {
  return useContext(PetContext)
}
