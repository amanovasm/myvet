'use client'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function ConfirmInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) { window.location.href = '/login'; return }
    
    supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
      if (error) {
        console.error('Auth error:', error)
        window.location.href = '/login?error=auth_failed'
      } else {
        // Full page reload so cookies are set properly
        window.location.href = '/'
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🐱</div>
        <p className="text-[16px] font-bold text-[#1C1C1E] mb-1">Входим в Myvet...</p>
        <p className="text-[12px] text-[#8E8E93]">Пожалуйста подожди</p>
      </div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-4xl">🐱</div>
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  )
}
