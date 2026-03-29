'use client';

import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, isSameDay, isSameMonth,
  addMonths, subMonths, isToday
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { SchoolEvent } from '@/lib/neis';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  schoolEvents: SchoolEvent[];
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function MiniCalendar({ selectedDate, onDateSelect, schoolEvents }: MiniCalendarProps) {
  const [viewMonth, setViewMonth] = useState(new Date());

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const eventDates = new Set(
    schoolEvents.map(e => e.date)
  );

  const getEventForDay = (day: Date) => {
    const key = format(day, 'yyyyMMdd');
    return schoolEvents.find(e => e.date === key);
  };

  return (
    <div className="glass-card !p-6 border-none shadow-lg shadow-black/5 dark:shadow-black/20">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
             <CalendarDays size={16} className="text-blue-500" />
           </div>
           <h3 className="font-extrabold text-[var(--text-900)] text-base">
             {format(viewMonth, 'yyyy년 M월', { locale: ko })}
           </h3>
        </div>
        <div className="flex items-center gap-1 bg-[var(--bg-card-hover)] p-1 rounded-xl">
          <button
            onClick={() => setViewMonth(subMonths(viewMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
            aria-label="이전 달"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <button
            onClick={() => setViewMonth(new Date())}
            className="px-2 text-[10px] font-black text-[var(--text-400)] hover:text-[var(--text-700)] transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white hover:shadow-sm transition-all"
            aria-label="다음 달"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 mb-3 border-b border-gray-50 pb-2">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className="text-center text-[11px] font-black"
            style={{
              color: i === 0 ? '#ff4d4d' : i === 6 ? '#3182f6' : 'var(--text-400)',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);
          const dayOfWeek = getDay(day);
          const dateKey = format(day, 'yyyyMMdd');
          const hasEvent = eventDates.has(dateKey);
          const event = getEventForDay(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : isTodayDay ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-[var(--bg-card-hover)] text-[var(--text-700)]'}`}
              title={event?.eventName}
            >
              <span className={`text-xs ${isSelected ? 'font-black' : isTodayDay ? 'font-black' : 'font-bold'} ${!isSelected && !isTodayDay ? (dayOfWeek === 0 ? 'text-[#ff4d4d]' : dayOfWeek === 6 ? 'text-[#3182f6]' : '') : ''}`}>
                {format(day, 'd')}
              </span>
              {hasEvent && (
                <span
                  className={`absolute bottom-2 w-1 h-1 rounded-full ${isSelected ? 'bg-white/50' : 'bg-orange-500'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* School Events List */}
      <div className="mt-6 pt-5 border-t border-[var(--border)]">
        <h4 className="text-[11px] font-black text-[var(--text-400)] mb-3 flex items-center gap-2">
          이달의 이벤트 ({schoolEvents.filter(e => e.date.startsWith(format(viewMonth, 'yyyyMM'))).length})
        </h4>
        <div className="space-y-2">
          {schoolEvents
            .filter(e => e.date.startsWith(format(viewMonth, 'yyyyMM')))
            .slice(0, 3)
            .map((event, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-card-hover)]/50 hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 text-[9px] font-black text-orange-500">
                  <span>{event.date.substring(6, 8)}</span>
                </div>
                <span className="text-xs font-bold text-[var(--text-700)] truncate flex-1">{event.eventName}</span>
              </div>
            ))}
            {schoolEvents.filter(e => e.date.startsWith(format(viewMonth, 'yyyyMM'))).length === 0 && (
              <p className="text-[10px] text-center py-2 text-gray-300">특별한 일정이 없습니다</p>
            )}
        </div>
      </div>
    </div>
  );
}
