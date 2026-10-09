import { describe, expect, it } from 'vitest';
import { combineDateAndTime, isFutureTime, toTimeInputValue } from './recordTime';

describe('toTimeInputValue', () => {
  it('한 자리 시·분 앞에 0을 붙인다', () => {
    expect(toTimeInputValue(new Date(2026, 9, 9, 7, 5))).toBe('07:05');
    expect(toTimeInputValue(new Date(2026, 9, 9, 23, 48))).toBe('23:48');
  });
});

describe('combineDateAndTime', () => {
  it('고른 날짜에 입력한 시각을 붙인다', () => {
    expect(combineDateAndTime(new Date(2026, 9, 1), '08:30')).toEqual(new Date(2026, 9, 1, 8, 30));
  });

  it('날짜에 붙어 있던 원래 시각은 무시한다', () => {
    expect(combineDateAndTime(new Date(2026, 9, 1, 15, 0), '08:30')).toEqual(new Date(2026, 9, 1, 8, 30));
  });

  it('시각이 비어 있으면 그날 0시로 만든다', () => {
    expect(combineDateAndTime(new Date(2026, 9, 1, 15, 0), '')).toEqual(new Date(2026, 9, 1));
  });
});

describe('isFutureTime', () => {
  const now = new Date(2026, 9, 9, 14, 0);

  it('오늘 지금보다 늦은 시각이면 미래로 본다', () => {
    expect(isFutureTime(new Date(2026, 9, 9), '14:01', now)).toBe(true);
    expect(isFutureTime(new Date(2026, 9, 9), '14:00', now)).toBe(false);
  });

  it('지난 날짜는 늦은 시각이어도 미래가 아니다', () => {
    expect(isFutureTime(new Date(2026, 9, 8), '23:59', now)).toBe(false);
  });

  it('시각이 비어 있으면 미래가 아니다', () => {
    expect(isFutureTime(new Date(2026, 9, 9), '', now)).toBe(false);
  });
});
