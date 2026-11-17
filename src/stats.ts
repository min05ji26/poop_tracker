import { COLOR_LABELS, DURATION_LABELS, SHAPE_LABELS, type PoopRecord } from './storage';

// 개인화 이상치 탐지: "평소의 나"(기록 간격의 평균·표준편차)와 비교해 지금이 늦은지 판정한다
// 순수 통계만 사용. 숫자 계산은 전부 여기서 하고 화면·LLM은 결과만 쓴다

const HOUR_MS = 60 * 60 * 1000;

export const WINDOW_DAYS = 60; // 최근 60일 기록만 사용
export const MAX_INTERVAL_HOURS = 7 * 24; // 7일 넘는 간격은 '기록을 잊은 것'으로 보고 제외
export const MIN_INTERVALS = 10; // 간격이 이보다 적으면 개인 기준을 믿기 어려움
// 배수는 scripts/simulateThresholds.ts 시뮬레이션으로 확정 (평범한 사용자 기준 😐 월 1.2회, 😢 월 0.45회)
export const LATE_MULTIPLIER = 2.0; // 주의 기준 배수
export const WAY_LATE_MULTIPLIER = 3.0; // 한참 기준 배수

// 최근 기록 사이 간격(시간 단위). 시각을 모르는 기록(v1)이 낀 간격은 정확하지 않아 뺀다
export function getIntervalHours(records: PoopRecord[], now: Date = new Date()): number[] {
  const windowStart = now.getTime() - WINDOW_DAYS * 24 * HOUR_MS;
  const sorted = records
    .filter((r) => new Date(r.date).getTime() >= windowStart)
    .sort((a, b) => a.date.localeCompare(b.date));

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev.hasTime || !curr.hasTime) continue;
    const hours = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / HOUR_MS;
    if (hours > MAX_INTERVAL_HOURS) continue;
    intervals.push(hours);
  }
  return intervals;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// 표본 표준편차 (n-1로 나눔)
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// insufficient: 데이터 부족 / usual: 평소 / late: 늦음 / wayLate: 한참
export type GapLevel = 'insufficient' | 'usual' | 'late' | 'wayLate';

export interface GapStatus {
  level: GapLevel;
  hoursSinceLast: number | null; // 기록이 하나도 없으면 null
  intervalCount: number;
  meanHours: number | null; // 데이터 부족이면 null
  sdHours: number | null;
  lateThresholdHours: number | null; // 평균 + 2.0 × 표준편차
  wayLateThresholdHours: number | null; // 평균 + 3.0 × 표준편차
}

export interface GapMultipliers {
  late: number;
  wayLate: number;
}

const DEFAULT_MULTIPLIERS: GapMultipliers = { late: LATE_MULTIPLIER, wayLate: WAY_LATE_MULTIPLIER };

export function getGapStatus(
  records: PoopRecord[],
  now: Date = new Date(),
  multipliers: GapMultipliers = DEFAULT_MULTIPLIERS
): GapStatus {
  const lastTime = records.reduce<number | null>((latest, r) => {
    const t = new Date(r.date).getTime();
    return latest === null || t > latest ? t : latest;
  }, null);
  const hoursSinceLast = lastTime === null ? null : (now.getTime() - lastTime) / HOUR_MS;

  const intervals = getIntervalHours(records, now);
  if (hoursSinceLast === null || intervals.length < MIN_INTERVALS) {
    return {
      level: 'insufficient',
      hoursSinceLast,
      intervalCount: intervals.length,
      meanHours: null,
      sdHours: null,
      lateThresholdHours: null,
      wayLateThresholdHours: null,
    };
  }

  const meanHours = mean(intervals);
  const sdHours = standardDeviation(intervals);
  const lateThresholdHours = meanHours + multipliers.late * sdHours;
  const wayLateThresholdHours = meanHours + multipliers.wayLate * sdHours;

  let level: GapLevel = 'usual';
  if (hoursSinceLast > wayLateThresholdHours) level = 'wayLate';
  else if (hoursSinceLast > lateThresholdHours) level = 'late';

  return {
    level,
    hoursSinceLast,
    intervalCount: intervals.length,
    meanHours,
    sdHours,
    lateThresholdHours,
    wayLateThresholdHours,
  };
}

// ───────────── 월간 통계 ─────────────
// 통계 화면·요약 이미지·AI 리포트가 모두 이 결과를 입력으로 쓴다. 냄새는 재미용이라 넣지 않는다

export interface LabelCount<T extends string> {
  label: T;
  count: number;
  ratio: number; // 0~1, 분모가 0이면 0
}

export const TIME_SLOTS = ['새벽', '아침', '오후', '저녁'] as const; // 0~6시 / 6~12시 / 12~18시 / 18~24시
export type TimeSlot = (typeof TIME_SLOTS)[number];

