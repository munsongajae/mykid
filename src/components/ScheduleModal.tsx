'use client';

import { useState, useEffect } from 'react';
import { supabase, Schedule, isSupabaseConfigured } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { X, Plus, Clock, MapPin, Tag, Trash2, Check, Backpack, RotateCcw, AlertCircle } from 'lucide-react';

interface ScheduleModalProps {
  child: 'jeum' | 'eum';
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
] as const;

export default function ScheduleModal({ child, date, editSchedule, onClose, onSaved, onDeleted }: ScheduleModalProps) {
  const [title, setTitle] = useState(editSchedule?.title || '');
  const [startTime, setStartTime] = useState(editSchedule?.start_time || '09:00');
  const [endTime, setEndTime] = useState(editSchedule?.end_time || '10:00');
  const [location, setLocation] = useState(editSchedule?.location || '');
  const [category, setCategory] = useState<'school' | 'afterschool' | 'academy' | 'etc'>(editSchedule?.category || 'academy');
  const [preps, setPreps] = useState(editSchedule?.preparations?.join(', ') || '');
  const [repeat4Weeks, setRepeat4Weeks] = useState(false);
  const [updateAllSeries, setUpdateAllSeries] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const isJeum = child === 'jeum';
  const name = isJeum ? '열음' : '지음';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('일정 이름을 입력해주세요'); return; }

    setIsSaving(true);
    setError('');

    const preparations = preps.split(',').map(p => p.trim()).filter(Boolean);
    const isSupabaseReady = isSupabaseConfigured();

    try {
      if (editSchedule) {
        // Update Logic
        const scheduleData = {
          child, title: title.trim(), start_time: startTime, end_time: endTime,
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
            child, title: title.trim(), start_time: startTime, end_time: endTime,
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className={`w-2 h-2 rounded-full ${isJeum ? 'bg-blue-500' : 'bg-emerald-500'}`} />
               <h2 className={`font-black text-xl text-gray-900`}>{editSchedule ? '일정 수정' : `${name}이 일정`}</h2>
            </div>
            <p className="text-sm text-gray-400 font-bold">{format(date, 'yyyy년 M월 d일')}</p>
          </div>
          <div className="flex items-center gap-2">
            {editSchedule && <button onClick={handleDelete} disabled={isDeleting} className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100"><Trash2 size={18} /></button>}
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"><X size={20} className="text-gray-400" /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-4">
          {editSchedule?.group_id && (
             <div className="bg-blue-50/50 p-4 rounded-2xl flex items-center gap-3">
               <AlertCircle size={18} className="text-blue-500 shrink-0" />
               <div className="flex-1">
                 <p className="type-caption font-black text-blue-600">반복 일정 감지</p>
                 <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input type="checkbox" checked={updateAllSeries} onChange={e => setUpdateAllSeries(e.target.checked)} className="custom-checkbox !w-4 !h-4" />
                    <span className="type-body font-bold text-gray-700">모든 반복 일정 일괄 수정/삭제</span>
                 </label>
               </div>
             </div>
          )}

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-gray-400">일정명</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="일정 이름을 입력하세요" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-gray-900 font-bold outline-none" autoFocus />
          </div>

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-gray-400">카테고리</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} className={`py-3 rounded-2xl text-[11px] font-black transition-all ${category === cat.value ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>{cat.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className="type-caption uppercase tracking-wider text-gray-400">시작</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-gray-900 font-bold outline-none" /></div>
            <div className="space-y-2"><label className="type-caption uppercase tracking-wider text-gray-400">종료</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-gray-900 font-bold outline-none" /></div>
          </div>

          {!editSchedule && (
             <div className="p-1.5 bg-gray-50 rounded-2xl flex items-center gap-3">
               <button type="button" onClick={() => setRepeat4Weeks(!repeat4Weeks)} className={`flex items-center justify-center gap-2 flex-1 py-3 rounded-xl transition-all font-black text-[11px] ${repeat4Weeks ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
                 <RotateCcw size={14} className={repeat4Weeks ? 'animate-spin-slow' : ''} /> 4주간 매주 반복 입력
               </button>
             </div>
          )}

          <div className="space-y-2">
            <label className="type-caption uppercase tracking-wider text-gray-400 flex items-center gap-2"><Backpack size={12}/> 준비물 (쉼표로 구분)</label>
            <input type="text" value={preps} onChange={e => setPreps(e.target.value)} placeholder="글러브, 배트, 볼.." className="w-full px-5 py-4 bg-orange-50/50 border border-orange-100 rounded-2xl text-gray-900 font-bold outline-none" />
          </div>

          {error && <p className="text-xs text-red-500 font-bold px-1">{error}</p>}

          <div className="pt-2">
            <button type="submit" disabled={isSaving || isDeleting} className={`w-full py-5 rounded-[22px] font-black text-base shadow-xl transition-all ${isJeum ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'} text-white flex items-center justify-center gap-2`}>
              {editSchedule ? <><Check size={18}/> {updateAllSeries ? '연결된 모든 일정 수정' : '이 일정만 수정'}</> : <><Plus size={18}/> {repeat4Weeks ? '4개 일정 동시 추가' : '일정 추가하기'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
