// NEIS 오픈 API 연동 유틸리티
const BASE_URL = 'https://open.neis.go.kr/hub';

// 알레르기 번호 및 특수문자 제거 정규표현식
const cleanMenuName = (name: string): string => {
  return name
    .replace(/\d+(\.\d+)*/g, '') // 숫자 제거 (알레르기 번호)
    .replace(/[().]/g, '')         // 괄호, 마침표 제거
    .trim();
};

export type MealInfo = {
  date: string;
  mealType: string;
  dishes: string[];
  calInfo?: string;
  ntrInfo?: string;
};

export type SchoolEvent = {
  date: string;
  eventName: string;
  eventContent?: string;
};

export type TimetableInfo = {
  date: string;
  grade: string;
  classNm: string;
  period: string;
  subject: string;
};


// 환경 변수 가져오기 (서버/클라이언트 공용)
const getEnv = () => ({
  apiKey: process.env.NEXT_PUBLIC_NEIS_API_KEY,
  officeCode: process.env.NEXT_PUBLIC_OFFICE_CODE,
  schoolCode: process.env.NEXT_PUBLIC_SCHOOL_CODE
});

// 급식 정보 조회
export async function fetchMealInfo(
  startDate: string,
  endDate: string
): Promise<MealInfo[]> {
  const { apiKey, officeCode, schoolCode } = getEnv();

  if (!apiKey || !officeCode || !schoolCode) {
    console.warn('⚠️ NEIS API 환경 변수가 누락되었습니다. Mock 데이터를 사용합니다.', { officeCode, schoolCode });
    return getMockMealData(startDate);
  }

  try {
    const url = `${BASE_URL}/mealServiceDietInfo?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_FROM_YMD=${startDate}&MLSV_TO_YMD=${endDate}`;
    
    const res = await fetch(url, { cache: 'no-store' }); // 디버깅을 위해 결과 캐싱 방지
    const data = await res.json();

    // NEIS 에러 처리 (데이터가 없는 경우 등)
    if (data.RESULT) {
      if (data.RESULT.CODE === 'INFO-200') { // 해당 일자에 데이터가 없음
        console.log(`ℹ️ [NEIS/Meal] ${startDate} ~ ${endDate} 기간에 급식 정보가 없습니다.`);
        return [];
      }
      if (data.RESULT.CODE !== 'INFO-000') {
        console.error('❌ [NEIS/Meal] API 서버 응답 에러:', data.RESULT.MESSAGE);
        return getMockMealData(startDate);
      }
    }

    if (!data.mealServiceDietInfo) {
      // head 부분의 에러 코드 확인
      const headResult = data.RESULT || (data.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT);
      if (headResult && headResult.CODE !== 'INFO-000') {
         console.warn(`⚠️ [NEIS/Meal] 데이터 조회 실패: ${headResult.MESSAGE}`);
      }
      return getMockMealData(startDate);
    }

    const rows = data.mealServiceDietInfo[1]?.row || [];
    console.log(`✅ [NEIS/Meal] ${rows.length}개의 데이터를 성공적으로 가져왔습니다.`);

    return rows.map((row: Record<string, string>) => ({
      date: row.MLSV_YMD,
      mealType: row.MMEAL_SC_NM,
      dishes: row.DDISH_NM
        ? row.DDISH_NM.split('<br/>').map(cleanMenuName).filter(Boolean)
        : [],
      calInfo: row.CAL_INFO,
      ntrInfo: row.NTR_INFO,
    }));
  } catch (error) {
    console.error('🔥 [NEIS/Meal] 호출 중 오류:', error);
    return getMockMealData(startDate);
  }
}

