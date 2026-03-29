import { NextRequest, NextResponse } from 'next/server';
import { fetchMealInfo, fetchSchoolSchedule, fetchTimetable } from '@/lib/neis';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const startDate = searchParams.get('start') || format(new Date(), 'yyyyMMdd');
  const endDate = searchParams.get('end') || format(new Date(), 'yyyyMMdd');
  const grade = searchParams.get('grade');
  const classNm = searchParams.get('class');

  console.log(`📡 [API/NEIS] 요청 타입: ${type}, 날짜 범위: ${startDate} ~ ${endDate}`);

  try {
    if (type === 'meal') {
      const data = await fetchMealInfo(startDate, endDate);
      return NextResponse.json({ data });
    } else if (type === 'schedule') {
      const data = await fetchSchoolSchedule(startDate, endDate);
      return NextResponse.json({ data });
    } else if (type === 'timetable') {
      if (!grade || !classNm) {
        return NextResponse.json({ error: 'grade와 class 파라미터가 필요합니다' }, { status: 400 });
      }
      const data = await fetchTimetable(startDate, grade, classNm);
      return NextResponse.json({ data });
    }
    return NextResponse.json({ error: 'type 파라미터가 필요합니다 (meal | schedule | timetable)' }, { status: 400 });

  } catch (err) {
    console.error('💣 [API/NEIS] 처리 오류:', err);
    return NextResponse.json({ error: '데이터 조회에 실패했습니다' }, { status: 500 });
  }
}
