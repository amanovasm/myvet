'use client'
import Link from 'next/link'
import { Settings, User, ChevronLeft } from 'lucide-react'

interface TopBarProps {
  petName?: string
  showBack?: boolean
  backHref?: string
  backLabel?: string
  title?: string
}

export default function TopBar({ petName, showBack, backHref = '/', backLabel = 'Назад', title }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#E5E5EA] z-50 flex items-center justify-between px-3 py-2"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}>
      {showBack ? (
        <Link href={backHref} className="flex items-center gap-1 text-[#FD6220] font-bold text-[12px]">
          <ChevronLeft size={16} /> {backLabel}
        </Link>
      ) : (
        <Link href="/" className="text-[#FD6220] font-bold text-[18px]">myvet</Link>
      )}
      {title && <span className="text-[13px] font-bold text-[#1C1C1E] absolute left-1/2 -translate-x-1/2">{title}</span>}
      <div className="flex items-center gap-2">
        {petName && (
          <span className="text-[11px] font-semibold text-[#1C1C1E] bg-[#F2F2F7] px-2 py-1 rounded-[8px]">
            🐱 {petName}
          </span>
        )}
        <Link href="/settings" className="w-7 h-7 rounded-[8px] bg-[#F2F2F7] flex items-center justify-center">
          <Settings size={14} className="text-[#8E8E93]" />
        </Link>
        <Link href="/pet" className="w-7 h-7 rounded-[8px] bg-[#F2F2F7] flex items-center justify-center">
          <User size={14} className="text-[#8E8E93]" />
        </Link>
      </div>
    </header>
  )
}
