'use client';

import { useState } from 'react';
import { MealInfo } from '@/lib/neis';
import { UtensilsCrossed, ChevronLeft, ChevronRight, Flame, Info, Sparkles, CalendarDays, RefreshCw } from 'lucide-react';

import { format, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MealCardProps {
  meals: MealInfo[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  isLoading?: boolean;
}

export default function MealCard({ meals, selectedDate, onDateChange, isLoading }: MealCardProps) {
  const [showNutrition, setShowNutrition] = useState(false);

  const dateKey = format(selectedDate, 'yyyyMMdd');
  const todayMeal = meals.find(m => m.date === dateKey);
  const isWeekend = [0, 6].includes(selectedDate.getDay());

  return (
    <div className="glass-card !border-none shadow-xl shadow-orange-500/5 group overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-50">
            <UtensilsCrossed size={22} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">오늘의 급식</h2>
            <p className="text-[11px] text-gray-400 font-bold flex items-center gap-1">
              <CalendarDays size={10} /> {format(selectedDate, 'yyyy년 M월 d일', { locale: ko })}
            </p>
          </div>
        </div>

        {/* Date Navigation (Toss style) */}
        <div className="flex items-center bg-gray-50 p-1 rounded-xl">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all active:scale-90"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="px-3 py-1 text-[10px] font-black text-gray-500 hover:text-gray-900 transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all active:scale-90"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-5 w-full bg-gray-50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : isWeekend ? (
          <div className="py-8 text-center flex flex-col items-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-2xl mb-2">🎈</p>
            <p className="text-xs font-bold text-gray-400">오늘은 즐거운 주말!<br/>집에서 맛있는 거 먹어요.</p>
          </div>
        ) : todayMeal ? (
          <div className="animate-fade-in-up">
            <div className="flex flex-wrap gap-2 mb-6">
              {todayMeal.dishes.map((dish, idx) => (
                <span key={idx} className="food-chip !bg-gray-50 !text-gray-700 !font-bold !text-xs !rounded-xl !px-3 !py-2 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-default">
                  {dish}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-orange-50 flex items-center gap-1.5">
                  <Flame size={14} className="text-orange-500" />
                  <span className="text-xs font-black text-orange-600 tracking-tighter">{todayMeal.calInfo}</span>
                </div>
              </div>
              
              {todayMeal.ntrInfo && (
                <button
                  onClick={() => setShowNutrition(!showNutrition)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${showNutrition ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <Info size={12} />
                  영양정보
                </button>
              )}
            </div>

            {showNutrition && todayMeal.ntrInfo && (
              <div className="mt-4 p-5 rounded-2xl bg-gray-50 text-[10px] leading-relaxed text-gray-500 font-medium grid grid-cols-2 gap-x-6 gap-y-2 animate-fade-in-up border border-gray-100">
                {todayMeal.ntrInfo.split('<br/>').map((item, idx) => (
                  <span key={idx} className="flex items-center justify-between border-b border-gray-200/50 pb-1">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <RefreshCw size={24} className="text-gray-300 animate-spin" />
            </div>
            <p className="text-xs font-bold text-gray-400 italic">급식표를 가져오는 중이에요...</p>
          </div>
        )}
      </div>
    </div>
  );
}
