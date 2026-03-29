-- Twin Smart Planner - Supabase 스키마

-- 스케줄 테이블
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('jeum', 'eum')),
  title text not null,
  start_time text not null,  -- 'HH:MM' 형식
  end_time text not null,    -- 'HH:MM' 형식
  location text,
  category text not null check (category in ('school', 'afterschool', 'academy', 'etc')),
  date date not null,
  color text,
  created_at timestamptz not null default now()
);

-- 파일 아카이브 테이블
create table if not exists public.file_archives (
  id uuid primary key default gen_random_uuid(),
  child text not null check (child in ('jeum', 'eum', 'both')),
  title text not null,
  file_url text not null,
  file_type text not null check (file_type in ('image', 'pdf')),
  description text,
  created_at timestamptz not null default now()
);

-- RLS 활성화
alter table public.schedules enable row level security;
alter table public.file_archives enable row level security;

-- 개발용 정책 (모든 접근 허용 - 프로덕션에서는 인증 기반으로 변경)
create policy "Allow all for schedules" on public.schedules for all using (true) with check (true);
create policy "Allow all for file_archives" on public.file_archives for all using (true) with check (true);

-- 인덱스
create index if not exists idx_schedules_child_date on public.schedules (child, date);
create index if not exists idx_file_archives_child on public.file_archives (child);

-- Storage 버킷 생성 (Supabase Dashboard에서 직접 생성 필요)
-- 버킷 이름: mykid-files (public)