export interface MonthlyStats {
  year: number;
  month: number; // 0~11 (Date와 같음)
  totalCount: number;
  recordDays: number; // 기록이 있는 날 수
  coveredDays: number; // 주 평균 계산에 쓴 날 수 (이번 달이면 오늘까지)
  weeklyAverage: number; // 주 평균 횟수
  meanIntervalHours: number | null; // 이번 달 기록 사이 평균 간격 (계산할 간격이 없으면 null)
  shapes: LabelCount<(typeof SHAPE_LABELS)[number]>[]; // 라벨 순서 고정
  colors: LabelCount<(typeof COLOR_LABELS)[number]>[];
  durations: LabelCount<(typeof DURATION_LABELS)[number]>[]; // 비율 분모 = 걸린 시간을 입력한 기록 수
  durationInputCount: number;
  durationInputRate: number; // 걸린 시간을 입력한 기록 비율
  timeSlots: LabelCount<TimeSlot>[]; // 비율 분모 = 시각이 있는 기록 수
  unknownTimeCount: number; // 시각을 모르는 v1 기록 수 (시간대 통계에서 제외)
}

export interface MonthlyComparison {
  totalCountDiff: number;
  weeklyAverageDiff: number;
  meanIntervalHoursDiff: number | null; // 둘 중 하나라도 간격이 없으면 null
}

export interface MonthlyReport {
  current: MonthlyStats;
  previous: MonthlyStats;
  vsLastMonth: MonthlyComparison;
}

function countLabels<T extends string>(labels: readonly T[], values: T[]): LabelCount<T>[] {
  return labels.map((label) => {
    const count = values.filter((v) => v === label).length;
    return { label, count, ratio: values.length === 0 ? 0 : count / values.length };
  });
}

function timeSlotOf(date: Date): TimeSlot {
  return TIME_SLOTS[Math.floor(date.getHours() / 6)];
}

export function getMonthlyStats(records: PoopRecord[], year: number, month: number, now: Date = new Date()): MonthlyStats {
  const monthStart = new Date(year, month, 1);
  const nextMonthStart = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const inMonth = records
    .filter((r) => {
      const t = new Date(r.date).getTime();
      return t >= monthStart.getTime() && t < nextMonthStart.getTime();
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 이번 달은 오늘까지만, 지난 달은 한 달 전체, 아직 안 온 달은 0일
  let coveredDays = daysInMonth;
  if (now.getTime() < monthStart.getTime()) coveredDays = 0;
  else if (now.getTime() < nextMonthStart.getTime()) coveredDays = now.getDate();

  const intervals: number[] = [];
  for (let i = 1; i < inMonth.length; i++) {
    const prev = inMonth[i - 1];
    const curr = inMonth[i];
    if (!prev.hasTime || !curr.hasTime) continue;
    const hours = (new Date(curr.date).getTime() - new Date(prev.date).getTime()) / HOUR_MS;
    if (hours > MAX_INTERVAL_HOURS) continue;
    intervals.push(hours);
  }

  const durations = inMonth.flatMap((r) => (r.duration ? [r.duration] : []));
  const timed = inMonth.filter((r) => r.hasTime);

  return {
    year,
    month,
    totalCount: inMonth.length,
    recordDays: new Set(inMonth.map((r) => new Date(r.date).getDate())).size,
    coveredDays,
    weeklyAverage: coveredDays === 0 ? 0 : (inMonth.length / coveredDays) * 7,
    meanIntervalHours: intervals.length === 0 ? null : mean(intervals),
    shapes: countLabels(SHAPE_LABELS, inMonth.map((r) => r.shape)),
    colors: countLabels(COLOR_LABELS, inMonth.map((r) => r.color)),
    durations: countLabels(DURATION_LABELS, durations),
    durationInputCount: durations.length,
    durationInputRate: inMonth.length === 0 ? 0 : durations.length / inMonth.length,
    timeSlots: countLabels(TIME_SLOTS, timed.map((r) => timeSlotOf(new Date(r.date)))),
    unknownTimeCount: inMonth.length - timed.length,
  };
}

export function getMonthlyReport(records: PoopRecord[], year: number, month: number, now: Date = new Date()): MonthlyReport {
  const current = getMonthlyStats(records, year, month, now);
  const prevMonth = new Date(year, month - 1, 1);
  const previous = getMonthlyStats(records, prevMonth.getFullYear(), prevMonth.getMonth(), now);

  return {
    current,
    previous,
    vsLastMonth: {
      totalCountDiff: current.totalCount - previous.totalCount,
      weeklyAverageDiff: current.weeklyAverage - previous.weeklyAverage,
      meanIntervalHoursDiff:
        current.meanIntervalHours === null || previous.meanIntervalHours === null
          ? null
          : current.meanIntervalHours - previous.meanIntervalHours,
    },
  };
}
