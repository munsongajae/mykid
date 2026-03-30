'use client';

import { Home, Utensils, Calendar, FolderOpen, Heart, Sparkles, Star, Rocket } from 'lucide-react';

const navItems = [
  { id: 'home', label: '홈', icon: Home, color: 'blue' },
  { id: 'schedule', label: '일정', icon: Calendar, color: 'emerald' },
  { id: 'meal', label: '식단', icon: Utensils, color: 'orange' },
  { id: 'archive', label: '보관함', icon: FolderOpen, color: 'purple' },
];


interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 animate-fade-in-up">
      <div className="bg-[#E1F7DB]/80 backdrop-blur-md p-1.5 flex items-center justify-around shadow-[0_-8px_32px_rgba(130,201,30,0.1)] border-t-2 border-[#C5E9BC]/50 px-4 h-20">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full rounded-2xl transition-all duration-300 group ${isActive ? 'scale-105' : 'hover:scale-105 active:scale-95'}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
               <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#2F5912] text-white shadow-md' : 'text-[#2F5912]/50'}`}>
                  <Icon size={isActive ? 20 : 22} strokeWidth={isActive ? 3 : 2} />
               </div>
               
               <span className={`text-[10px] font-black mt-1 transition-all duration-300 ${isActive ? 'text-[#2F5912]' : 'text-[#2F5912]/30 opacity-60'}`}>
                 {item.label}
               </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
