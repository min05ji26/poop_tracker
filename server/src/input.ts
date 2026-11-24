// 앱이 보내는 리포트 입력. 숫자는 전부 앱(stats.ts)이 계산한 값이고, 서버·LLM은 계산하지 않는다
// 자유 텍스트(메모 등)는 받지 않는다 → 프롬프트 주입 여지도 없음. 냄새·색·닉네임·생년월일도 없음
// (색은 검정·붉은기 같은 건강 해석을 부르기 쉬워 동의 화면에서도 "보내지 않는 것"으로 안내)

export const SHAPE_LABELS = ['토끼똥', '방울똥', '바나나똥', '부들똥', '몽글똥', '죽똥', '물똥'] as const;
export const DURATION_LABELS = ['순삭', '보통', '오래', '사투'] as const;
export const TIME_SLOTS = ['새벽', '아침', '오후', '저녁'] as const;

export interface LabelRatio {
  label: string;
  count: number;
  ratio: number; // 0~1
}

export interface ReportInput {
  year: number;
  month: number; // 1~12
  coveredDays: number; // 이번 달이면 오늘까지 지난 날 수
  totalCount: number;
  recordDays: number;
  weeklyAverage: number;
  meanIntervalHours: number | null;
  shapes: LabelRatio[];
  timeSlots: LabelRatio[];
  durations: LabelRatio[]; // 비율 분모 = 걸린 시간을 입력한 기록 수
  durationInputRate: number; // 0~1
  vsLastMonth: {
    weeklyAverageDiff: number;
    meanIntervalHoursDiff: number | null;
  } | null; // 지난달 기록이 없으면 null
}

function isNum(v: unknown, min = -Infinity, max = Infinity): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isNumOrNull(v: unknown, min?: number, max?: number): v is number | null {
  return v === null || isNum(v, min, max);
}

function parseLabelList(v: unknown, allowed: readonly string[]): LabelRatio[] | null {
  if (!Array.isArray(v) || v.length > allowed.length) return null;
  const out: LabelRatio[] = [];
  for (const item of v) {
    if (typeof item !== 'object' || item === null) return null;
    const { label, count, ratio } = item as Record<string, unknown>;
    if (typeof label !== 'string' || !allowed.includes(label)) return null;
    if (!isNum(count, 0, 10000) || !Number.isInteger(count) || !isNum(ratio, 0, 1)) return null;
    out.push({ label, count, ratio });
  }
  return out;
}

// 형식이 하나라도 어긋나면 null (모르는 필드는 버린다)
export function parseReportInput(body: unknown): ReportInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (!isNum(b.year, 2024, 2100) || !isNum(b.month, 1, 12)) return null;
  if (!isNum(b.coveredDays, 0, 31) || !isNum(b.totalCount, 0, 10000) || !isNum(b.recordDays, 0, 31)) return null;
  if (!isNum(b.weeklyAverage, 0, 1000) || !isNumOrNull(b.meanIntervalHours, 0, 24 * 31)) return null;
  if (!isNum(b.durationInputRate, 0, 1)) return null;

  const shapes = parseLabelList(b.shapes, SHAPE_LABELS);
  const timeSlots = parseLabelList(b.timeSlots, TIME_SLOTS);
  const durations = parseLabelList(b.durations, DURATION_LABELS);
  if (!shapes || !timeSlots || !durations) return null;

  let vsLastMonth: ReportInput['vsLastMonth'] = null;
  if (b.vsLastMonth !== null && b.vsLastMonth !== undefined) {
    const v = b.vsLastMonth as Record<string, unknown>;
    if (typeof v !== 'object' || !isNum(v.weeklyAverageDiff, -1000, 1000) || !isNumOrNull(v.meanIntervalHoursDiff, -1000, 1000)) {
      return null;
    }
    vsLastMonth = { weeklyAverageDiff: v.weeklyAverageDiff, meanIntervalHoursDiff: v.meanIntervalHoursDiff };
  }

  return {
    year: b.year,
    month: b.month,
    coveredDays: b.coveredDays,
    totalCount: b.totalCount,
    recordDays: b.recordDays,
    weeklyAverage: b.weeklyAverage,
    meanIntervalHours: b.meanIntervalHours,
    shapes,
    timeSlots,
    durations,
    durationInputRate: b.durationInputRate,
    vsLastMonth,
  };
}
