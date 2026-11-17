import { describe, expect, it } from 'vitest';
import type { PoopRecord } from './storage';
import { getMonthlyReport, getMonthlyStats } from './stats';

let seq = 0;
function rec(date: Date, extra: Partial<PoopRecord> = {}): PoopRecord {
  seq += 1;
  return { id: `r${seq}`, date: date.toISOString(), hasTime: true, shape: '바나나똥', color: '갈색', ...extra };
}

// 11월 = month 10
const NOV = (day: number, hour = 9, minute = 0) => new Date(2026, 10, day, hour, minute);
const OCT = (day: number, hour = 9) => new Date(2026, 9, day, hour);
const AFTER_NOV = new Date(2026, 11, 5); // 11월이 다 지난 시점

describe('getMonthlyStats', () => {
  it('기록이 없으면 0과 null', () => {
    const s = getMonthlyStats([], 2026, 10, AFTER_NOV);
    expect(s.totalCount).toBe(0);
    expect(s.weeklyAverage).toBe(0);
    expect(s.meanIntervalHours).toBeNull();
    expect(s.durationInputRate).toBe(0);
    expect(s.shapes.every((x) => x.count === 0 && x.ratio === 0)).toBe(true);
  });

  it('그 달 기록만 센다 (경계 포함)', () => {
    const records = [
      rec(new Date(2026, 9, 31, 23, 59)),
      rec(new Date(2026, 10, 1, 0, 0)),
      rec(new Date(2026, 10, 30, 23, 59)),
      rec(new Date(2026, 11, 1, 0, 0)),
    ];
    const s = getMonthlyStats(records, 2026, 10, AFTER_NOV);
    expect(s.totalCount).toBe(2);
    expect(s.recordDays).toBe(2);
  });

  it('하루 여러 번이면 횟수는 모두, 기록한 날은 하루로 센다', () => {
    const s = getMonthlyStats([rec(NOV(3, 8)), rec(NOV(3, 20)), rec(NOV(4))], 2026, 10, AFTER_NOV);
    expect(s.totalCount).toBe(3);
    expect(s.recordDays).toBe(2);
  });

  it('지난 달은 한 달 전체로 주 평균을 낸다', () => {
    // 11월 30일 동안 30번 → 주 7회
    const records = Array.from({ length: 30 }, (_, i) => rec(NOV(i + 1)));
    const s = getMonthlyStats(records, 2026, 10, AFTER_NOV);
    expect(s.coveredDays).toBe(30);
    expect(s.weeklyAverage).toBeCloseTo(7);
  });

  it('이번 달은 오늘까지 지난 날 수로 주 평균을 낸다', () => {
    // 11월 14일 현재 14번 → 주 7회 (30일로 나누면 3.3회로 낮게 나옴)
    const records = Array.from({ length: 14 }, (_, i) => rec(NOV(i + 1, 8)));
    const s = getMonthlyStats(records, 2026, 10, NOV(14, 22));
    expect(s.coveredDays).toBe(14);
    expect(s.weeklyAverage).toBeCloseTo(7);
  });

  it('아직 오지 않은 달은 0', () => {
    const s = getMonthlyStats([], 2026, 11, NOV(14));
    expect(s.coveredDays).toBe(0);
    expect(s.weeklyAverage).toBe(0);
  });

  it('평균 간격: 시각 모르는 기록이 낀 간격과 7일 넘는 간격은 뺀다', () => {
    const records = [
      rec(NOV(1, 9)),
      rec(NOV(2, 9)), // 24시간
      rec(NOV(3, 21)), // 36시간
      rec(new Date(2026, 10, 5), { hasTime: false }), // 앞뒤 간격 제외
      rec(NOV(6, 9)),
      rec(NOV(20, 9)), // 14일 → 제외
      rec(NOV(21, 9)), // 24시간
    ];
    expect(getMonthlyStats(records, 2026, 10, AFTER_NOV).meanIntervalHours).toBe(28);
  });

  it('모양·색 분포는 라벨 순서를 지키고 비율을 낸다', () => {
    const records = [
      rec(NOV(1), { shape: '토끼똥', color: '갈색' }),
      rec(NOV(2), { shape: '바나나똥', color: '갈색' }),
      rec(NOV(3), { shape: '바나나똥', color: '황토색' }),
      rec(NOV(4), { shape: '물똥', color: '갈색' }),
    ];
    const s = getMonthlyStats(records, 2026, 10, AFTER_NOV);
    expect(s.shapes.map((x) => x.label)).toEqual(['토끼똥', '방울똥', '바나나똥', '부들똥', '몽글똥', '죽똥', '물똥']);
    expect(s.shapes.find((x) => x.label === '바나나똥')).toEqual({ label: '바나나똥', count: 2, ratio: 0.5 });
    expect(s.colors.find((x) => x.label === '갈색')?.ratio).toBe(0.75);
  });

  it('걸린 시간: 입력한 기록만 분모로 쓰고 입력률을 따로 낸다', () => {
    const records = [
      rec(NOV(1), { duration: '순삭' }),
      rec(NOV(2), { duration: '순삭' }),
      rec(NOV(3), { duration: '사투' }),
      rec(NOV(4)),
    ];
    const s = getMonthlyStats(records, 2026, 10, AFTER_NOV);
    expect(s.durationInputCount).toBe(3);
    expect(s.durationInputRate).toBe(0.75);
    expect(s.durations.find((x) => x.label === '순삭')?.ratio).toBeCloseTo(2 / 3);
  });

  it('냄새는 결과에 들어가지 않는다', () => {
    const s = getMonthlyStats([rec(NOV(1), { smell: '생화학 무기' })], 2026, 10, AFTER_NOV);
    expect(JSON.stringify(s)).not.toContain('생화학');
  });

  it('시간대: 시각 있는 기록만 나누고 v1 기록은 따로 센다', () => {
    const records = [
      rec(NOV(1, 5, 59)), // 새벽
      rec(NOV(2, 6)), // 아침
      rec(NOV(3, 11)), // 아침
      rec(NOV(4, 12)), // 오후
      rec(NOV(5, 23)), // 저녁
      rec(new Date(2026, 10, 6), { hasTime: false }),
    ];
    const s = getMonthlyStats(records, 2026, 10, AFTER_NOV);
    expect(s.timeSlots.map((x) => [x.label, x.count])).toEqual([
      ['새벽', 1],
      ['아침', 2],
      ['오후', 1],
      ['저녁', 1],
    ]);
    expect(s.timeSlots.find((x) => x.label === '아침')?.ratio).toBe(0.4);
    expect(s.unknownTimeCount).toBe(1);
  });
});

