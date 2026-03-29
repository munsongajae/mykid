'use client';

import { Home, Utensils, Calendar, FolderOpen } from 'lucide-react';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'meal', label: 'Meal', icon: Utensils },
  { id: 'archive', label: 'Files', icon: FolderOpen },
];


interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-48px)] max-w-md transition-all duration-500 animate-fade-in-up">
      <div className="bg-gray-900/90 backdrop-blur-2xl rounded-[32px] p-2 flex items-center justify-between shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-white/5 px-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-[var(--text-900)] shadow-xl scale-110' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
               <Icon size={isActive ? 18 : 20} className={isActive ? 'text-[var(--bg-primary)]' : ''} strokeWidth={isActive ? 3 : 2} />
               {isActive && (
                 <span className="text-[9px] font-black text-[var(--bg-primary)] mt-0.5 tracking-tighter uppercase whitespace-nowrap px-1">
                   {item.label}
                 </span>
               )}
            </button>

          );
        })}
      </div>
    </nav>
  );
}
