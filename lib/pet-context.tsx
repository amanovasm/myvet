'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

interface PetContextType {
  pets: any[]
  activePet: any | null
  activePetId: string | null
  petId: string | null  // alias for activePetId
  setActivePetId: (id: string) => void
  loading: boolean
  refetch: () => void
}

const PetContext = createContext<PetContextType>({
  pets: [], activePet: null, activePetId: null, petId: null,
  setActivePetId: () => {}, loading: true, refetch: () => {}
})

export function PetProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<any[]>([])
  const [activePetId, setActivePetIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (data && data.length > 0) {
      setPets(data)
      // Restore last active pet from localStorage
      const saved = localStorage.getItem('activePetId')
      const valid = saved && data.find((p: any) => p.id === saved)
      setActivePetIdState(valid ? saved : data[0].id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
