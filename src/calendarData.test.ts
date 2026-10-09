import { describe, expect, it } from 'vitest';
import { formatRecordTime, groupRecordsByDate, toDateKey } from './calendarData';
import type { PoopRecord } from './storage';

function record(id: string, date: Date, hasTime = true): PoopRecord {
  return { id, date: date.toISOString(), hasTime, shape: '바나나똥', color: '갈색' };
}

describe('groupRecordsByDate', () => {
  it('같은 날 기록을 한 목록으로 묶고 시간순으로 정렬한다', () => {
    const groups = groupRecordsByDate([
      record('evening', new Date(2026, 9, 2, 21, 0)),
      record('other-day', new Date(2026, 9, 3, 9, 0)),
      record('morning', new Date(2026, 9, 2, 8, 30)),
    ]);

    expect(groups.get(toDateKey(new Date(2026, 9, 2)))?.map((r) => r.id)).toEqual(['morning', 'evening']);
    expect(groups.get(toDateKey(new Date(2026, 9, 3)))?.map((r) => r.id)).toEqual(['other-day']);
  });

  it('시각 모르는 v1 기록은 그날 맨 앞에 온다', () => {
    const groups = groupRecordsByDate([
      record('timed', new Date(2026, 9, 2, 7, 0)),
      record('v1', new Date(2026, 9, 2), false),
    ]);

    expect(groups.get(toDateKey(new Date(2026, 9, 2)))?.map((r) => r.id)).toEqual(['v1', 'timed']);
  });

  it('기록이 없으면 빈 Map', () => {
    expect(groupRecordsByDate([]).size).toBe(0);
  });
});

describe('formatRecordTime', () => {
  it('오전/오후 12시간제로 표시한다', () => {
    expect(formatRecordTime(record('a', new Date(2026, 9, 2, 8, 5)))).toBe('오전 8:05');
    expect(formatRecordTime(record('b', new Date(2026, 9, 2, 23, 30)))).toBe('오후 11:30');
  });

  it('0시는 오전 12시, 12시는 오후 12시', () => {
    expect(formatRecordTime(record('a', new Date(2026, 9, 2, 0, 15)))).toBe('오전 12:15');
    expect(formatRecordTime(record('b', new Date(2026, 9, 2, 12, 0)))).toBe('오후 12:00');
  });

  it('시각 없는 기록은 시각 모름', () => {
    expect(formatRecordTime(record('v1', new Date(2026, 9, 2), false))).toBe('시각 모름');
  });
});
