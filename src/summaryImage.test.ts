import { describe, expect, it } from 'vitest';
import type { PoopRecord } from './storage';
import { getMonthlyReport } from './stats';
import { comparisonLines, formatInterval, topLabel } from './statsFormat';
import { getSummaryImageContent } from './summaryImage';

let seq = 0;
function rec(date: Date, extra: Partial<PoopRecord> = {}): PoopRecord {
  seq += 1;
  return { id: `r${seq}`, date: date.toISOString(), hasTime: true, shape: '바나나똥', color: '갈색', ...extra };
}

const AFTER_NOV = new Date(2026, 11, 5);

describe('statsFormat', () => {
  it('간격은 48시간 미만이면 시간, 이상이면 일', () => {
    expect(formatInterval(19.2)).toBe('19시간');
    expect(formatInterval(55)).toBe('2.3일');
  });

  it('가장 많은 항목: 동점이면 라벨 순서상 앞, 전부 0이면 null', () => {
    const tie = [
      { label: 'a', count: 2, ratio: 0.5 },
      { label: 'b', count: 2, ratio: 0.5 },
    ];
    expect(topLabel(tie)?.label).toBe('a');
    expect(topLabel([{ label: 'a', count: 0, ratio: 0 }])).toBeNull();
  });

  it('지난달 비교 문구', () => {
    const records = [rec(new Date(2026, 9, 1, 9)), rec(new Date(2026, 9, 3, 9)), rec(new Date(2026, 10, 1, 9)), rec(new Date(2026, 10, 2, 9))];
    const r = getMonthlyReport(records, 2026, 10, AFTER_NOV);
    expect(comparisonLines(r.previous, r.vsLastMonth)).toEqual(['주 평균 횟수는 지난달과 비슷해요', '기록 간격이 24시간 짧아졌어요']);
  });
});

describe('getSummaryImageContent', () => {
  const records = [
    rec(new Date(2026, 10, 1, 8), { shape: '토끼똥', memo: '비밀 메모', smell: '생화학 무기' }),
    rec(new Date(2026, 10, 2, 8), { shape: '바나나똥' }),
    rec(new Date(2026, 10, 3, 20), { shape: '바나나똥' }),
  ];

  it('지난 달이면 한 달 기록, 가장 많은 모양·시간대를 담는다', () => {
    const c = getSummaryImageContent(getMonthlyReport(records, 2026, 10, AFTER_NOV), AFTER_NOV);
    expect(c.title).toBe('2026년 11월');
    expect(c.subtitle).toBe('한 달 풉 기록');
    expect(c.highlights[0]).toEqual({ label: '총 횟수', value: '3회' });
    expect(c.facts).toContainEqual({ label: '가장 많았던 모양', value: '바나나똥 67%' });
    expect(c.facts).toContainEqual({ label: '자주 기록한 시간대', value: '아침' });
    expect(c.fileName).toBe('pooptracker-2026-11.png');
  });

  it('이번 달이면 오늘까지라고 표시한다', () => {
    const now = new Date(2026, 10, 17, 12);
    expect(getSummaryImageContent(getMonthlyReport(records, 2026, 10, now), now).subtitle).toBe('17일까지의 풉 기록');
  });

  it('메모·냄새는 넣지 않는다', () => {
    const c = getSummaryImageContent(getMonthlyReport(records, 2026, 10, AFTER_NOV), AFTER_NOV);
    const text = JSON.stringify(c);
    expect(text).not.toContain('비밀 메모');
    expect(text).not.toContain('생화학');
  });

  it('지난달 기록이 없으면 비교 줄을 뺀다', () => {
    const c = getSummaryImageContent(getMonthlyReport(records, 2026, 10, AFTER_NOV), AFTER_NOV);
    expect(c.comparison).toEqual([]);
  });
});
