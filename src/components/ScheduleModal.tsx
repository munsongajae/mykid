'use client';

import { useState, useEffect } from 'react';
import { supabase, Schedule, isSupabaseConfigured } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { X, Plus, Clock, MapPin, Tag, Trash2, Check, Backpack, RotateCcw, AlertCircle } from 'lucide-react';

interface ScheduleModalProps {
  child: 'jeum' | 'eum' | 'mom';
  date: Date;
  editSchedule?: Schedule;
  onClose: () => void;
  onSaved: (schedule: Schedule | Schedule[]) => void;
  onDeleted?: (id: string) => void;
}

const CATEGORIES = [
  { value: 'school', label: '학교' },
  { value: 'afterschool', label: '방과후' },
  { value: 'academy', label: '학원' },
  { value: 'etc', label: '기타' },
  { value: 'work', label: '근무' },
] as const;

const MOM_SHIFTS = [
  { label: '일정', title: '일정', start: '09:00', end: '18:00' },
  { label: '야근 1', title: '야근 1', start: '17:00', end: '23:00' },
  { label: '야근 2', title: '야근 2', start: '23:00', end: '08:00' },
  { label: '야퇴', title: '야퇴 (08:00 퇴근)', start: '08:00', end: '09:00' },
  { label: '석근', title: '석근', start: '17:00', end: '23:00' },
  { label: '조근', title: '조근', start: '04:00', end: '10:00' },
];

const HISTORY_LIMIT = 20;

type ScheduleTemplate = Pick<
  Schedule,
  'title' | 'start_time' | 'end_time' | 'location' | 'category' | 'preparations'
>;

