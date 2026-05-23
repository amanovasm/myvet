import TopBar from '@/components/TopBar'
import BottomNav from '@/components/BottomNav'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col pb-16">
      <div className="bg-white"><TopBar showBack backHref="/" backLabel="Главная" title="Настройки" /></div>
      <div className="px-3 py-3 flex flex-col gap-3">
        <div className="card">
          <p className="text-[10px] text-[#8E8E93]">Настройки будут добавлены в следующей версии.</p>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
