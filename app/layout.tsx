import type { Metadata } from 'next'
import './globals.css'
import { PetProvider } from '@/lib/pet-context'
import AmplitudeInit from '@/components/AmplitudeInit'

export const metadata: Metadata = {
  title: 'myvet — здоровье питомца',
  description: 'Дневник здоровья для питомца',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'myvet' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#FD6220" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-[#F2F2F7]">
        <AmplitudeInit />
        <PetProvider>
          <div className="max-w-md mx-auto min-h-screen relative">
            {children}
          </div>
        </PetProvider>
      </body>
    </html>
  )
}
