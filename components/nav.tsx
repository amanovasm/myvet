'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, Pill, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',            icon: Home,     label: 'Главная'  },
  { href: '/checkin',     icon: Heart,    label: 'Чек-ин'   },
  { href: '/events',      icon: Sparkles, label: 'События'  },
  { href: '/medications', icon: Pill,     label: 'Лечение'  },
  { href: '/report',      icon: FileText, label: 'Отчёт'   },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-2 pb-safe">
      <div className="flex justify-around">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-3 px-3 min-w-0',
                active ? 'text-teal-500' : 'text-gray-400'
              )}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn('text-[10px] font-medium', active ? 'text-teal-500' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