describe('getMonthlyReport (지난달 대비)', () => {
  it('횟수·주 평균·평균 간격 차이를 계산한다', () => {
    const records = [
      // 10월: 31일 동안 2번, 간격 48시간
      rec(OCT(1)),
      rec(OCT(3)),
      // 11월: 30일 동안 3번, 간격 24·24시간
      rec(NOV(1)),
      rec(NOV(2)),
      rec(NOV(3)),
    ];
    const r = getMonthlyReport(records, 2026, 10, AFTER_NOV);
    expect(r.previous.totalCount).toBe(2);
    expect(r.vsLastMonth.totalCountDiff).toBe(1);
    expect(r.vsLastMonth.weeklyAverageDiff).toBeCloseTo((3 / 30) * 7 - (2 / 31) * 7);
    expect(r.vsLastMonth.meanIntervalHoursDiff).toBe(-24);
  });

  it('1월이면 작년 12월과 비교한다', () => {
    const r = getMonthlyReport([rec(new Date(2025, 11, 10)), rec(new Date(2026, 0, 10))], 2026, 0, new Date(2026, 1, 1));
    expect(r.previous.year).toBe(2025);
    expect(r.previous.month).toBe(11);
    expect(r.vsLastMonth.totalCountDiff).toBe(0);
  });

  it('한쪽이라도 평균 간격이 없으면 간격 차이는 null', () => {
    const r = getMonthlyReport([rec(NOV(1)), rec(NOV(2))], 2026, 10, AFTER_NOV);
    expect(r.vsLastMonth.meanIntervalHoursDiff).toBeNull();
  });
});