// 학사 일정 조회
export async function fetchSchoolSchedule(
  startDate: string,
  endDate: string
): Promise<SchoolEvent[]> {
  const { apiKey, officeCode, schoolCode } = getEnv();

  if (!apiKey || !officeCode || !schoolCode) {
    return getMockScheduleData();
  }

  try {
    const url = `${BASE_URL}/SchoolSchedule?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${startDate}&AA_TO_YMD=${endDate}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!data.SchoolSchedule) {
      if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
        console.error('❌ [NEIS/Schedule] API 서버 응답 에러:', data.RESULT.MESSAGE);
      }
      return getMockScheduleData();
    }

    const rows = data.SchoolSchedule[1]?.row || [];
    return rows.map((row: Record<string, string>) => ({
      date: row.AA_YMD,
      eventName: row.EVENT_NM,
      eventContent: row.EVENT_CNTNT,
    }));
  } catch (error) {
    console.error('🔥 [NEIS/Schedule] 호출 중 오류:', error);
    return getMockScheduleData();
  }
}

// 시간표 조회
export async function fetchTimetable(
  date: string,
  grade: string,
  classNm: string,
  schoolLevel: 'els' | 'mis' | 'his' = 'els'
): Promise<TimetableInfo[]> {
  const { apiKey, officeCode, schoolCode } = getEnv();

  if (!apiKey || !officeCode || !schoolCode) {
    return getMockTimetableData(date, grade, classNm);
  }

  try {
    const endpoint = `${schoolLevel}Timetable`;
    const url = `${BASE_URL}/${endpoint}?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&ALL_TI_YMD=${date}&GRADE=${grade}&CLASS_NM=${classNm}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!data[endpoint]) {
      if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
        console.warn(`⚠️ [NEIS/Timetable] 데이터 조회 실패 (${date}): ${data.RESULT.MESSAGE}`);
      }
      return [];
    }

    const rows = data[endpoint][1]?.row || [];
    return rows.map((row: Record<string, string>) => ({
      date: row.ALL_TI_YMD,
      grade: row.GRADE,
      classNm: row.CLASS_NM,
      period: row.PERIO,
      subject: row.ITRT_CNTNT,
    }));
  } catch (error) {
    console.error('🔥 [NEIS/Timetable] 호출 중 오류:', error);
    return [];
  }
}


// 목업 데이터 (API 키 미설정 시 현재 날짜 기준으로 생성)
function getMockMealData(baseDate: string): MealInfo[] {
  const year = baseDate.substring(0, 4);
  const month = baseDate.substring(4, 6);
  
  // 현재 달의 1일부터 말일까지 더 풍부한 목업 데이터 생성
  const mockMeals: MealInfo[] = [];
  const dishOptions = [
    ['현미밥', '미역국', '돼지불고기', '깍두기', '배추김치', '우유'],
    ['잡곡밥', '된장국', '고등어구이', '시금치나물', '깍두기'],
    ['볶음밥', '맑은국', '닭강정', '무생채', '배추김치'],
    ['차조밥', '콩나물국', '제육볶음', '상추쌈', '쌈장'],
    ['비빔밥', '계란후라이', '약고추장', '콩나물국', '요구르트']
  ];

  for (let d = 1; d <= 31; d++) {
    const dayStr = String(d).padStart(2, '0');
    mockMeals.push({
      date: `${year}${month}${dayStr}`,
      mealType: '중식',
      dishes: dishOptions[d % dishOptions.length],
      calInfo: `${600 + (d * 5 % 150)} Kcal`,
    });
  }
  
  return mockMeals;
}


function getMockScheduleData(): SchoolEvent[] {
  return [
    { date: '20260401', eventName: '개교기념일' },
    { date: '20260415', eventName: '체험학습' },
    { date: '20260501', eventName: '근로자의날 (휴업)' },
    { date: '20260610', eventName: '1학기 중간고사' },
  ];
}

function getMockTimetableData(date: string, grade: string, classNm: string): TimetableInfo[] {
  return [
    { date, grade, classNm, period: '1', subject: '국어' },
    { date, grade, classNm, period: '2', subject: '수학' },
    { date, grade, classNm, period: '3', subject: '통합교과(봄)' },
    { date, grade, classNm, period: '4', subject: '창의적 체험활동' },
    { date, grade, classNm, period: '5', subject: '체육' },
  ];
}


// 준비물 키워드 매핑
export const PREP_MAP: Record<string, string[]> = {
  수영: ['수영복', '수경', '수건', '샤워도구', '수영모'],
  스케이트보드: ['보드', '헬멧', '보호대', '장갑'],
  체스: ['체스판', '기록장', '필기구'],
  미술: ['앞치마', '개인도구', '물통', '팔레트'],
  축구: ['축구화', '유니폼', '물병', '정강이 보호대'],
  농구: ['농구화', '유니폼', '물병'],
  피아노: ['악보', '연습노트'],
  태권도: ['도복', '띠', '발보호대'],
  영어: ['교재', '필기구', '단어장'],
  수학: ['교재', '필기구', '계산기'],
  체험학습: ['도시락', '물병', '편한 신발', '상비약'],
  현장체험: ['도시락', '물병', '편한 신발', '우비'],
};

export function getPreparationItems(title: string, customMap?: Record<string, string[]>): string[] {
  const items = new Set<string>();
  const mergedMap = { ...PREP_MAP, ...(customMap || {}) };
  
  for (const [keyword, prepItems] of Object.entries(mergedMap)) {
    if (title.includes(keyword)) {
      prepItems.forEach(item => items.add(item));
    }
  }
  return Array.from(items);
}

