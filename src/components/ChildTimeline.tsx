'use client';

import { useState } from 'react';
import { Schedule } from '@/lib/supabase';
import { TimetableInfo } from '@/lib/neis';
import { Clock, MapPin, Edit3, Backpack, BookOpen } from 'lucide-react';

interface TimelineProps {
  child: 'jeum' | 'eum';
  schedules: Schedule[];
  timetable: TimetableInfo[];
  date: Date;
  onEdit?: (schedule: Schedule) => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  school: '학교',
  afterschool: '방과후',
  academy: '학원',
  etc: '기타',
};

export default function ChildTimeline({ child, schedules, timetable, date, onEdit, onDelete }: TimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isJeum = child === 'jeum';
  const name = isJeum ? '열음' : '지음';
  const emoji = isJeum ? '🦋' : '🌿';

  const daySchedules = [...schedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  return (
    <div className="glass-card !p-4 border-none shadow-sm space-y-4">
      {/* Header Widget */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-2">
        <div className="flex items-center gap-2">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${isJeum ? 'bg-blue-600/10 text-blue-500' : 'bg-emerald-600/10 text-emerald-500'}`}>
              {emoji}
           </div>
           <div>
              <h3 className="type-section leading-none text-[var(--text-900)]">{name}이 타임라인</h3>
              <p className="type-caption text-[var(--text-500)] mt-0.5">{daySchedules.length}개의 일정 · {timetable.length}교시 수업</p>
           </div>
        </div>
      </div>


      <div className="space-y-3">
        {/* 1. School Timetable Section (NEIS) */}
        {timetable.length > 0 && (
          <div className="bg-[var(--bg-card-hover)] rounded-xl p-3 border border-[var(--border)]">
             <p className="type-caption text-[var(--text-500)] mb-2 flex items-center gap-1.5 px-1 font-bold">
                <BookOpen size={10} /> 학교 시간표
             </p>
             <div className="flex flex-wrap gap-2">
                {timetable.sort((a,b) => Number(a.period) - Number(b.period)).map((t, idx) => (
                   <div key={idx} className="flex flex-col items-center min-w-[45px] bg-[var(--bg-card)] rounded-lg p-2 shadow-sm border border-[var(--border)]">
                      <span className="type-caption text-blue-500 mb-0.5">{t.period}교시</span>
                      <span className="type-body font-black text-[var(--text-900)]">{t.subject}</span>
                   </div>
                ))}
             </div>
          </div>
        )}


        {/* 2. Personal Schedules Section */}
        {daySchedules.length === 0 && timetable.length === 0 ? (
          <div className="py-6 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No Events Today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {daySchedules.map((sched) => {
              const prepItems = sched.preparations || [];
              const isExpanded = expandedId === sched.id;

              return (
                <div key={sched.id} className="animate-fade-in">
                  <div className={`p-4 rounded-xl border transition-all ${isExpanded ? 'bg-[var(--bg-card)] border-[var(--border-strong)] shadow-sm' : 'bg-[var(--bg-card-hover)] border-[var(--border)] hover:bg-[var(--bg-card)]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0" onClick={() => prepItems.length > 0 && setExpandedId(isExpanded ? null : sched.id)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`badge-mini ${isJeum ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
                            {CATEGORY_LABELS[sched.category]}
                          </span>
                          {prepItems.length > 0 && (
                            <span className="badge-mini bg-orange-600/20 text-orange-400 flex items-center gap-1">
                               <Backpack size={10} /> {prepItems.length}
                            </span>
                          )}
                        </div>
                        <h4 className="type-body font-black text-[var(--text-900)] mb-2 group-hover:text-blue-500 transition-colors">
                          {sched.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="type-time flex items-center gap-1 text-[var(--text-500)]">
                             <Clock size={10} /> {sched.start_time} - {sched.end_time}
                          </span>
                          {sched.location && (
                             <span className="type-time flex items-center gap-1 max-w-[120px] truncate text-[var(--text-500)]">
                                <MapPin size={10} /> {sched.location}
                             </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 self-center">
                         <button 
                           onClick={(e) => { e.stopPropagation(); onEdit?.(sched); }}
                           className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-500)] hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm"
                         >
                            <Edit3 size={14} />
                         </button>
                      </div>
                    </div>


                    {isExpanded && prepItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                         <p className="type-caption flex items-center gap-1.5 text-orange-600 font-black">챙겨야 할 준비물</p>
                         <div className="grid grid-cols-1 gap-1">
                            {prepItems.map((item, id) => (
                               <div key={id} className="flex items-center gap-2 py-1 px-2 bg-orange-50 rounded-lg">
                                  <div className="w-1 h-1 rounded-full bg-orange-400" />
                                  <span className="type-body text-orange-800 font-bold">{item}</span>
                               </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
