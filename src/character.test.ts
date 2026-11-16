import { describe, expect, it } from 'vitest';
import { getCharacterStatus } from './character';
import type { PoopRecord } from './storage';

const HOUR = 60 * 60 * 1000;

function record(time: number): PoopRecord {
  const date = new Date(time).toISOString();
  return { id: date, date, hasTime: true, shape: '바나나똥', color: '갈색' };
}

// 마지막 기록 시각 기준으로 간격(시간)만큼 거슬러 올라가며 기록을 만든다
function recordsEndingAt(last: number, intervalHours: number[]): PoopRecord[] {
  let t = last;
  const records = [record(t)];
  for (const h of [...intervalHours].reverse()) {
    t -= h * HOUR;
    records.unshift(record(t));
  }
  return records;
}

const last = new Date(2026, 9, 1, 9, 0).getTime();
const after = (hours: number) => new Date(last + hours * HOUR);

describe('getCharacterStatus', () => {
  it('기록이 없으면 첫 기록 안내', () => {
    const status = getCharacterStatus([], after(0));
    expect(status.mood).toBe('neutral');
    expect(status.headline).toBe('아직 기록이 없어요');
    expect(status.hint).toBeUndefined();
  });

  describe('간격 10개 미만: 기존 1일/3일 규칙 + 안내', () => {
    const records = recordsEndingAt(last, [24, 24, 24]);

    it('1일 이내면 happy', () => {
      const status = getCharacterStatus(records, after(47));
      expect(status.mood).toBe('happy');
      expect(status.hint).toBe('기록이 더 쌓이면 나만의 기준이 생겨요');
    });

    it('2~3일이면 neutral', () => {
      const status = getCharacterStatus(records, after(48));
      expect(status.mood).toBe('neutral');
      expect(status.headline).toBe('2일째 소식이 없어요...');
    });

    it('4일 이상이면 sad', () => {
      expect(getCharacterStatus(records, after(96)).mood).toBe('sad');
    });
  });

  describe('간격 10개 이상: 개인 기준', () => {
    // 이틀에 한 번쯤 가는 사람 (평균 48시간, 표준편차 약 6시간 → 늦음 약 60시간 / 한참 약 66시간)
    const records = recordsEndingAt(last, [42, 54, 42, 54, 42, 54, 42, 54, 42, 54, 48]);

    it('고정 규칙이면 시무룩했을 이틀째도 이 사람에겐 평소라 happy', () => {
      const status = getCharacterStatus(records, after(50));
      expect(status.mood).toBe('happy');
      expect(status.hint).toBeUndefined();
    });

    it('늦음이면 neutral', () => {
      const status = getCharacterStatus(records, after(62));
      expect(status.mood).toBe('neutral');
      expect(status.headline).toBe('평소보다 소식이 늦네요');
    });

    it('한참이면 sad', () => {
      const status = getCharacterStatus(records, after(70));
      expect(status.mood).toBe('sad');
      expect(status.headline).toBe('요즘 평소보다 한참 조용해요');
    });
  });
});
