-- MyKid Planner 샘플 데이터 삽입 (SQL)
-- 이 쿼리는 현재 날짜(CURRENT_DATE) 기준으로 데이터를 생성합니다.

-- 기존 샘플이 있다면 삭제 (주의: 실제 데이터도 삭제될 수 있음. 신규 테스트 시에만 사용)
-- DELETE FROM public.schedules;

INSERT INTO public.schedules (child, title, start_time, end_time, location, category, date)
VALUES 
  -- 첫째 (열음) 일정
  ('jeum', '정규 수업', '08:40', '14:30', '교실', 'school', CURRENT_DATE),
  ('jeum', '수영 연습', '15:00', '16:00', '시립 수영장', 'academy', CURRENT_DATE),
  ('jeum', '체스 클래스', '17:00', '18:10', '방과후 센터', 'academy', CURRENT_DATE),
  ('jeum', '영어 독서', '19:30', '20:30', '집', 'etc', CURRENT_DATE),

  -- 둘째 (지음) 일정
  ('eum', '학교 수업', '08:50', '14:30', '교실', 'school', CURRENT_DATE),
  ('eum', '스케이트보드 교실', '15:30', '16:30', '스케이트 파크', 'afterschool', CURRENT_DATE),
  ('eum', '현대 미술 수업', '17:10', '18:30', '아트 갤러리 학원', 'academy', CURRENT_DATE),
  ('eum', '코딩 기초', '19:00', '20:00', '집 (온라인)', 'academy', CURRENT_DATE);

-- 내일 확인용 데이터
INSERT INTO public.schedules (child, title, start_time, end_time, location, category, date)
VALUES 
  ('jeum', '학교 체험학습', '09:00', '15:00', '박물관', 'school', CURRENT_DATE + interval '1 day'),
  ('eum', '학교 정규수업', '08:50', '14:30', null, 'school', CURRENT_DATE + interval '1 day');
