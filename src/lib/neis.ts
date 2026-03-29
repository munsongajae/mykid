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
    console.warn('⚠️ NEIS API 환경 변수가 누락되었습니다.');
    return [];
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
        return [];
      }
    }

    if (!data.mealServiceDietInfo) {
      console.warn('⚠️ [NEIS/Meal] 급식 데이터가 존재하지 않습니다.');
      return [];
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
    return [];
  }
}


// 학사 일정 조회
export async function fetchSchoolSchedule(
  startDate: string,
  endDate: string
): Promise<SchoolEvent[]> {
  const { apiKey, officeCode, schoolCode } = getEnv();

  if (!apiKey || !officeCode || !schoolCode) {
    return [];
  }


  try {
    const url = `${BASE_URL}/SchoolSchedule?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${officeCode}&SD_SCHUL_CODE=${schoolCode}&AA_FROM_YMD=${startDate}&AA_TO_YMD=${endDate}`;
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (!data.SchoolSchedule) {
      if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
        console.error('❌ [NEIS/Schedule] API 서버 응답 에러:', data.RESULT.MESSAGE);
      }
      return [];
    }


    const rows = data.SchoolSchedule[1]?.row || [];
    return rows.map((row: Record<string, string>) => ({
      date: row.AA_YMD,
      eventName: row.EVENT_NM,
      eventContent: row.EVENT_CNTNT,
    }));
  } catch (error) {
    console.error('🔥 [NEIS/Schedule] 호출 중 오류:', error);
    return [];
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
    return [];
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

