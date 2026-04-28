'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addDays } from 'date-fns';


import { ko } from 'date-fns/locale';
import { Plus, RefreshCw, Settings, ChevronRight, Backpack, Utensils, Calendar, ExternalLink, FolderOpen, Trash2, Coffee, Sparkles, Sun, Clock, BookOpen, Check, Star, Moon } from 'lucide-react';


import BottomNav from '@/components/BottomNav';
import MealCard from '@/components/MealCard';
import MiniCalendar from '@/components/MiniCalendar';
import ChildTimeline from '@/components/ChildTimeline';
import ScheduleModal from '@/components/ScheduleModal';
import FileArchiveView from '@/components/FileArchiveView';

import { MealInfo, SchoolEvent, TimetableInfo } from '@/lib/neis';

import { supabase, Schedule, FileArchive, RecurringRule, isSupabaseConfigured } from '@/lib/supabase';


// const SAMPLE_SCHEDULES: Schedule[] = []; // Hardcoded samples removed


type ActiveChild = 'jeum' | 'eum' | 'mom';
type ScheduleCategory = 'school' | 'afterschool' | 'academy' | 'etc' | 'work';
type NewRecurringRuleInput = Omit<RecurringRule, 'id' | 'created_at' | 'is_active'>;

const LEGACY_RECURRING_RULES_STORAGE_KEY = 'recurringRules';
const AUTO_GENERATE_WEEKS = 8;
const WEEKDAY_OPTIONS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
] as const;

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
  const [fontScale, setFontScale] = useState(1.2);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});



  const [kidsInfo, setKidsInfo] = useState({
    jeum: { name: '열음', grade: '3', class: '2' },
    eum: { name: '지음', grade: '3', class: '3' },
    mom: { name: '엄마', grade: '', class: '' }
  });


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (savedTheme) { 
      setTheme(savedTheme); 
      document.body.className = savedTheme === 'dark' ? 'dark-theme' : ''; 
    }
    const savedScale = localStorage.getItem('fontScale');
    if (savedScale) {
       const scale = parseFloat(savedScale);
       setFontScale(scale);
       document.documentElement.style.setProperty('--font-scale', scale.toString());
    }
    const savedKids = localStorage.getItem('kidsInfo');
    if (savedKids) {
       const parsed = JSON.parse(savedKids);
       setKidsInfo(prev => ({ ...prev, ...parsed }));
    }
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
      const filtered = (json.data || []).filter((e: SchoolEvent) => e.eventName !== '토요휴업일');
      setSchoolEvents(filtered);
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

  const loadArchives = useCallback(async () => {
    try {
      if (!isSupabaseConfigured()) return;
      const { data, error } = await supabase
        .from('file_archives')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setArchives(data || []);
    } catch (err) {
      console.error('아카이브 로드 실패:', err);
    }
  }, []);


  useEffect(() => {
    loadMealData(selectedDate); 
    loadScheduleData(selectedDate); 
    loadTimetableData(selectedDate);
    loadSchedules(selectedDate);
  }, [selectedDate, loadMealData, loadScheduleData, loadTimetableData, loadSchedules]);

  useEffect(() => {
    loadArchives();
  }, [loadArchives]);


  const daySchedulesAll = schedules.filter(s => s.date === format(selectedDate, 'yyyy-MM-dd'));
  
  const daySchedulesJeum = daySchedulesAll.filter(s => s.child === 'jeum' && !s.title?.startsWith('간식:')).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const daySchedulesEum = daySchedulesAll.filter(s => s.child === 'eum' && !s.title?.startsWith('간식:')).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const daySchedulesMom = daySchedulesAll.filter(s => s.child === 'mom' && s.category !== 'afterschool').sort((a,b) => a.start_time.localeCompare(b.start_time));
  
  // Extra collection for Snacks
  const daySnacks = daySchedulesAll.filter(s => s.title?.startsWith('간식:'));

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
  const handleArchiveDeleted = async (id: string) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('file_archives').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('아카이브 삭제 실패:', err);
        alert('아카이브 삭제에 실패했습니다.');
        return;
      }
    }
    setArchives(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="min-h-screen pb-44 bg-[var(--bg-primary)] text-[var(--text-900)] relative">
      <header className="sticky top-0 z-40 bg-[var(--header-bg)] border-b-2 border-[var(--border)] px-4 py-3 shadow-sm">
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          <div className="w-full flex items-center justify-between">
            <div className="bg-[#FFF2A8] px-4 py-1.5 rounded-full shadow-sm border-2 border-[#FFE8A1]">
               <h1 className="text-[15px] font-black text-[#644D2F] flex items-center gap-2">
                 {format(selectedDate, 'M월 d일', { locale: ko })} 
                 <span className="opacity-60">{format(selectedDate, 'EEEE', { locale: ko })}</span>
               </h1>
            </div>
            
            <div className="flex items-center gap-2">
               <button onClick={() => { loadMealData(selectedDate); loadScheduleData(selectedDate); loadTimetableData(selectedDate); loadSchedules(selectedDate); loadArchives(); }} title="새로고침" className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--bg-card)] border-2 border-[#F3E5D8] dark:bg-[#1A1D27] dark:border-[#2A2F45] text-orange-400 hover:scale-110 active:scale-95 transition-all"><Clock size={16} strokeWidth={3} /></button>
               <button onClick={() => { setActiveTab('settings'); }} title="설정" className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#D6EFFF]/30 border-2 border-[#BEDEFF] dark:bg-[#3A4557] dark:border-[#4A5567] text-[#2C5282] dark:text-blue-300 shadow-sm hover:scale-110 active:scale-95 transition-all"><Settings size={18} strokeWidth={3} /></button>
               <button onClick={() => { 
                 const next = theme === 'light' ? 'dark' : 'light';
                 setTheme(next);
                 localStorage.setItem('theme', next);
                 document.body.className = next === 'dark' ? 'dark-theme' : '';
               }} title="테마 전환" className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FFDBC1]/30 border-2 border-[#FFCCB0] dark:bg-[#4D4036] dark:border-[#5D5046] text-[#854D0E] dark:text-orange-300 shadow-sm hover:scale-110 active:scale-95 transition-all font-black">
                  {theme === 'light' ? <Moon size={18} strokeWidth={3} /> : <Sun size={18} strokeWidth={3} />}
               </button>
            </div>
          </div>

          <div className="w-full flex items-center justify-center bg-[var(--border)]/30 p-1 rounded-full border-2 border-[var(--border)] max-w-xs mx-auto">
             {[
               { label: '어제', offset: -1, color: 'bg-[#D6EFFF] border-[#BEDEFF] text-[#2C5282]' },
               { label: '오늘', offset: 0, color: 'bg-[#FFF2A8] border-[#FFE8A1] text-[#644D2F]' },
               { label: '내일', offset: 1, color: 'bg-[#FFDBC1] border-[#FFCCB0] text-[#854D0E]' }
             ].map((tab, idx) => {
               const isToday = tab.offset === 0;
               return (
                 <button 
                   key={idx}
                   onClick={() => setSelectedDate(idx === 1 ? new Date() : addDays(new Date(), tab.offset))}
                   className={`flex-1 py-1 rounded-full text-[11px] font-black transition-all ${isToday ? 'shadow-sm border-2 ' + tab.color : 'text-[var(--text-400)] hover:text-[var(--text-700)]'}`}
                 >
                   {tab.label}
                 </button>
               );
             })}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {activeTab === 'home' && (
          <>
            <section className="grid grid-cols-2 gap-3">
              {[ 
                {k:'jeum', c: '#D6EFFF', bc: '#BEDEFF', tc: '#2C5282', e: '🦋', badge: '⭐'}, 
                {k:'eum', c: '#E1F7DB', bc: '#C5E9BC', tc: '#2F5912', e: '🌱', badge: '☁️'} 
              ].map(({k, c, bc, tc, e, badge}) => (
                <div key={k} className="glass-card !p-0 overflow-hidden flex flex-col bg-[var(--bg-card)] border-2 border-[var(--border)]">
                  <div className="p-3 pb-2 transition-colors" style={{ backgroundColor: theme === 'dark' ? `${c}15` : c }}>
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-1.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-lg shadow-sm border-2 border-[var(--border)]">{e}</div>
                          <h3 className="text-sm font-black" style={{ color: theme === 'dark' ? '#fff' : tc }}>{(kidsInfo as any)[k].name}</h3>
                       </div>
                       <div className="relative">
                          <div className="text-xl opacity-80">{badge}</div>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black pt-1">{(kidsInfo as any)[k].grade}-{(kidsInfo as any)[k].class}</span>
                       </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                       { (k === 'jeum' ? timetableJeum : timetableEum).length > 0 ? (k === 'jeum' ? timetableJeum : timetableEum).map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-[var(--bg-secondary)] border border-[var(--border)]" style={{ color: theme === 'dark' ? '#fff' : tc }}>{t.subject}</span>
                       )) : (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-[var(--bg-secondary)] border border-[var(--border)] opacity-40">시간표 없음</span>
                       )}
                    </div>
                  </div>

                  <div className="p-3 flex-1 bg-[var(--bg-card)] space-y-1.5 min-h-[100px] flex flex-col justify-start">
                     {(k === 'jeum' ? daySchedulesJeum : daySchedulesEum).length > 0 ? (k === 'jeum' ? daySchedulesJeum : daySchedulesEum).map(s => (
                        <div key={s.id} className="flex flex-col group py-0.5 border-b border-[var(--border)]/30 last:border-0 border-dashed">
                           <div className="flex items-center justify-between">
                              <span className="text-[12px] font-black text-[var(--text-900)] leading-tight truncate">{s.title}</span>
                              <button onClick={(e) => { e.stopPropagation(); setEditingSchedule(s as Schedule); setActiveChild(k as ActiveChild); setShowModal(true); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300"><Settings size={8} /></button>
                           </div>
                           <span className="text-[9px] font-bold text-[var(--text-400)]">{s.start_time}-{s.end_time}</span>
                        </div>
                     )) : (
                       <div className="py-4 text-center opacity-10 flex flex-col items-center gap-1 h-full justify-center">
                          <BookOpen size={18} />
                          <span className="text-[8px] font-black">일정 없음</span>
                       </div>
                     )}
                  </div>
                </div>
              ))}
              {/* Mom's Section */}
              <div className="col-span-2 glass-card !p-3 flex flex-col gap-2 bg-[var(--bg-card)] border-2 border-[var(--border)]">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-lg border-2 border-[var(--border)]">👩‍💼</div>
                       <h3 className="text-sm font-black text-[var(--text-900)]">엄마 근무</h3>
                       <button onClick={() => { setActiveChild('mom'); setShowModal(true); }} className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-400)] hover:scale-110 active:scale-95 transition-all border border-[var(--border)]"><Plus size={12} strokeWidth={3} /></button>
                    </div>
                    <div className="bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full border border-[var(--border)] text-[8px] font-black text-[var(--text-400)] shadow-sm uppercase">Work</div>
                 </div>
                 
                 <div className="bg-[var(--bg-card-hover)]/40 border border-dashed border-[var(--border)] rounded-xl p-2.5 text-center">
                    {daySchedulesMom.length > 0 ? (
                       <div className="space-y-1.5">
                          {daySchedulesMom.map(s => (
                             <div key={s.id} className="flex items-center justify-between bg-[var(--bg-card)]/50 p-2 rounded-lg border border-[var(--border)]">
                                <span className="font-black text-[var(--text-900)] text-[11px]">{s.title}</span>
                                <span className="text-[9px] font-bold text-gray-400 bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full border border-[var(--border)]">{s.start_time} - {s.end_time}</span>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <p className="text-[10px] font-bold text-[var(--text-400)] flex items-center justify-center gap-2">
                          <Sparkles size={12} className="opacity-30" />
                          기록된 근무 일정이 없습니다.
                       </p>
                    )}
                 </div>
              </div>
            </section>
            {allPrep.length > 0 && (
              <section className="space-y-4 animate-fade-in-up">
                <div className="flex items-center justify-between px-2">
                   <h2 className="text-lg font-black flex items-center gap-2 text-[var(--text-900)]"><Backpack size={18} className="text-[var(--text-400)]" /> 오늘의 준비물</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   {[ {id:'jeum', c:'#D6EFFF', tc:'#2C5282', bg: '#D6EFFF'}, {id:'eum', c:'#E1F7DB', tc:'#2F5912', bg: '#E1F7DB'} ].map(({id, c, tc, bg}) => (
                      <div key={id} className={`glass-card !p-4 flex flex-col gap-4 bg-[var(--bg-card)] border-2`} style={{ borderColor: theme === 'dark' ? 'var(--border)' : `${bg}80` }}>
                         <div className="flex justify-between items-center px-1">
                            <p className="text-[13px] font-black" style={{ color: theme === 'dark' ? '#fff' : tc }}>{(kidsInfo as any)[id].name}</p>
                            <span className="text-xl opacity-80">🎁</span>
                         </div>
                         <div className="space-y-2.5">
                            {allPrep.filter(p => p.childId === id).map((p) => (
                                <div key={p.id} className="p-3 bg-[var(--bg-card-hover)]/50 rounded-2xl border-2 border-[var(--border)] transition-all">
                                   <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: theme === 'dark' ? '#fff' : tc }} />
                                      <span className="text-[11px] font-bold truncate text-[var(--text-900)]">{p.item}</span>
                                   </div>
                                </div>
                            ))}
                            {allPrep.filter(p => p.childId === id).length === 0 && (
                               <div className="py-6 text-center opacity-20 flex flex-col items-center">
                                  <Star size={20} className="mb-1" />
                                  <p className="text-[9px] font-black">챙길 게 없어요!</p>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
              </section>
            )}
            <div className="glass-card !p-4 bg-[var(--bg-card)] border-2 border-orange-200/50 dark:border-orange-500/20 animate-fade-in-up relative overflow-hidden">
               {(() => {
                 const currentMeal = mealData.find(m => m.date === format(selectedDate, 'yyyyMMdd'));
                 const hour = new Date().getHours();
                 const statusMsg = hour < 11 ? "오늘 메뉴는 뭘까요? 😋" : hour < 14 ? "맛있는 점심 시간! 🍱" : "맛있게 먹었나요? ✨";
                 const isToday = format(selectedDate, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd');

                 return (
                   <>
                     <div className="absolute top-0 right-0 p-3 opacity-10">
                       <Utensils size={64} className="rotate-12" />
                     </div>
                     
                     <div className="flex items-center justify-between mb-4 relative z-10">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center border-2 border-orange-200 dark:border-orange-900/30 shadow-sm animate-bounce-slow">
                             <span className="text-xl">🍚</span>
                          </div>
                          <div>
                             <h2 className="text-[15px] font-black text-[var(--text-900)]">오늘의 급식</h2>
                             <p className="text-[10px] font-black text-orange-500/80">{isToday ? statusMsg : "그날의 식단표!"}</p>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <button onClick={() => setActiveTab('meal')} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white shadow-sm hover:scale-105 active:scale-95 transition-all outline-none">
                            <span className="text-[10px] font-black">전체보기</span>
                            <ChevronRight size={12} strokeWidth={3} />
                          </button>
                          {currentMeal?.calInfo && <span className="text-[9px] font-black text-[var(--text-400)]">{currentMeal.calInfo}</span>}
                       </div>
                     </div>

                     <div className="flex flex-wrap gap-1.5 relative z-10">
                       {currentMeal?.dishes.map((dish, idx) => {
                          const colors = ['bg-orange-50 text-orange-700 border-orange-100', 'bg-emerald-50 text-emerald-700 border-emerald-100', 'bg-blue-50 text-blue-700 border-blue-100', 'bg-purple-50 text-purple-700 border-purple-100'];
                          const darkColors = ['dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30', 'dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/30', 'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30', 'dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30'];
                          const colorIdx = idx % colors.length;
                          
                          return (
                            <span key={idx} className={`px-2.5 py-1.5 border-2 ${colors[colorIdx]} ${darkColors[colorIdx]} text-[11px] font-black rounded-xl shadow-sm hover:-translate-y-0.5 transition-transform cursor-default whitespace-nowrap`}>
                               {dish}
                            </span>
                          );
                       }) || (
                          <div className="w-full py-6 text-center opacity-30 flex flex-col items-center gap-2">
                             <span className="text-3xl">🫙</span>
                             <p className="text-[11px] font-black">급식 정보가 없어요.</p>
                          </div>
                       )}
                     </div>
                   </>
                 );
               })()}
                 
               {/* Specialized Snack Section in Meal Widget */}
               {daySnacks.length > 0 && (
                 <div className="mt-4 pt-4 border-t-2 border-dashed border-[var(--border)] animate-fade-in-up relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-6 h-6 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-400)] shadow-sm">
                         <Coffee size={12} strokeWidth={3} />
                       </div>
                       <span className="text-[11px] font-black text-[var(--text-400)] uppercase tracking-tighter">오늘의 간식</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       {daySnacks.filter((s,i,a) => a.findIndex(t => t.title === s.title) === i).map((s, idx) => (
                          <div key={idx} className="bg-[var(--bg-secondary)]/50 p-2.5 rounded-2xl border border-[var(--border)] flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors">
                             <span className="text-[11px] font-bold text-[var(--text-900)]">{s.title?.replace('간식: ', '')}</span>
                             <span className="text-[9px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-800/30">{s.start_time} - {s.end_time}</span>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          </>
        )}
        {activeTab === 'schedule' && (
          <section className="space-y-6 animate-fade-in-up">
             <div className="glass-card !p-2 bg-[var(--bg-card)]"><MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} schoolEvents={schoolEvents} /></div>
             <div className="space-y-4">
                <ChildTimeline child="jeum" schedules={daySchedulesJeum} timetable={timetableJeum} date={selectedDate} onEdit={(s:any) => { setEditingSchedule(s); setActiveChild('jeum'); setShowModal(true); }} onAdd={() => { setActiveChild('jeum'); setShowModal(true); }} />
                <ChildTimeline child="eum" schedules={daySchedulesEum} timetable={timetableEum} date={selectedDate} onEdit={(s:any) => { setEditingSchedule(s); setActiveChild('eum'); setShowModal(true); }} onAdd={() => { setActiveChild('eum'); setShowModal(true); }} />
                <ChildTimeline child="mom" schedules={daySchedulesMom} timetable={[]} date={selectedDate} onEdit={(s:any) => { setEditingSchedule(s); setActiveChild('mom'); setShowModal(true); }} onAdd={() => { setActiveChild('mom'); setShowModal(true); }} />
             </div>
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
              setTheme={(t:any) => { setTheme(t); localStorage.setItem('theme', t); document.body.className = t==='dark' ? 'dark-theme' : ''; }} 
              fontScale={fontScale}
              setFontScale={(s:any) => { setFontScale(s); localStorage.setItem('fontScale', s.toString()); document.documentElement.style.setProperty('--font-scale', s.toString()); }}
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
                              <span key={midx} className="px-2 py-1 bg-[var(--bg-card-hover)] text-[10px] font-bold text-[var(--text-700)] rounded-lg border border-[var(--border)]">
                                 {dish}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Afterschool Snack Section - CONSOLIDATED UNIFIED VIEW */}
                  { (() => {
                     const snackArr = snackList || [];
                     const uniqueSnacks = snackArr.filter((val: any, idx: number, arr: any[]) => {
                        return arr.findIndex((item: any) => item.title === val.title) === idx;
                     });
                     if (uniqueSnacks.length === 0) return null;



                     return (
                        <div className="pt-3 border-t border-[var(--border)] bg-blue-600/5 -mx-4 -mb-4 p-4 space-y-2 animate-fade-in transition-all">
                           <p className="type-caption flex items-center gap-1.5 text-blue-500 font-bold"><Coffee size={10} /> 오늘의 간식</p>
                           <div className="grid grid-cols-1 gap-1.5">
                              {uniqueSnacks.map((snack: any, sidx: any) => (
                                 <div key={sidx} className="flex items-center justify-between bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border)] shadow-sm">
                                    <span className="text-[11px] font-black text-[var(--text-900)] flex items-center gap-2">
                                       <span className="w-1 h-1 rounded-full bg-blue-500" />
                                       {snack.title?.replace('간식: ', '')}
                                    </span>
                                    <span className="type-time text-[var(--text-500)]">{snack.start_time}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     );
                  })()}
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


function SettingsView({ kidsInfo, saveKidsInfo, theme, setTheme, fontScale, setFontScale, onSchedulesChanged }: any) {


  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [isLoadingRecurringRules, setIsLoadingRecurringRules] = useState(false);
  const [isGeneratingRecurring, setIsGeneratingRecurring] = useState(false);
  const [ruleForm, setRuleForm] = useState<NewRecurringRuleInput>({
    child: 'jeum',
    title: '',
    start_time: '15:00',
    end_time: '16:00',
    category: 'afterschool',
    location: '',
    preparations: [],
    weekdays: [1],
  });
  const [rulePrepsInput, setRulePrepsInput] = useState('');
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

  const loadRecurringRules = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRecurringRules([]);
      return;
    }

    setIsLoadingRecurringRules(true);
    try {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecurringRules((data || []) as RecurringRule[]);
    } catch (err: any) {
      alert('반복 규칙 로드 실패: ' + err.message);
    } finally {
      setIsLoadingRecurringRules(false);
    }
  }, []);

  const migrateLegacyRecurringRules = useCallback(async () => {
    const savedRules = localStorage.getItem(LEGACY_RECURRING_RULES_STORAGE_KEY);
    if (!savedRules || !isSupabaseConfigured()) return;

    try {
      const parsed = JSON.parse(savedRules);
      if (!Array.isArray(parsed) || parsed.length === 0) return;

      const batch = parsed.map((rule: any) => ({
        child: rule.child,
        title: rule.title,
        start_time: rule.start_time,
        end_time: rule.end_time,
        category: rule.category,
        location: rule.location || null,
        preparations: Array.isArray(rule.preparations) ? rule.preparations : [],
        weekdays: Array.isArray(rule.weekdays) ? rule.weekdays : [],
        is_active: true,
      }));

      const { error } = await supabase.from('recurring_rules').insert(batch);
      if (error) throw error;

      localStorage.removeItem(LEGACY_RECURRING_RULES_STORAGE_KEY);
      alert(`기존 로컬 반복 규칙 ${batch.length}개를 DB로 이전했습니다.`);
    } catch (err: any) {
      alert('기존 로컬 반복 규칙 이전 실패: ' + err.message);
    }
  }, []);

  useEffect(() => {
    const initializeRecurringRules = async () => {
      await migrateLegacyRecurringRules();
      await loadRecurringRules();
    };

    initializeRecurringRules();
  }, [loadRecurringRules, migrateLegacyRecurringRules]);

  const toggleRuleWeekday = (day: number) => {
    setRuleForm((prev: NewRecurringRuleInput) => {
      const includesDay = prev.weekdays.includes(day);
      const weekdays = includesDay
        ? prev.weekdays.filter((d: number) => d !== day)
        : [...prev.weekdays, day].sort((a, b) => a - b);
      return { ...prev, weekdays };
    });
  };

  const handleAddRecurringRule = async () => {
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.');
      return;
    }

    const trimmedTitle = ruleForm.title.trim();
    if (!trimmedTitle) {
      alert('반복 일정 이름을 입력해주세요.');
      return;
    }
    if (ruleForm.weekdays.length === 0) {
      alert('반복 요일을 1개 이상 선택해주세요.');
      return;
    }

    const preparations = rulePrepsInput
      .split(',')
      .map((item: string) => item.trim())
      .filter(Boolean);

    const newRule: NewRecurringRuleInput = {
      ...ruleForm,
      title: trimmedTitle,
      location: ruleForm.location?.trim() || undefined,
      preparations,
    };

    try {
      const { error } = await supabase
        .from('recurring_rules')
        .insert({
          ...newRule,
          location: newRule.location || null,
          is_active: true,
        });
      if (error) throw error;
      await loadRecurringRules();
    } catch (err: any) {
      alert('반복 규칙 저장 실패: ' + err.message);
      return;
    }

    setRuleForm({
      child: 'jeum',
      title: '',
      start_time: '15:00',
      end_time: '16:00',
      category: 'afterschool',
      location: '',
      preparations: [],
      weekdays: [1],
    });
    setRulePrepsInput('');
  };

  const handleDeleteRecurringRule = async (ruleId: string) => {
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.');
      return;
    }

    try {
      const { error } = await supabase
        .from('recurring_rules')
        .update({ is_active: false })
        .eq('id', ruleId);
      if (error) throw error;
      await loadRecurringRules();
    } catch (err: any) {
      alert('반복 규칙 삭제 실패: ' + err.message);
    }
  };

  const makeScheduleKey = (item: {
    child: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    category: string;
  }) => [item.child, item.title, item.date, item.start_time, item.end_time, item.category].join('|');

  const handleGenerateRecurringSchedules = async () => {
    if (recurringRules.length === 0) {
      alert('먼저 반복 규칙을 추가해주세요.');
      return;
    }
    if (!isSupabaseConfigured()) {
      alert('Supabase 설정이 필요합니다.');
      return;
    }

    setIsGeneratingRecurring(true);
    try {
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, AUTO_GENERATE_WEEKS * 7), 'yyyy-MM-dd');

      const { data: existingData, error: existingError } = await supabase
        .from('schedules')
        .select('child,title,date,start_time,end_time,category')
        .gte('date', startDate)
        .lte('date', endDate);

      if (existingError) throw existingError;

      const existingKeys = new Set((existingData || []).map((item: any) => makeScheduleKey(item)));
      const toInsert: any[] = [];

      for (let i = 0; i <= AUTO_GENERATE_WEEKS * 7; i++) {
        const targetDate = addDays(today, i);
        const dayOfWeek = targetDate.getDay();
        const dateText = format(targetDate, 'yyyy-MM-dd');

        recurringRules.forEach((rule) => {
          if (!rule.weekdays.includes(dayOfWeek)) return;
          const candidate = {
            child: rule.child,
            title: rule.title,
            start_time: rule.start_time,
            end_time: rule.end_time,
            location: rule.location,
            category: rule.category,
            date: dateText,
            preparations: rule.preparations || [],
          };
          const key = makeScheduleKey(candidate);
          if (existingKeys.has(key)) return;
          existingKeys.add(key);
          toInsert.push(candidate);
        });
      }

      if (toInsert.length === 0) {
        alert('생성할 새 일정이 없습니다. (이미 동일 일정이 존재합니다)');
        return;
      }

      const { error: insertError } = await supabase.from('schedules').insert(toInsert);
      if (insertError) throw insertError;

      alert(`반복 일정 ${toInsert.length}건을 자동 생성했습니다.`);
      onSchedulesChanged();
    } catch (err: any) {
      alert('반복 일정 생성 실패: ' + err.message);
    } finally {
      setIsGeneratingRecurring(false);
    }
  };

  return (
    <section className="space-y-4 animate-fade-in">
       <div className="px-1"><h2 className="type-title">Settings</h2><p className="type-caption">Information and Preferences</p></div>
       
       {/* 1. Prompt Card */}
       <div className="glass-card !p-4 space-y-3 bg-purple-500/5 border-purple-500/10">
          <div className="flex items-center justify-between">
             <h3 className="type-section flex items-center gap-1.5 text-purple-600 dark:text-purple-400"><Sparkles size={14} /> AI 간식 추출 프롬프트</h3>
             <button 
               onClick={copyToClipboard}
               className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white shadow-sm'}`}
             >
                {copied ? 'COPIED!' : 'COPY PROMPT'}
             </button>
          </div>
          <p className="type-caption text-[var(--text-500)]">간식 식단표 사진을 AI에게 줄 때 아래 프롬프트를 함께 사용해 보세요.</p>
          <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] text-[9px] text-[var(--text-400)] font-medium whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
             {promptText}
          </div>
       </div>


       {/* 2. Import JSON Card */}
       <div className="glass-card !p-4 space-y-3 bg-orange-500/5 border-orange-500/10">
          <div className="flex items-center justify-between">
             <h3 className="type-section flex items-center gap-1.5 text-orange-600 dark:text-orange-400">JSON 데이터 일괄 가져오기</h3>
             <button 
               onClick={handleImport}
               disabled={importing || !jsonInput}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${importing ? 'bg-gray-300' : 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-30'}`}
             >
                {importing ? 'IMPORTING...' : '일괄 추가'}
             </button>
          </div>
          <p className="type-caption text-orange-600 font-bold opacity-80">AI가 추출해준 JSON 코드를 아래에 붙여넣으세요.</p>
          <textarea 
             value={jsonInput}
             onChange={e => setJsonInput(e.target.value)}
             placeholder='[ {"date": "2026-04-01", "snack": "고구마"}, ... ]'
             className="w-full h-24 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)] text-[10px] text-[var(--text-900)] font-mono outline-none focus:ring-1 focus:ring-orange-400 transition-all placeholder:text-[var(--text-400)]"
          />
       </div>


       {/* 3. Child Information Section */}
       <div className="glass-card !p-4 space-y-4 bg-sky-500/5 border-sky-500/10">
          <div className="flex items-center justify-between">
            <h3 className="type-section text-sky-600 dark:text-sky-400">반복 일정 자동 생성</h3>
            <button
              onClick={handleGenerateRecurringSchedules}
              disabled={isLoadingRecurringRules || isGeneratingRecurring || recurringRules.length === 0}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${isGeneratingRecurring ? 'bg-gray-300' : 'bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-30'}`}
            >
              {isGeneratingRecurring ? '생성 중...' : `앞으로 ${AUTO_GENERATE_WEEKS}주 생성`}
            </button>
          </div>
          <p className="type-caption text-[var(--text-500)]">반복 규칙을 등록해두면 버튼 한 번으로 미래 일정을 자동 생성합니다. 기존 동일 일정은 중복 생성하지 않습니다.</p>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={ruleForm.child}
                onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, child: e.target.value as ActiveChild }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
              >
                <option value="jeum">열음</option>
                <option value="eum">지음</option>
                <option value="mom">엄마</option>
              </select>
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, category: e.target.value as ScheduleCategory }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
              >
                <option value="school">학교</option>
                <option value="afterschool">방과후</option>
                <option value="academy">학원</option>
                <option value="etc">기타</option>
                <option value="work">근무</option>
              </select>
            </div>

            <input
              value={ruleForm.title}
              onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, title: e.target.value }))}
              placeholder="예: 독서논술"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={ruleForm.start_time}
                onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, start_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
              />
              <input
                type="time"
                value={ruleForm.end_time}
                onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, end_time: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
              />
            </div>

            <input
              value={ruleForm.location || ''}
              onChange={(e) => setRuleForm((prev: NewRecurringRuleInput) => ({ ...prev, location: e.target.value }))}
              placeholder="장소 (선택)"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
            />

            <input
              value={rulePrepsInput}
              onChange={(e) => setRulePrepsInput(e.target.value)}
              placeholder="준비물 (쉼표 구분, 선택)"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[11px] font-bold text-[var(--text-900)] outline-none"
            />

            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_OPTIONS.map((day) => {
                const isSelected = ruleForm.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleRuleWeekday(day.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all ${isSelected ? 'bg-sky-600 text-white border-sky-600' : 'bg-[var(--bg-primary)] text-[var(--text-500)] border-[var(--border)]'}`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleAddRecurringRule}
              type="button"
              className="w-full px-3 py-2 rounded-lg bg-sky-600 text-white text-[11px] font-black hover:bg-sky-700 transition-all"
            >
              반복 규칙 추가
            </button>
          </div>

          <div className="space-y-2">
            {isLoadingRecurringRules ? (
              <p className="text-[10px] text-[var(--text-400)] font-bold">반복 규칙을 불러오는 중입니다...</p>
            ) : recurringRules.length === 0 ? (
              <p className="text-[10px] text-[var(--text-400)] font-bold">등록된 반복 규칙이 없습니다.</p>
            ) : (
              recurringRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-[var(--text-900)] truncate">{rule.title}</p>
                    <p className="text-[9px] font-bold text-[var(--text-400)]">
                      {[rule.child, rule.category, `${rule.start_time}-${rule.end_time}`, rule.weekdays.map((d) => WEEKDAY_OPTIONS.find((w) => w.value === d)?.label).join('/')].join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteRecurringRule(rule.id)}
                    className="w-7 h-7 rounded-md border border-red-200 text-red-500 flex items-center justify-center shrink-0"
                    title="규칙 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
       </div>


       <div className="glass-card !p-4 space-y-4">
          <h3 className="type-section">가족 정보 수정</h3>
          {['jeum', 'eum', 'mom'].map((k:any) => {
             const info = (kidsInfo as any)[k];
             if (!info) return null;
             
             return (
               <div key={k} className={`p-4 rounded-xl border border-[var(--border)] ${k === 'jeum' ? 'bg-blue-500/5' : k === 'eum' ? 'bg-emerald-500/5' : 'bg-purple-500/5'} space-y-3`}>
                  <p className="type-caption font-black uppercase text-[var(--text-400)]">{k === 'jeum' ? 'First Child' : k === 'eum' ? 'Second Child' : 'Parent'}</p>
                  <div className="grid grid-cols-2 gap-2">
                     <input type="text" value={info.name || ''} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...info, name: e.target.value}})} placeholder="이름" className="col-span-2 w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[12px] font-bold text-[var(--text-900)] outline-none focus:border-blue-500 transition-all placeholder:text-gray-400" />
                     {k !== 'mom' && (
                       <div className="flex gap-2 w-full col-span-2">
                          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg border border-[var(--border)]">
                             <span className="text-[10px] font-black text-gray-400">학년</span>
                             <input type="number" value={info.grade} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...info, grade: e.target.value}})} className="w-full bg-transparent text-[12px] font-bold text-[var(--text-900)] outline-none" />
                          </div>
                          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-2 rounded-lg border border-[var(--border)]">
                             <span className="text-[10px] font-black text-gray-400">반</span>
                             <input type="number" value={info.class} onChange={e => saveKidsInfo({...kidsInfo, [k]: {...info, class: e.target.value}})} className="w-full bg-transparent text-[12px] font-bold text-[var(--text-900)] outline-none" />
                          </div>
                       </div>
                     )}
                  </div>
               </div>
             );
          })}
       </div>


        {/* Appearance Section */}
        <div className="glass-card !p-4 space-y-4">
           <h3 className="type-section">사용자 환경 설정</h3>
           
           <div className="space-y-3 pt-2">
              <p className="type-caption font-black text-[var(--text-400)] uppercase">글자 크기 (Font Size)</p>
              <div className="flex p-1 bg-[var(--bg-card-hover)] rounded-lg gap-1 overflow-x-auto no-scrollbar">
                 {[
                   { label: '최소', val: 0.8 },
                   { label: '작게', val: 0.9 },
                   { label: '기본', val: 1 },
                   { label: '크게', val: 1.1 },
                   { label: '최대', val: 1.2 }
                 ].map((size) => (
                    <button 
                      key={size.val}
                      onClick={() => setFontScale(size.val)} 
                      className={`flex-1 min-w-[48px] py-2 rounded-md text-[10px] font-black transition-all whitespace-nowrap ${fontScale === size.val ? 'bg-[var(--bg-card)] shadow-sm text-[var(--text-900)]' : 'text-[var(--text-400)]'}`}
                    >
                       {size.label}
                    </button>
                 ))}
              </div>
           </div>

        </div>

    </section>
  );
}


