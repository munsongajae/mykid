-- Twin Smart Planner - Supabase 스키마

-- 스케줄 테이블
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('jeum', 'eum', 'mom')),
  title text not null,
  start_time text not null,  -- 'HH:MM' 형식
  end_time text not null,    -- 'HH:MM' 형식
  location text,
  category text not null check (category in ('school', 'afterschool', 'academy', 'etc', 'work')),
  date date not null,
  color text,
  created_at timestamptz not null default now()
);

-- 파일 아카이브 테이블
create table if not exists public.file_archives (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('jeum', 'eum', 'mom', 'both', 'all')),
  title text not null,
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  description text,
  created_at timestamptz not null default now()
);

-- 반복 일정 규칙 테이블
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('jeum', 'eum', 'mom')),
  title text not null,
  start_time text not null, -- 'HH:MM'
  end_time text not null,   -- 'HH:MM'
  category text not null check (category in ('school', 'afterschool', 'academy', 'etc', 'work')),
  location text,
  preparations text[] not null default '{}',
  weekdays int[] not null default '{}', -- 0:Sun ~ 6:Sat
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.schedules enable row level security;
alter table public.file_archives enable row level security;
alter table public.recurring_rules enable row level security;

-- 개발용 정책 (모든 접근 허용 - 프로덕션에서는 인증 기반으로 변경)
drop policy if exists "Allow all for schedules" on public.schedules;
create policy "Allow all for schedules" on public.schedules for all using (true) with check (true);
drop policy if exists "Allow all for file_archives" on public.file_archives;
create policy "Allow all for file_archives" on public.file_archives for all using (true) with check (true);
drop policy if exists "Allow all for recurring_rules" on public.recurring_rules;
create policy "Allow all for recurring_rules" on public.recurring_rules for all using (true) with check (true);

-- 인덱스
create index if not exists idx_schedules_child_date on public.schedules (child, date);
create index if not exists idx_file_archives_child on public.file_archives (child);
create index if not exists idx_recurring_rules_active on public.recurring_rules (is_active, child, created_at);

-- Storage 버킷 생성 (Supabase Dashboard에서 직접 생성 필요)
-- 버킷 이름: mykid-files (public)
