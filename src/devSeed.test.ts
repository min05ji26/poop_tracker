import { describe, expect, it } from 'vitest';
import { generateSampleRecords, seedSampleRecords } from './devSeed';
import { COLOR_LABELS, SHAPE_LABELS, loadRecords } from './storage';

const NOW = new Date(2026, 9, 6, 15, 0);

describe('generateSampleRecords', () => {
  it('같은 seed면 같은 기록을 만든다', () => {
    expect(generateSampleRecords({ seed: 7, now: NOW })).toEqual(generateSampleRecords({ seed: 7, now: NOW }));
  });

  it('지정한 기간 안의 과거 기록만 만들고 시간순으로 정렬한다', () => {
    const records = generateSampleRecords({ days: 30, now: NOW });
    const earliest = new Date(2026, 8, 7).getTime();

    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      const time = new Date(record.date).getTime();
      expect(time).toBeGreaterThanOrEqual(earliest);
      expect(time).toBeLessThanOrEqual(NOW.getTime());
    }
    const dates = records.map((r) => r.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('정해진 모양·색 라벨만 쓰고 id가 겹치지 않는다', () => {
    const records = generateSampleRecords({ now: NOW });

    for (const record of records) {
      expect(SHAPE_LABELS).toContain(record.shape);
      expect(COLOR_LABELS).toContain(record.color);
    }
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  });

  it('하루 여러 번 기록이 포함된다', () => {
    const records = generateSampleRecords({ now: NOW });
    const countByDay = new Map<string, number>();
    for (const record of records) {
      const key = new Date(record.date).toDateString();
      countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    }
    expect(Math.max(...countByDay.values())).toBeGreaterThan(1);
  });
});

describe('seedSampleRecords', () => {
  it('저장소에 샘플 기록을 저장하면 loadRecords로 읽힌다', async () => {
    const count = await seedSampleRecords({ days: 10, now: NOW });
    expect(await loadRecords()).toHaveLength(count);
  });
});
