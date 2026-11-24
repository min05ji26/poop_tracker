import { Storage } from '@apps-in-toss/web-framework';
import type { PoopRecord } from './storage';
import { getMonthlyReport, type MonthlyReport } from './stats';
import { topLabel } from './statsFormat';

// 월간 결과지: 끝난 달(지난달)만, 매월 1일부터 홈 배너로 도착한다
// 숫자·표·달력은 전부 여기와 stats.ts가 계산하고, AI는 "한 줄 평" 한 줄만 쓴다

export interface ReportMonth {
  year: number;
  month: number; // 0~11 (Date와 같음)
}

export function getReportMonth(now: Date = new Date()): ReportMonth {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function reportKey({ year, month }: ReportMonth): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// 지난달에 기록이 하나라도 있어야 결과지가 도착한다
export function buildMonthReport(records: PoopRecord[], now: Date = new Date()): MonthlyReport | null {
  const { year, month } = getReportMonth(now);
  const report = getMonthlyReport(records, year, month, now);
  return report.current.totalCount > 0 ? report : null;
}

// 달력에 칠할 날짜별 기록 횟수 (index 0 = 1일)
export function getDayCounts(records: PoopRecord[], { year, month }: ReportMonth): number[] {
  const counts = Array<number>(new Date(year, month + 1, 0).getDate()).fill(0);
  for (const r of records) {
    const d = new Date(r.date);
    if (d.getFullYear() === year && d.getMonth() === month) counts[d.getDate() - 1] += 1;
  }
  return counts;
}

// AI 한 줄 평을 못 받을 때(동의 안 함·실패·한도 초과) 쓰는 기본 한 줄 평
export function getFallbackLine(report: MonthlyReport): string {
  const shape = topLabel(report.current.shapes);
  const slot = topLabel(report.current.timeSlots);
  if (!shape) return '차곡차곡 기록한 한 달 💩';
  return slot ? `${slot.label}형 ${shape.label} 수집가의 한 달 💩` : `${shape.label} 수집가의 한 달 💩`;
}

// 중계 서버로 보내는 통계. 색·메모·냄새·닉네임·생년월일은 넣지 않는다 (동의 화면 안내와 같음)
export function toRelayInput(report: MonthlyReport) {
  const { current, previous, vsLastMonth } = report;
  return {
    year: current.year,
    month: current.month + 1,
    coveredDays: current.coveredDays,
    totalCount: current.totalCount,
    recordDays: current.recordDays,
    weeklyAverage: current.weeklyAverage,
    meanIntervalHours: current.meanIntervalHours,
    shapes: current.shapes,
    timeSlots: current.timeSlots,
    durations: current.durations,
    durationInputRate: current.durationInputRate,
    vsLastMonth:
      previous.totalCount === 0
        ? null
        : { weeklyAverageDiff: vsLastMonth.weeklyAverageDiff, meanIntervalHoursDiff: vsLastMonth.meanIntervalHoursDiff },
  };
}

// ───────────── 기기 저장 ─────────────

interface CachedLine {
  key: string;
  line: string;
  createdAt: string;
}

const LINE_CACHE_KEY = 'poop_report_ai_line';
const SEEN_KEY = 'poop_report_seen';
const CLIENT_ID_KEY = 'poop_client_id';

// AI 한 줄 평은 달마다 한 번만 받는다. 성공했을 때만 저장 (실패하면 다음에 열 때 다시 시도)
export async function loadCachedLine(key: string): Promise<string | null> {
  const raw = await Storage.getItem(LINE_CACHE_KEY);
  if (!raw) return null;
  const cached = JSON.parse(raw) as CachedLine;
  return cached.key === key ? cached.line : null;
}

export async function saveCachedLine(key: string, line: string, now: Date = new Date()): Promise<void> {
  const cached: CachedLine = { key, line, createdAt: now.toISOString() };
  await Storage.setItem(LINE_CACHE_KEY, JSON.stringify(cached));
}

// 배너의 NEW 표시: 그 달 결과지를 열어봤는지
export async function isReportSeen(key: string): Promise<boolean> {
  return (await Storage.getItem(SEEN_KEY)) === key;
}

export async function markReportSeen(key: string): Promise<void> {
  await Storage.setItem(SEEN_KEY, key);
}

// 중계 서버의 호출 횟수 제한에만 쓰는 익명 식별자. 기기에서 무작위로 만든다 (토스 계정과 무관)
export async function getClientId(): Promise<string> {
  const saved = await Storage.getItem(CLIENT_ID_KEY);
  if (saved) return saved;
  const id = `c_${crypto.randomUUID().replace(/-/g, '')}`;
  await Storage.setItem(CLIENT_ID_KEY, id);
  return id;
}
