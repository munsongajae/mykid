'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';


import { ko } from 'date-fns/locale';
import { Plus, RefreshCw, Settings, ChevronRight, Backpack, Utensils, Calendar, ExternalLink, FolderOpen, Trash2, Coffee, Sparkles } from 'lucide-react';


import BottomNav from '@/components/BottomNav';
import MealCard from '@/components/MealCard';
import MiniCalendar from '@/components/MiniCalendar';
import ChildTimeline from '@/components/ChildTimeline';
import ScheduleModal from '@/components/ScheduleModal';
import FileArchiveView from '@/components/FileArchiveView';

import { MealInfo, SchoolEvent, TimetableInfo } from '@/lib/neis';

import { supabase, Schedule, FileArchive, isSupabaseConfigured } from '@/lib/supabase';


// const SAMPLE_SCHEDULES: Schedule[] = []; // Hardcoded samples removed


type ActiveChild = 'jeum' | 'eum';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealData, setMealData] = useState<MealInfo[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const [archives, setArchives] = useState<FileArchive[]>([]);
  const [timetableJeum, setTimetableJeum] = useState<TimetableInfo[]>([]);
  const [timetableEum, setTimetableEum] = useState<TimetableInfo[]>([]);
  const [isLoadingMeal, setIsLoadingMeal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | undefined>(undefined);
  const [activeChild, setActiveChild] = useState<ActiveChild>('jeum');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');


  const [kidsInfo, setKidsInfo] = useState({
    jeum: { name: '열음', grade: '2', class: '3' },
    eum: { name: '지음', grade: '1', class: '1' }
  });

  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) { setTheme(savedTheme); document.body.className = savedTheme === 'dark' ? 'dark-theme' : ''; }
    const savedKids = localStorage.getItem('kidsInfo');
    if (savedKids) setKidsInfo(JSON.parse(savedKids));
  }, []);


  const saveKidsInfo = (newInfo: typeof kidsInfo) => { 
    setKidsInfo(newInfo); 
    localStorage.setItem('kidsInfo', JSON.stringify(newInfo)); 
  };



  const loadMealData = useCallback(async (date: Date) => {
    setIsLoadingMeal(true);
    try {
      const start = format(startOfMonth(date), 'yyyyMMdd');
      const end = format(endOfMonth(date), 'yyyyMMdd');
      const res = await fetch(`/api/neis?type=meal&start=${start}&end=${end}`);
      const json = await res.json();
      setMealData(json.data || []);
    } catch { console.error('급식 데이터 로드 실패'); } finally { setIsLoadingMeal(false); }
  }, []);

  const loadScheduleData = useCallback(async (date: Date) => {
    try {
      const start = format(startOfMonth(date), 'yyyyMMdd');
      const end = format(endOfMonth(date), 'yyyyMMdd');
      const res = await fetch(`/api/neis?type=schedule&start=${start}&end=${end}`);
      const json = await res.json();
      setSchoolEvents(json.data || []);
    } catch { console.error('학사 일정 로드 실패'); }
  }, []);

  const loadTimetableData = useCallback(async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyyMMdd');
      const resJeum = await fetch(`/api/neis?type=timetable&start=${dateStr}&grade=${kidsInfo.jeum.grade}&class=${kidsInfo.jeum.class}`);
      const jsonJeum = await resJeum.json();
      setTimetableJeum(jsonJeum.data || []);
      const resEum = await fetch(`/api/neis?type=timetable&start=${dateStr}&grade=${kidsInfo.eum.grade}&class=${kidsInfo.eum.class}`);
      const jsonEum = await resEum.json();
      setTimetableEum(jsonEum.data || []);
    } catch { console.error('시간표 로드 실패'); }
  }, [kidsInfo]);

  const loadSchedules = useCallback(async (date: Date) => {
    try {
      if (!isSupabaseConfigured()) return;
      const start = format(startOfMonth(date), 'yyyy-MM-dd');
      const end = format(endOfMonth(date), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .gte('date', start)
        .lte('date', end);
      
      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('스케줄 로드 실패:', err);
    }
  }, []);


  useEffect(() => {
    loadMealData(selectedDate); 
    loadScheduleData(selectedDate); 
    loadTimetableData(selectedDate);
    loadSchedules(selectedDate);
  }, [selectedDate, loadMealData, loadScheduleData, loadTimetableData, loadSchedules]);


  const daySchedulesJeum = schedules.filter( s => s.child === 'jeum' && s.date === format(selectedDate, 'yyyy-MM-dd') ).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const daySchedulesEum = schedules.filter( s => s.child === 'eum' && s.date === format(selectedDate, 'yyyy-MM-dd') ).sort((a,b) => a.start_time.localeCompare(b.start_time));

  const allPrep = [
    ...daySchedulesJeum.flatMap(s => (s.preparations || []).map(p => ({ id: `jeum-${s.id}-${p}`, item: p, child: kidsInfo.jeum.name, sched: s.title, childId: 'jeum' as const }))),
    ...daySchedulesEum.flatMap(s => (s.preparations || []).map(p => ({ id: `eum-${s.id}-${p}`, item: p, child: kidsInfo.eum.name, sched: s.title, childId: 'eum' as const }))),
  ];



  const completedCount = allPrep.filter(p => completedItems[p.id]).length;
  const progressPercent = allPrep.length > 0 ? (completedCount / allPrep.length) * 100 : 0;
  
  const handleTogglePrep = (id: string) => { setCompletedItems(prev => ({ ...prev, [id]: !prev[id] })); };
  const handleScheduleAdded = (s: Schedule | Schedule[]) => {
    setSchedules(prev => {
      const itemsToAdd = Array.isArray(s) ? s : [s];
      const next = [...prev];
      
      itemsToAdd.forEach(item => {
        const idx = next.findIndex(p => p.id === item.id);
        if (idx > -1) {
          next[idx] = item;
        } else {
          next.push(item);
        }
      });
      return next;
    });
  };

  const handleDeleteSchedule = (id: string) => setSchedules(prev => prev.filter(s => s.id !== id));
  const handleArchiveUploaded = (f: FileArchive) => setArchives(prev => [f, ...prev]);
  const handleArchiveDeleted = (id: string) => setArchives(prev => prev.filter(a => a.id !== id));


  return (
    <div className="min-h-screen pb-44 bg-white relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-gray-50 px-6 py-4">



        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <h1 className="type-title flex items-center gap-2">
            {format(selectedDate, 'M월 d일', { locale: ko })} 
            <span className="text-gray-400 font-medium">{format(selectedDate, 'EEEE', { locale: ko })}</span>
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveChild('jeum'); setShowModal(true); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-md shadow-blue-100' hover:bg-blue-700 transition-all font-black text-lg"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
            <button onClick={() => { loadMealData(selectedDate); loadScheduleData(selectedDate); loadTimetableData(selectedDate); loadSchedules(selectedDate); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 hover:bg-gray-100"><RefreshCw size={14} /></button>
            <button onClick={() => setActiveTab('settings')} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 hover:bg-gray-100"><Settings size={14} className={activeTab === 'settings' ? 'text-blue-500' : 'text-gray-400'} /></button>
          </div>

        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {activeTab === 'home' && (
          <>
            {/* Global Quick Add (Mobile/Desktop Optimized) - Adjusted for Floating Nav */}
            <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-3">

               <button 
                onClick={() => { setActiveChild('jeum'); setShowModal(true); }}
                className="w-12 h-12 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-200 border border-blue-500 flex items-center justify-center animate-bounce-slow active:scale-90 transition-all font-black text-sm"
               >
                 <span className="flex flex-col items-center">
                   <Plus size={20} />
                   <span className="text-[8px] -mt-1">{kidsInfo.jeum.name}</span>
                 </span>
               </button>
               <button 
                onClick={() => { setActiveChild('eum'); setShowModal(true); }}
                className="w-12 h-12 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-200 border border-emerald-500 flex items-center justify-center active:scale-90 transition-all font-black"
               >
                 <span className="flex flex-col items-center">
                   <Plus size={20} />
                   <span className="text-[8px] -mt-1">{kidsInfo.eum.name}</span>
                 </span>
               </button>
            </div>

            <section className="grid grid-cols-2 gap-3">
              {[ {k:'jeum', c: 'blue', e: '🦋'}, {k:'eum', c: 'emerald', e: '🌿'} ].map(({k, c, e}) => (
                <div key={k} className={`glass-card !p-4 border-l-[3px] border-${c}-500 transition-colors`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                       <span>{e}</span><h3 className="type-section">{(kidsInfo as any)[k].name}</h3>
                       <button onClick={() => { setActiveChild(k as ActiveChild); setShowModal(true); }} className="p-1 rounded bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-gray-100"><Plus size={10} /></button>
                    </div>
                    <span className={`type-caption text-${c}-600 bg-${c}-50 px-1.5 py-0.5 rounded-md`}>{(kidsInfo as any)[k].grade}-{(kidsInfo as any)[k].class}</span>
                  </div>

                  {/* School Timetable Summary */}
                  {(k === 'jeum' ? timetableJeum : timetableEum).length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                       {(k === 'jeum' ? timetableJeum : timetableEum).sort((a,b) => Number(a.period) - Number(b.period)).map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-gray-50 text-[9px] font-black text-blue-500 rounded border border-gray-100">{t.subject}</span>
                       ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {(k === 'jeum' ? daySchedulesJeum : daySchedulesEum).map(s => (
                      <div key={s.id} className="flex items-center group py-0.5">
                        <span className="type-time w-16 shrink-0">{s.start_time}-{s.end_time}</span>
                        <span className="type-body flex-1 truncate ml-1 font-bold">{s.title}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingSchedule(s as Schedule); setActiveChild(k as ActiveChild); setShowModal(true); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white text-gray-400"
                        >
                          <Settings size={10} />
                        </button>
                      </div>
                    ))}

                    {(k === 'jeum' ? daySchedulesJeum : daySchedulesEum).length === 0 && (k === 'jeum' ? timetableJeum : timetableEum).length === 0 && <p className="type-caption italic py-2 text-center text-gray-300">No events</p>}
                  </div>


                  <div className="pt-2 mt-2 border-t border-gray-50 flex justify-end"><button onClick={() => setActiveTab('schedule')} className="type-caption text-gray-400 hover:text-blue-500">More <ExternalLink size={10}/></button></div>
                </div>
              ))}
            </section>
            {allPrep.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                   <h2 className="type-section flex items-center gap-1.5"><Backpack size={14} className="text-orange-500" /> Prep Checklist</h2>
                   <span className="type-time">{completedCount} / {allPrep.length}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   {[ {id:'jeum', c:'blue'}, {id:'eum', c:'emerald'} ].map(({id, c}) => (
                      <div key={id} className={`glass-card !p-3 border-t-[3px] border-${c}-500/30`}>
                         <p className={`type-caption font-black text-${c}-600 mb-2`}>{(kidsInfo as any)[id].name}이 것</p>
                         <div className="space-y-1">
                            {allPrep.filter(p => p.childId === id).map((p) => (
                               <div key={p.id} className="flex items-center gap-2 py-1.5 cursor-pointer group" onClick={() => handleTogglePrep(p.id)}>
                                  <input type="checkbox" checked={completedItems[p.id] || false} onChange={() => {}} className={`custom-checkbox !w-3.5 !h-3.5 ${id === 'eum' ? '!border-emerald-200 checked:!bg-emerald-500 checked:!border-emerald-500' : ''}`} />
                                  <div className="flex-1 min-w-0">
                                     <p className={`type-body font-bold truncate ${completedItems[p.id] ? 'text-gray-300 line-through' : ''}`}>{p.item}</p>
                                     <p className="type-caption opacity-40 truncate">{p.sched}</p>
                                  </div>
                               </div>
                            ))}
                            {allPrep.filter(p => p.childId === id).length === 0 && (
                               <div className="py-4 text-center opacity-30">
                                  <Backpack size={12} className="mx-auto mb-1" />
                                  <p className="text-[8px] font-bold">No Prep</p>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
              </section>
            )}

            {/* Today's Meal Dynamic Summary */}
            <section onClick={() => setActiveTab('meal')} className="glass-card !p-5 cursor-pointer active:scale-[0.98] transition-all border-none shadow-sm bg-orange-50/20 group">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                       <Utensils size={18} className="text-orange-600" />
                    </div>
                    <div>
                       <h2 className="type-section">오늘의 급식</h2>
                       {mealData.find(m => m.date === format(selectedDate, 'yyyyMMdd')) && (
                          <p className="text-[10px] font-black text-orange-500">{mealData.find(m => m.date === format(selectedDate, 'yyyyMMdd'))?.calInfo}</p>
                       )}
                    </div>
                 </div>
                 <ChevronRight size={16} className="text-orange-300" />
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                 {mealData.find(m => m.date === format(selectedDate, 'yyyyMMdd'))?.dishes.map((dish, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white border border-orange-100 text-[10px] font-bold text-gray-700 rounded-lg shadow-sm">
                       {dish}
                    </span>
                 )) || (
                    <p className="type-caption text-gray-400 italic py-2">오늘의 급식 정보가 없습니다.</p>
                 )}
              </div>
            </section>

            {/* Afterschool Snack Details */}
            { [...daySchedulesJeum, ...daySchedulesEum].filter(s => s.title.includes('간식')).length > 0 && (
               <section className="glass-card !p-5 border-none shadow-sm bg-blue-50/20 group animate-fade-in">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                       <Coffee size={18} className="text-blue-600" />
                    </div>
                    <div>
                       <h2 className="type-section">돌봄 간식</h2>
                       <p className="type-caption text-blue-500">오늘의 맛있는 간식 타임!</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-2">
                    {[daySchedulesJeum, daySchedulesEum].map((list, idx) => {
                       const snack = list.find(s => s.title.includes('간식'));
                       if (!snack) return null;
                       return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-50 shadow-sm">
                             <span className={`type-caption font-black ${idx === 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                {idx === 0 ? kidsInfo.jeum.name : kidsInfo.eum.name}
                             </span>
                             <span className="type-body font-black text-gray-900">{snack.title}</span>
                             <span className="type-time">{snack.start_time}</span>
                          </div>
                       );
                    })}
                 </div>
               </section>
            )}


          </>
        )}

        {/* Missing Tabs Content Restored */}
        {activeTab === 'schedule' && (
          <section className="space-y-4 animate-fade-in">
             <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} schoolEvents={schoolEvents} />
             <div className="space-y-4">
                <ChildTimeline 
                  child="jeum" 
                  schedules={daySchedulesJeum} 
                  timetable={timetableJeum}
                  date={selectedDate} 
                  onEdit={(s) => { setEditingSchedule(s as Schedule); setActiveChild('jeum'); setShowModal(true); }}
                />
                <ChildTimeline 
                  child="eum" 
                  schedules={daySchedulesEum} 
                  timetable={timetableEum}
                  date={selectedDate} 
                  onEdit={(s) => { setEditingSchedule(s as Schedule); setActiveChild('eum'); setShowModal(true); }}
                />
             </div>
          </section>
        )}


        {activeTab === 'prep' && (
          <section className="space-y-4 animate-fade-in">
             <div className="px-1"><h2 className="type-title">준비물 마스터</h2><p className="type-caption mt-1">오늘 챙겨야 할 모든 물건입니다 ({completedCount}/{allPrep.length})</p></div>
             <div className="glass-card !p-6"><div className="progress-mini mb-4 h-2"><div className="progress-mini-fill" style={{ width: `${progressPercent}%` }} /></div>
             <div className="divide-y divide-gray-50">{allPrep.map(p => (
                <div key={p.id} className="flex items-center gap-3 py-3" onClick={() => handleTogglePrep(p.id)}>
                   <input type="checkbox" checked={completedItems[p.id]} onChange={()=>{}} className="custom-checkbox !w-5 !h-5" />
                   <div className="flex-1 text-sm font-bold">{p.item} <span className="text-[10px] text-gray-400 font-normal ml-2">{p.child} · {p.sched}</span></div>
                </div>
             ))}</div></div>
          </section>
        )}

        {activeTab === 'meal' && (
           <MealListView 
             meals={mealData} 
             schedules={schedules} 
             kidsInfo={kidsInfo} 
             selectedDate={selectedDate} 
           />
        )}


        {activeTab === 'archive' && (
          <div className="animate-fade-in">
            <FileArchiveView archives={archives} onUploaded={handleArchiveUploaded} onDeleted={handleArchiveDeleted} />
          </div>
        )}

        {activeTab === 'settings' && (
           <SettingsView 
             kidsInfo={kidsInfo} 
             saveKidsInfo={saveKidsInfo} 
             theme={theme} 
             setTheme={setTheme} 
             onSchedulesChanged={() => loadSchedules(selectedDate)}
           />
        )}


      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      {showModal && (
        <ScheduleModal 
          child={activeChild} 
          date={selectedDate} 
          editSchedule={editingSchedule}
          onClose={() => { setShowModal(false); setEditingSchedule(undefined); }} 
          onSaved={handleScheduleAdded} 
          onDeleted={handleDeleteSchedule}
        />
      )}
    </div>
  );
}


function MealListView({ meals, schedules, kidsInfo, selectedDate }: any) {
  // Generate next 30 days of meals for a full monthly list
  const days = Array.from({ length: 30 }).map((_, i) => addDays(new Date(), i));

  return (
    <section className="space-y-6 animate-fade-in pb-10">
      <div className="px-1">
        <h2 className="type-title">식단 & 간식 마스터</h2>
        <p className="type-caption mt-1 text-gray-400">한 달간의 전체 급식과 간식 일정을 확인하세요</p>
      </div>


      <div className="space-y-4 px-1">
        {days.map((date, idx) => {
          const dateStr = format(date, 'yyyyMMdd');
          const dateTitle = format(date, 'M월 d일 (EEEE)', { locale: ko });
          const isWeekend = [0, 6].includes(date.getDay());
          const isToday = format(date, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd');

          const meal = (meals || []).find((m: any) => m.date === dateStr);
          const snackList = (schedules || []).filter((s: any) => s.date === format(date, 'yyyy-MM-dd') && s.title?.includes('간식'));

          // HIDE ENTIRE CARD if no data for the day
          if (!meal && snackList.length === 0) return null;

          return (
            <div key={dateStr} className={`glass-card !p-0 overflow-hidden border-none shadow-sm ${isToday ? 'ring-2 ring-orange-400 ring-offset-2' : ''} ${isWeekend ? 'opacity-30' : ''}`}>
               {/* Date Header ALWAYS shows if we reach here */}
               <div className={`px-4 py-2 flex items-center justify-between ${isToday ? 'bg-orange-600' : isWeekend ? 'bg-gray-400' : 'bg-gray-900'}`}>
                  <span className="text-[10px] font-black text-white">{dateTitle}</span>
                  {isToday && <span className="px-1.5 py-0.5 rounded bg-white text-[8px] font-black text-orange-600">TODAY</span>}
                  {isWeekend && <span className="text-[8px] font-black text-white/50">WEEKEND</span>}
               </div>

               <div className="p-4 space-y-4">
                  {/* school Meal Section - Only show if data exists */}
                  {meal && (
                    <div className="space-y-2 animate-fade-in">
                       <div className="flex items-center justify-between">
                          <p className="type-caption flex items-center gap-1.5 text-orange-600 font-bold"><Utensils size={10} /> 학교 급식</p>
                          <span className="text-[9px] font-bold text-gray-400">{meal.calInfo}</span>
                       </div>
                       <div className="flex flex-wrap gap-1.5">
                          {(meal.dishes || []).map((dish: any, midx: any) => (
                             <span key={midx} className="px-2 py-1 bg-orange-50 text-[10px] font-bold text-orange-800 rounded-lg">
                                {dish}
                             </span>
                          ))}
                       </div>
                    </div>
                  )}

                  {/* Afterschool Snack Section - Only show if data exists */}
                  {snackList.length > 0 && (
                     <div className="pt-3 border-t border-gray-50 bg-blue-50/20 -mx-4 -mb-4 p-4 space-y-2 animate-fade-in">
                        <p className="type-caption flex items-center gap-1.5 text-blue-600 font-bold"><Coffee size={10} /> 돌봄 간식</p>
                        <div className="grid grid-cols-1 gap-1.5">
                           {snackList.map((snack: any, sidx: any) => (
                              <div key={sidx} className="flex items-center justify-between bg-white/70 p-2 rounded-lg border border-blue-50">
                                 <span className={`text-[9px] font-black ${snack.child === 'jeum' ? 'text-blue-500' : 'text-emerald-500'}`}>
                                    {kidsInfo?.[snack.child as keyof typeof kidsInfo]?.name || snack.child}
                                 </span>
                                 <span className="type-body font-black text-gray-900">{snack.title?.replace('간식: ', '')}</span>
                                 <span className="type-time">{snack.start_time}</span>
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
    </section>
  );
}


function SettingsView({ kidsInfo, saveKidsInfo, theme, setTheme, onSchedulesChanged }: any) {

  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const promptText = `
[돌봄 간식 데이터 추출 프롬프트]
당신은 초등학교 돌봄교실 간식 식단표 이미지를 분석하는 전문가입니다. 
이미지에서 날짜(요일 포함)와 해당 날짜의 간식 메뉴를 정확히 추출하여 다음 JSON 형식으로 출력하세요.

### 규칙:
1. 날짜는 반드시 YYYY-MM-DD 형식으로 변환하세요.
2. 메뉴가 없는 날은 제외하세요.
3. 오직 JSON 코드 블록만 출력하세요.

### 출력 형식:
[
  { "date": "2026-03-30", "snack": "사과, 우유" },
  { "date": "2026-03-31", "snack": "고구마, 유산균음료" }
]
  `.trim();

  const handleImport = async () => {
    try {
      setImporting(true);
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) throw new Error('Invalid JSON format');

      const batch: any[] = [];
      data.forEach((item: any) => {
        ['jeum', 'eum'].forEach(child => {
          batch.push({
            child,
            title: `간식: ${item.snack}`,
            start_time: '14:30',
            end_time: '14:50',
            category: 'afterschool',
            date: item.date,
            preparations: []
          });
        });
      });

      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('schedules').insert(batch);
      
      if (error) throw error;
      
      alert(`성공적으로 ${data.length}일치 간식 일정을 양쪽 아이들에게 추가했습니다!`);
      setJsonInput('');
      onSchedulesChanged();
    } catch (err: any) {
      alert('오류: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-4 animate-fade-in">
       <div className="px-1"><h2 className="type-title">Settings</h2><p className="type-caption">Information and Preferences</p></div>
       
       {/* 1. Prompt Card */}
       <div className="glass-card !p-4 space-y-3 bg-purple-50/30 border-purple-100">
          <div className="flex items-center justify-between">
             <h3 className="type-section flex items-center gap-1.5 text-purple-700"><Sparkles size={14} /> AI 간식 추출 프롬프트</h3>
             <button 
               onClick={copyToClipboard}
               className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white shadow-sm shadow-purple-200'}`}
             >
                {copied ? 'COPIED!' : 'COPY PROMPT'}
             </button>
          </div>
          <p className="type-caption">간식 식단표 사진을 AI에게 줄 때 아래 프롬프트를 함께 사용해 보세요.</p>
          <div className="p-3 bg-white/50 rounded-xl border border-purple-50 text-[9px] text-gray-500 font-medium whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
             {promptText}
          </div>
       </div>

       {/* 2. Import JSON Card */}
       <div className="glass-card !p-4 space-y-3 bg-orange-50/30 border-orange-100">
          <div className="flex items-center justify-between">
             <h3 className="type-section flex items-center gap-1.5 text-orange-700">JSON 데이터 일괄 가져오기</h3>
             <button 
               onClick={handleImport}
               disabled={importing || !jsonInput}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${importing ? 'bg-gray-300' : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-30'}`}
             >
                {importing ? 'IMPORTING...' : '일괄 추가'}
             </button>
          </div>
          <p className="type-caption text-orange-600 font-bold">AI가 추출해준 JSON 코드를 아래에 붙여넣으세요.</p>
          <textarea 
             value={jsonInput}
             onChange={e => setJsonInput(e.target.value)}
             placeholder='[ {"date": "2026-04-01", "snack": "고구마"}, ... ]'
             className="w-full h-24 p-3 bg-white/70 rounded-xl border border-orange-100 text-[10px] font-mono outline-none ring-1 ring-orange-100/50 focus:ring-orange-400 focus:bg-white transition-all"
          />
       </div>

       {/* 3. Child Information Section */}


       <div className="glass-card !p-4 space-y-4">
          <h3 className="type-section">아이 정보 수정</h3>
          {['jeum', 'eum'].map((k:any) => (
             <div key={k} className={`p-4 rounded-xl border ${k === 'jeum' ? 'bg-blue-50/20 border-blue-50' : 'bg-emerald-50/20 border-emerald-50'} space-y-3`}>
                <p className="type-caption font-black uppercase text-gray-500">{k === 'jeum' ? 'First Child' : 'Second Child'}</p>
                <div className="grid grid-cols-2 gap-2">
                   <input type="text" value={kidsInfo[k].name} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...kidsInfo[k], name: e.target.value}})} className="col-span-2 w-full px-3 py-2 rounded-lg bg-white border-none text-[12px] font-bold outline-none ring-1 ring-gray-100" />
                   <div className="flex gap-2">
                      <input type="number" value={kidsInfo[k].grade} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...kidsInfo[k], grade: e.target.value}})} className="w-full px-3 py-2 rounded-lg bg-white text-[12px] font-bold ring-1 ring-gray-100 outline-none" />
                      <input type="number" value={kidsInfo[k].class} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...kidsInfo[k], class: e.target.value}})} className="w-full px-3 py-2 rounded-lg bg-white text-[12px] font-bold ring-1 ring-gray-100 outline-none" />
                   </div>
                </div>
             </div>
          ))}
       </div>

       {/* Appearance Section */}
       <div className="glass-card !p-4 space-y-4">
          <h3 className="type-section">Appearance</h3>
          <div className="flex p-1 bg-gray-50 rounded-lg gap-1">
             <button onClick={() => {setTheme('light'); document.body.className='';}} className={`flex-1 py-2 rounded-md text-[10px] font-black ${theme === 'light' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>LIGHT</button>
             <button onClick={() => {setTheme('dark'); document.body.className='dark-theme';}} className={`flex-1 py-2 rounded-md text-[10px] font-black ${theme === 'dark' ? 'bg-gray-900 text-white' : 'text-gray-400'}`}>DARK</button>
          </div>
       </div>
    </section>
  );
}


