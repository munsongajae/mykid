'use client';

import React, { useState } from 'react';
import { Schedule } from '@/lib/supabase';
import { TimetableInfo } from '@/lib/neis';
import { Clock, MapPin, Edit3, Backpack, BookOpen, Plus } from 'lucide-react';

interface TimelineProps {
  child: 'jeum' | 'eum' | 'mom';
  schedules: Schedule[];
  timetable: TimetableInfo[];
  date: Date;
  onEdit?: (schedule: Schedule) => void;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  school: '학교',
  afterschool: '방과후',
  academy: '학원',
  etc: '기타',
  work: '근무',
};

export default function ChildTimeline({ child, schedules, timetable, date, onEdit, onAdd, onDelete }: TimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isJeum = child === 'jeum';
  const isEum = child === 'eum';
  const isMom = child === 'mom';
  
  const name = isJeum ? '열음' : isEum ? '지음' : '엄마';
  const emoji = isJeum ? '🦋' : isEum ? '🌿' : '👩‍💼';
  const themeColor = isJeum ? 'blue' : isEum ? 'emerald' : 'purple';

  const daySchedules = [...schedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  return (
    <div className="glass-card !p-4 border-none shadow-sm space-y-4">
      {/* Header Widget */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-2">
        <div className="flex items-center gap-2">
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm bg-${themeColor}-600/10 text-${themeColor}-500`}>
              {emoji}
           </div>
           <div>
              <h3 className="type-section leading-none text-[var(--text-900)]">{name} {isMom ? '근무' : '이'} 타임라인</h3>
              <p className="type-caption text-[var(--text-500)] mt-0.5">{daySchedules.length}개의 일정 {!isMom ? `· ${timetable.length}교시 수업` : ''}</p>
           </div>
        </div>
        {onAdd && (
          <button 
            onClick={onAdd}
            className={`w-8 h-8 rounded-lg bg-${themeColor}-600/10 text-${themeColor}-500 flex items-center justify-center hover:bg-${themeColor}-600/20 active:scale-90 transition-all shadow-sm`}
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        )}
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


      <div className="space-y-2">
        {daySchedules.length === 0 && timetable.length === 0 ? (
          <div className="py-6 text-center bg-[var(--bg-card-hover)]/30 rounded-xl border border-dashed border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--text-400)] uppercase tracking-widest">No Events Today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {daySchedules.map((sched, idx) => {
              const prepItems = sched.preparations || [];
              const isExpanded = expandedId === sched.id;
              
              // Calculate Gap with previous schedule
              let gapMinutes = 0;
              if (idx > 0) {
                const prev = daySchedules[idx-1];
                const prevEnd = prev.end_time.split(':').map(Number);
                const currStart = sched.start_time.split(':').map(Number);
                const prevTotal = prevEnd[0] * 60 + prevEnd[1];
                const currTotal = currStart[0] * 60 + currStart[1];
                if (currTotal > prevTotal) gapMinutes = currTotal - prevTotal;
              }

              return (
                <React.Fragment key={sched.id}>
                  {/* Gap Card */}
                  {gapMinutes > 0 && (
                    <div className="py-2 px-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card-hover)]/20 animate-fade-in flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-400)] opacity-30" />
                          <span className="text-[10px] font-black text-[var(--text-400)] uppercase tracking-tight">여유 시간</span>
                       </div>
                       <span className="text-[10px] font-black text-[var(--text-400)]">
                          {gapMinutes >= 60 ? `${Math.floor(gapMinutes/60)}시간 ${gapMinutes%60 > 0 ? `${gapMinutes%60}분` : ''}` : `${gapMinutes}분`}
                       </span>
                    </div>
                  )}

                  {/* Schedule Card */}
                  <div className={`p-4 py-3 rounded-2xl border transition-all animate-fade-in ${isExpanded ? 'bg-[var(--bg-card)] border-[var(--border-strong)] shadow-md' : 'bg-[var(--bg-card-hover)]/80 border-[var(--border)] hover:bg-[var(--bg-card)]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0" onClick={() => prepItems.length > 0 && setExpandedId(isExpanded ? null : sched.id)}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`badge-mini`} style={{ background: `var(--${themeColor}-bg)`, color: `var(--${themeColor}-text)` }}>
                            {CATEGORY_LABELS[sched.category]}
                          </span>
                          {prepItems.length > 0 && (
                            <span className="badge-mini bg-orange-600/10 text-orange-500 flex items-center gap-1">
                               <Backpack size={10} /> {prepItems.length}
                            </span>
                          )}
                        </div>
                        <h4 className="type-body font-black text-[var(--text-900)] mb-1.5">
                          {sched.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <div className="flex items-center gap-1.5 text-[var(--text-900)] font-black text-[11px] bg-[var(--bg-card)] px-2 py-0.5 rounded-md border border-[var(--border)]">
                             <Clock size={10} className={`text-${themeColor}-500`} /> 
                             {sched.start_time} - {sched.end_time} {sched.end_time < sched.start_time ? '(익일)' : ''}
                          </div>
                          {sched.location && (
                             <span className="type-time flex items-center gap-1 max-w-[120px] truncate text-[var(--text-400)]">
                                <MapPin size={10} /> {sched.location}
                             </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 self-start">
                         <button 
                           onClick={(e) => { e.stopPropagation(); onEdit?.(sched); }}
                           className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-500)] hover:text-blue-500 hover:border-blue-100 transition-all shadow-sm"
                         >
                            <Edit3 size={14} />
                         </button>
                      </div>
                    </div>

                    {isExpanded && prepItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                         <p className="type-caption flex items-center gap-1.5 text-orange-600 font-black uppercase tracking-tighter">Required Items</p>
                          <div className="grid grid-cols-1 gap-1.5">
                             {prepItems.map((item, id) => (
                                <div key={id} className="flex items-center gap-2 py-2 px-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
                                   <div className="w-1 h-1 rounded-full bg-orange-500" />
                                   <span className="text-[11px] text-orange-600 font-bold">{item}</span>
                                </div>
                             ))}
                          </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
