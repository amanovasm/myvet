'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import { LogOut, User, Mail, Shield } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatar = user?.user_metadata?.avatar_url
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь'
  const email = user?.email
  const provider = user?.app_metadata?.provider

  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-[52px] pb-[72px]">
      <TopBar showBack backHref="/" backLabel="Главная" title="Профиль" />

      <div className="px-3 pt-4 flex flex-col gap-3">
        {/* Аватар и имя */}
        <div className="bg-white rounded-[16px] border border-[#E5E5EA] p-5 flex flex-col items-center gap-3">
          {avatar ? (
            <img src={avatar} alt={name} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#FFF4EF] flex items-center justify-center">
              <User size={28} className="text-[#FD6220]" />
            </div>
          )}
          <div className="text-center">
            <p className="text-[16px] font-bold text-[#1C1C1E]">{name}</p>
            {email && <p className="text-[12px] text-[#8E8E93] mt-0.5">{email}</p>}
          </div>
        </div>

        {/* Инфо */}
        <div className="bg-white rounded-[16px] border border-[#E5E5EA] overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F2F2F7]">
            <Mail size={16} className="text-[#8E8E93]" />
            <div className="flex-1">
              <p className="text-[10px] text-[#8E8E93] font-medium">Email</p>
              <p className="text-[13px] font-semibold text-[#1C1C1E]">{email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Shield size={16} className="text-[#8E8E93]" />
            <div className="flex-1">
              <p className="text-[10px] text-[#8E8E93] font-medium">Способ входа</p>
              <p className="text-[13px] font-semibold text-[#1C1C1E]">
                {provider === 'google' ? 'Google' : provider === 'email' ? 'Email' : provider || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Выход */}
        <button onClick={signOut} disabled={signingOut}
          className="w-full bg-white border border-[#FFD0D0] rounded-[16px] py-4 flex items-center justify-center gap-2 text-red-500 font-bold text-[14px] disabled:opacity-50">
          <LogOut size={16} />
          {signingOut ? 'Выходим...' : 'Выйти из аккаунта'}
        </button>

        <p className="text-center text-[10px] text-[#C7C7CC]">Myvet.kz · v4.0</p>
      </div>

      <BottomNav />
    </div>
  )
}
