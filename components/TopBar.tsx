'use client'
import Link from 'next/link'
import { Settings, User, ChevronLeft, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { usePet } from '@/lib/pet-context'

interface TopBarProps {
  showBack?: boolean
  backHref?: string
  backLabel?: string
  title?: string
}

export default function TopBar({ showBack, backHref = '/', backLabel = 'Назад', title }: TopBarProps) {
  const { pets, activePet, setActivePetId } = usePet()
  const [showSwitcher, setShowSwitcher] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#E5E5EA] z-50 flex items-center justify-between px-3 h-[52px]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {showBack ? (
          <Link href={backHref} className="flex items-center gap-1 text-[#FD6220] font-bold text-[12px]">
            <ChevronLeft size={16} /> {backLabel}
          </Link>
        ) : (
          <Link href="/"><img src="/logo-sm.png" alt="myvet" style={{height: '26px', width: 'auto'}} /></Link>
        )}
        {title && <span className="text-[13px] font-bold text-[#1C1C1E] absolute left-1/2 -translate-x-1/2">{title}</span>}
        <div className="flex items-center gap-2">
          {/* Pet switcher - always clickable */}
          {activePet && (
            <button onClick={() => setShowSwitcher(!showSwitcher)}
              className="flex items-center gap-1 bg-[#FFF4EF] px-2 py-1 rounded-[8px] border border-[#FDD5C0]">
              <span className="text-[11px] font-bold text-[#FD6220]">{activePet.name}</span>
              <ChevronDown size={12} className="text-[#FD6220]" />
            </button>
          )}
          <Link href="/settings" className="w-7 h-7 rounded-[8px] bg-[#F2F2F7] flex items-center justify-center">
            <Settings size={14} className="text-[#8E8E93]" />
          </Link>
          <Link href="/profile" className="w-7 h-7 rounded-[8px] bg-[#F2F2F7] flex items-center justify-center">
            <User size={14} className="text-[#8E8E93]" />
          </Link>
        </div>
      </header>

      {/* Pet switcher dropdown */}
      {showSwitcher && (
        <div className="fixed top-[52px] right-3 z-50 bg-white rounded-[13px] border border-[#E5E5EA] shadow-sm overflow-hidden w-48">
          {pets.map((p: any) => (
            <button key={p.id} onClick={() => { setActivePetId(p.id); setShowSwitcher(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#FFF4EF] border-b border-[#F2F2F7] last:border-0">
              <span className="text-base">🐾</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-[#1C1C1E]">{p.name}</p>
                <p className="text-[9px] text-[#8E8E93]">{p.species || 'Питомец'}</p>
              </div>
              {p.id === activePet?.id && <span className="text-[#FD6220] text-[10px] font-bold">✓</span>}
            </button>
          ))}
          <Link href="/pet" onClick={() => setShowSwitcher(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-[#FD6220] bg-[#FFF4EF]">
            + Добавить питомца
          </Link>
        </div>
      )}
      {showSwitcher && <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />}
    </>
  )
}
