'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // If already logged in, redirect to home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.push('/')
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) router.push('/')
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  async function signInWithEmail() {
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setEmailSent(true); setLoading(false) }
  }

  if (emailSent) return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
      <div className="bg-white rounded-[20px] p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📧</div>
        <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-2">Письмо отправлено!</h2>
        <p className="text-[13px] text-[#8E8E93] mb-1">Открой письмо на</p>
        <p className="text-[14px] font-bold text-[#FD6220] mb-4">{email}</p>
        <p className="text-[12px] text-[#8E8E93] mb-6">Нажми кнопку «Войти в Myvet» в письме</p>
        <button onClick={() => setEmailSent(false)}
          className="w-full bg-[#F2F2F7] text-[#8E8E93] font-bold rounded-[12px] py-3 text-[13px]">Назад</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-[#FD6220] rounded-t-[20px] p-8 text-center">
          <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center mx-auto mb-3 text-3xl">🐱</div>
          <h1 className="text-white text-[24px] font-bold">Myvet.kz</h1>
          <p className="text-white/80 text-[13px] mt-1">Дневник здоровья питомца</p>
        </div>
        <div className="bg-white rounded-b-[20px] p-6">
          <h2 className="text-[16px] font-bold text-[#1C1C1E] text-center mb-1">Добро пожаловать</h2>
          <p className="text-[13px] text-[#8E8E93] text-center mb-6">Войди чтобы следить за здоровьем питомца</p>
          {error && <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 mb-4"><p className="text-[11px] text-red-500">{error}</p></div>}
          <button onClick={signInWithGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-[1.5px] border-[#E5E5EA] rounded-[12px] py-3 text-[14px] font-semibold text-[#1C1C1E] mb-4 disabled:opacity-50">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
            </svg>
            {loading ? 'Входим...' : 'Войти через Google'}
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#E5E5EA]" />
            <span className="text-[11px] text-[#8E8E93]">или</span>
            <div className="flex-1 h-px bg-[#E5E5EA]" />
          </div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email для входа по ссылке"
            className="w-full border border-[#E5E5EA] rounded-[10px] p-3 text-[13px] outline-none focus:border-[#FD6220] mb-3" />
          <button onClick={signInWithEmail} disabled={!email || loading}
            className="w-full bg-[#F2F2F7] text-[#1C1C1E] font-semibold rounded-[12px] py-3 text-[13px] disabled:opacity-50">
            Получить ссылку на почту
          </button>
          <p className="text-[11px] text-[#8E8E93] text-center mt-4">
            Регистрация происходит автоматически при первом входе
          </p>
        </div>
      </div>
    </div>
  )
}
