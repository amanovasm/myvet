'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, Star, Pill, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/checkin', icon: Heart, label: 'Чек-ин' },
  { href: '/events', icon: Star, label: 'События' },
  { href: '/medications', icon: Pill, label: 'Лечение' },
  { href: '/documents', icon: FolderOpen, label: 'Документы' },
]

export default function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[#E5E5EA] py-1.5 pb-safe bg-white z-50"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = path === href || (href !== '/' && path.startsWith(href + '/'))
        return (
          <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5">
            <Icon size={20} className={active ? 'text-[#FD6220]' : 'text-[#C7C7CC]'} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn('text-[7px] font-bold', active ? 'text-[#FD6220]' : 'text-[#C7C7CC]')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
