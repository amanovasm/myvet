'use client'
import Link from 'next/link'
import { Settings, User, ChevronDown } from 'lucide-react'

interface TopBarProps {
  petName?: string
  showBack?: boolean
  backHref?: string
  backLabel?: string
  title?: string
  rightAction?: React.ReactNode
}

export default function TopBar({ petName, showBack, backHref, backLabel, title, rightAction }: TopBarProps) {
  if (showBack) {
    return (
      <div className="flex items-center justify-between px-3 py-2">
        <Link href={backHref || '/'} className="text-[#FD6220] text-[11px] font-bold flex items-center gap-0.5">
          ‹ {backLabel || 'Назад'}
        </Link>
        <span className="text-[12px] font-bold text-[#1C1C1E]">{title}</span>
        {rightAction || <div className="w-12" />}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[14px] font-bold text-[#FD6220]">myvet</span>
      <div className="flex items-center gap-1.5">
        {petName && (
          <div className="flex items-center gap-1 bg-[#F2F2F7] rounded-[8px] px-2 py-1">
            <span className="text-[11px]">🐱</span>
            <span className="text-[9px] font-bold text-[#1C1C1E]">{petName}</span>
            <ChevronDown size={10} className="text-[#8E8E93]" />
          </div>
        )}
        <Link href="/settings" className="w-6 h-6 rounded-[7px] bg-[#F2F2F7] flex items-center justify-center">
          <Settings size={12} className="text-[#8E8E93]" />
        </Link>
        <Link href="/pet" className="w-6 h-6 rounded-[7px] bg-[#F2F2F7] flex items-center justify-center">
          <User size={12} className="text-[#8E8E93]" />
        </Link>
      </div>
    </div>
  )
}