export default function ScheduleModal({ child, date, editSchedule, onClose, onSaved, onDeleted }: ScheduleModalProps) {
  const [activeChild, setActiveChild] = useState<'jeum' | 'eum' | 'mom'>(child);
  const [title, setTitle] = useState(editSchedule?.title || '');
  const [startTime, setStartTime] = useState(editSchedule?.start_time || '09:00');
  const [endTime, setEndTime] = useState(editSchedule?.end_time || '10:00');
  const [location, setLocation] = useState(editSchedule?.location || '');
  const [category, setCategory] = useState<'school' | 'afterschool' | 'academy' | 'etc' | 'work'>(editSchedule?.category || (child === 'mom' ? 'work' : 'academy'));
  const [preps, setPreps] = useState(editSchedule?.preparations?.join(', ') || '');
  const [repeat4Weeks, setRepeat4Weeks] = useState(false);
  const [updateAllSeries, setUpdateAllSeries] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [historyItems, setHistoryItems] = useState<ScheduleTemplate[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Sync default category when switching child (for creation only)
  useEffect(() => {
    if (!editSchedule) {
       setCategory(activeChild === 'mom' ? 'work' : 'academy');
    }
  }, [activeChild, editSchedule]);

  useEffect(() => {
    const loadHistory = async () => {
      if (editSchedule || !isSupabaseConfigured()) {
        setHistoryItems([]);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const { data, error: dbError } = await supabase
          .from('schedules')
          .select('title,start_time,end_time,location,category,preparations')
          .eq('child', activeChild)
          .eq('category', category)
          .order('date', { ascending: false })
          .limit(HISTORY_LIMIT);

        if (dbError) throw dbError;

        const dedupedByTemplate = new Map<string, ScheduleTemplate>();
        (data || []).forEach((item) => {
          const typedItem = item as ScheduleTemplate;
          const prepKey = (typedItem.preparations || []).join(',');
          const key = [
            typedItem.title,
            typedItem.start_time,
            typedItem.end_time,
            typedItem.location || '',
            typedItem.category,
            prepKey,
          ].join('|');

          if (!dedupedByTemplate.has(key)) {
            dedupedByTemplate.set(key, typedItem);
          }
        });

        setHistoryItems(Array.from(dedupedByTemplate.values()).slice(0, 8));
      } catch {
        setHistoryItems([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [activeChild, category, editSchedule]);

  const isJeumActual = activeChild === 'jeum';
  const isEumActual = activeChild === 'eum';
  const isMomActual = activeChild === 'mom';
  const nameActual = isJeumActual ? '열음' : isEumActual ? '지음' : '엄마';
  const themeColorActual = isJeumActual ? 'blue' : isEumActual ? 'emerald' : 'purple';

  // Correct names for the display logic below
  const isJeum = activeChild === 'jeum';
  const isEum = activeChild === 'eum';
  const isMom = activeChild === 'mom';
  const name = isJeum ? '열음' : isEum ? '지음' : '엄마';
  const themeColor = isJeum ? 'blue' : isEum ? 'emerald' : 'purple';

  const selectShift = (shift: typeof MOM_SHIFTS[0]) => {
    setTitle(shift.title);
    setStartTime(shift.start);
    setEndTime(shift.end);
  };

  const applyHistoryItem = (item: ScheduleTemplate) => {
    setTitle(item.title);
    setStartTime(item.start_time);
    setEndTime(item.end_time);
    setLocation(item.location || '');
    setCategory(item.category);
    setPreps((item.preparations || []).join(', '));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('일정 이름을 입력해주세요'); return; }

    setIsSaving(true);
    setError('');

    const preparations = preps.split(',').map((p: string) => p.trim()).filter(Boolean);
    const isSupabaseReady = isSupabaseConfigured();

    try {
      if (editSchedule) {
        // Update Logic
        const scheduleData = {
          child: activeChild, title: title.trim(), start_time: startTime, end_time: endTime,
          location: location.trim() || undefined, category, preparations
        };

        if (isSupabaseReady) {
          if (updateAllSeries && editSchedule.group_id) {
            // Update the whole series
            const { data, error: dbError } = await supabase
              .from('schedules').update(scheduleData).eq('group_id', editSchedule.group_id).select();
            if (dbError) throw dbError;
            onSaved(data as Schedule[]);
          } else {
            // Update only this instance
            const { data, error: dbError } = await supabase
              .from('schedules').update({...scheduleData, date: format(date, 'yyyy-MM-dd')}).eq('id', editSchedule.id).select().single();
            if (dbError) throw dbError;
            onSaved(data as Schedule);
          }
        } else {
          onSaved({ ...scheduleData, date: format(date, 'yyyy-MM-dd'), id: editSchedule.id, created_at: editSchedule.created_at } as Schedule);
        }
      } else {
        // Creation Logic
        const instancesCount = repeat4Weeks ? 4 : 1;
        const newSchedules = [];
        const groupId = repeat4Weeks ? crypto.randomUUID() : undefined;

        for (let i = 0; i < instancesCount; i++) {
          const targetDate = addDays(date, i * 7);
          newSchedules.push({
            child: activeChild, title: title.trim(), start_time: startTime, end_time: endTime,
            location: location.trim() || undefined, category, date: format(targetDate, 'yyyy-MM-dd'),
            preparations, group_id: groupId
          });
        }

        if (isSupabaseReady) {
          const { data, error: dbError } = await supabase.from('schedules').insert(newSchedules).select();
          if (dbError) throw dbError;
          onSaved(data as Schedule[]);
        } else {
          const tempSchedules = newSchedules.map((s, idx) => ({
            ...s, id: `temp-${Date.now()}-${idx}`, created_at: new Date().toISOString()
          }));
          onSaved(tempSchedules as Schedule[]);
        }
      }
      onClose();
    } catch (err) { setError('저장에 실패했습니다.'); } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!editSchedule || !onDeleted) return;
    const msg = updateAllSeries && editSchedule.group_id 
      ? '이 반복 일정을 모두 삭제하시겠습니까?' 
      : '정말로 이 일정을 삭제하시겠습니까?';
    if (!confirm(msg)) return;
    
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured()) {
        if (updateAllSeries && editSchedule.group_id) {
           const { error: dbError } = await supabase.from('schedules').delete().eq('group_id', editSchedule.group_id);
           if (dbError) throw dbError;
        } else {
           const { error: dbError } = await supabase.from('schedules').delete().eq('id', editSchedule.id);
           if (dbError) throw dbError;
        }
      }
      onDeleted(editSchedule.id); // Page will handle local update
      onClose();
    } catch (err) { setError('삭제 실패'); } finally { setIsDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-card)] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-fade-in-up border border-[var(--border)]" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full bg-${themeColor}-500 transition-colors`} />
                <h2 className={`font-black text-xl text-[var(--text-900)]`}>{editSchedule ? '일정 수정' : `일정 입력`}</h2>
             </div>
            <p className="text-sm text-[var(--text-400)] font-bold">{format(date, 'yyyy년 M월 d일')}</p>
          </div>
          <div className="flex items-center gap-2">
            {editSchedule && <button onClick={handleDelete} disabled={isDeleting} className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500/20"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--bg-card-hover)] flex items-center justify-center hover:bg-[var(--bg-card-hover)]/80 transition-colors"><X size={20} className="text-[var(--text-400)]" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-4">
          {!editSchedule && (
            <div className="space-y-2">
              <label className="type-caption uppercase tracking-wider text-[var(--text-400)] font-black">대상 선택</label>
              <div className="flex p-1 bg-[var(--bg-card-hover)] rounded-2xl gap-1 overflow-hidden">
                 {[
                   { id: 'jeum', label: '열음', color: '#3182F6' },
                   { id: 'eum', label: '지음', color: '#00BA54' },
                   { id: 'mom', label: '엄마', color: '#A855F7' }
                 ].map(c => (
                   <button 
                    key={c.id} 
                    type="button" 
                    onClick={() => setActiveChild(c.id as any)} 
                    className="flex-1 py-3 rounded-xl text-[11px] font-black transition-all"
                    style={{
                      background: activeChild === c.id ? 'var(--bg-card)' : 'transparent',
                      color: activeChild === c.id ? c.color : 'var(--text-400)',
                      boxShadow: activeChild === c.id ? 'var(--shadow-flat)' : 'none'
                    }}
                   >
                     {c.label}
                   </button>
                 ))}
              </div>
            </div>
          )}
          {editSchedule?.group_id && (
             <div className="bg-blue-500/5 p-4 rounded-2xl flex items-center gap-3 border border-blue-500/10">
               <AlertCircle size={18} className="text-blue-500 shrink-0" />
               <div className="flex-1">
                 <p className="type-caption font-black text-blue-500">반복 일정 감지</p>
                 <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input type="checkbox" checked={updateAllSeries} onChange={e => setUpdateAllSeries(e.target.checked)} className="custom-checkbox !w-4 !h-4" />
                    <span className="type-body font-bold text-[var(--text-700)]">모든 반복 일정 일괄 수정/삭제</span>
                 </label>
               </div>
             </div>
          )}

          {isMom && (
            <div className="space-y-2">
              <label className="type-caption uppercase tracking-wider text-purple-500 font-black">근무 유형 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {MOM_SHIFTS.map(shift => (
                  <button key={shift.label} type="button" onClick={() => selectShift(shift)} className={`py-3 rounded-2xl text-[11px] font-black transition-all ${title === shift.title && startTime === shift.start ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-500/5 text-purple-400 border border-purple-500/10'}`}>{shift.label}</button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-[var(--text-400)]">일정명</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="일정 이름을 입력하세요" className="w-full px-5 py-4 bg-[var(--bg-card-hover)] border-none rounded-2xl text-[var(--text-900)] font-bold outline-none ring-1 ring-inset ring-transparent focus:ring-blue-500/30 transition-all" autoFocus />
          </div>

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-[var(--text-400)]">카테고리</label>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} className={`py-3 rounded-2xl text-[10px] font-black transition-all ${category === cat.value ? `bg-${themeColor}-600 text-white shadow-md` : 'bg-[var(--bg-card-hover)] text-[var(--text-400)]'}`}>{cat.label}</button>
              ))}
            </div>
          </div>

          {!editSchedule && (
            <div className="space-y-2">
              <label className="type-caption uppercase tracking-wider text-[var(--text-400)] flex items-center gap-2">
                <Tag size={12} />
                최근 입력한 일정 불러오기
              </label>
              <div className="p-2 rounded-2xl bg-[var(--bg-card-hover)] border border-[var(--border)]">
                {isLoadingHistory ? (
                  <p className="text-[10px] px-2 py-2 text-[var(--text-400)] font-bold">히스토리 불러오는 중...</p>
                ) : historyItems.length === 0 ? (
                  <p className="text-[10px] px-2 py-2 text-[var(--text-400)] font-bold">같은 카테고리의 저장된 히스토리가 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {historyItems.map((item, idx) => (
                      <button
                        key={`${item.title}-${item.start_time}-${idx}`}
                        type="button"
                        onClick={() => applyHistoryItem(item)}
                        className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-left hover:border-blue-400/40 hover:bg-blue-500/5 transition-all"
                      >
                        <p className="text-[11px] font-black text-[var(--text-900)] leading-tight">{item.title}</p>
                        <p className="text-[9px] font-bold text-[var(--text-400)] mt-0.5">{item.start_time} - {item.end_time}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="type-caption uppercase tracking-wider text-[var(--text-400)]">시작</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-5 py-4 bg-[var(--bg-card-hover)] border-none rounded-2xl text-[var(--text-900)] font-bold outline-none transition-all" /></div>
            <div className="space-y-2"><label className="type-caption uppercase tracking-wider text-[var(--text-400)]">종료</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-5 py-4 bg-[var(--bg-card-hover)] border-none rounded-2xl text-[var(--text-900)] font-bold outline-none transition-all" /></div>
          </div>

          {!editSchedule && (
             <div className="p-1.5 bg-[var(--bg-card-hover)] rounded-2xl flex items-center gap-3">
               <button type="button" onClick={() => setRepeat4Weeks(!repeat4Weeks)} className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-xl transition-all font-black text-[11px] ${repeat4Weeks ? 'bg-[var(--bg-card)] shadow-sm text-blue-500' : 'text-[var(--text-400)]'}`}>
                 <RotateCcw size={14} className={repeat4Weeks ? 'animate-spin-slow' : ''} /> 4주간 매주 반복 입력
               </button>
             </div>
          )}

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-[var(--text-400)] flex items-center gap-2"><Backpack size={12}/> 준비물 (쉼표로 구분)</label>
            <input type="text" value={preps} onChange={e => setPreps(e.target.value)} placeholder="글러브, 배트, 볼.." className="w-full px-5 py-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl text-[var(--text-900)] font-bold outline-none focus:border-orange-500/30 transition-all" />
          </div>

          {error && <p className="text-xs text-red-500 font-bold px-1">{error}</p>}

          <div className="pt-2">
            <button type="submit" disabled={isSaving || isDeleting} className={`w-full py-5 rounded-[22px] font-black text-base shadow-xl transition-all bg-${themeColor}-600 shadow-${themeColor}-200 text-white flex items-center justify-center gap-2`}>
              {editSchedule ? <><Check size={18}/> {updateAllSeries ? '연결된 모든 일정 수정' : '이 일정만 수정'}</> : <><Plus size={18}/> {repeat4Weeks ? '4개 일정 동시 추가' : '일정 추가하기'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
