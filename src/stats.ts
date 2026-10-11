import type { PoopRecord } from './storage';

// 개인화 이상치 탐지: "평소의 나"(기록 간격의 평균·표준편차)와 비교해 지금이 늦은지 판정한다
// 순수 통계만 사용. 숫자 계산은 전부 여기서 하고 화면·LLM은 결과만 쓴다

const HOUR_MS = 60 * 60 * 1000;

export const WINDOW_DAYS = 60; // 최근 60일 기록만 사용
export const MAX_INTERVAL_HOURS = 7 * 24; // 7일 넘는 간격은 '기록을 잊은 것'으로 보고 제외
export const MIN_INTERVALS = 10; // 간격이 이보다 적으면 개인 기준을 믿기 어려움
export const LATE_MULTIPLIER = 1.5; // 주의 기준 배수 (초기값, 시뮬레이션으로 확정 예정)
export const WAY_LATE_MULTIPLIER = 2.5; // 한참 기준 배수 (초기값)

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
  lateThresholdHours: number | null; // 평균 + 1.5 × 표준편차
  wayLateThresholdHours: number | null; // 평균 + 2.5 × 표준편차
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
