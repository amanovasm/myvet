'use client'
import { useEffect } from 'react'
import { usePet } from '@/lib/pet-context'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'
import Link from 'next/link'

export default function WelcomePage() {
  const { pets, loading } = usePet()
  const router = useRouter()

  useEffect(() => {
    if (!loading && pets.length > 0) {
      router.replace('/')
    }
  }, [pets, loading])

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#FD6220] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] pt-[52px] pb-[72px] flex flex-col">
      <TopBar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-6xl mb-2">🐾</div>
        <h1 className="text-[22px] font-bold text-center text-[#1C1C1E]">Добро пожаловать в myvet</h1>
        <p className="text-[14px] text-[#8E8E93] text-center leading-relaxed">Ведите дневник здоровья питомца, отслеживайте лечение и получайте AI-анализ</p>
        <Link href="/pet/new" className="w-full max-w-xs bg-[#FD6220] text-white font-bold rounded-[14px] py-4 text-[14px] text-center mt-2">
          + Добавить питомца
        </Link>
      </div>
      <BottomNav />
    </div>
  )
}
