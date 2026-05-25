'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { router.push('/login'); return }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.error('Auth error:', error)
        router.push('/login?error=auth_failed')
      } else {
        router.push('/')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">🐱</div>
        <p className="text-[14px] font-semibold text-[#1C1C1E]">Входим...</p>
      </div>
    </div>
  )
}
