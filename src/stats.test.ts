import { describe, expect, it } from 'vitest';
import type { PoopRecord } from './storage';
import { getGapStatus, getIntervalHours, mean, standardDeviation } from './stats';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function record(date: Date, hasTime = true): PoopRecord {
  return { id: date.toISOString(), date: date.toISOString(), hasTime, shape: '바나나똥', color: '갈색' };
}

// 첫 기록 시각부터 간격(시간)대로 이어지는 기록 목록
function recordsFromIntervals(start: Date, intervalHours: number[]): PoopRecord[] {
  let t = start.getTime();
  const records = [record(new Date(t))];
  for (const h of intervalHours) {
    t += h * HOUR;
    records.push(record(new Date(t)));
  }
  return records;
}

const start = new Date(2026, 8, 1, 9, 0);

describe('mean / standardDeviation', () => {
  it('평균과 표본 표준편차를 계산한다', () => {
    expect(mean([1, 3, 1, 3, 2])).toBe(2);
    expect(standardDeviation([1, 3, 1, 3, 2])).toBe(1);
  });

  it('값이 모자라면 0을 돌려준다', () => {
    expect(mean([])).toBe(0);
    expect(standardDeviation([5])).toBe(0);
  });
});

describe('getIntervalHours', () => {
  it('저장 순서와 상관없이 시간순으로 간격을 구한다', () => {
    const records = recordsFromIntervals(start, [24, 30, 18]).reverse();
    expect(getIntervalHours(records, new Date(2026, 8, 10))).toEqual([24, 30, 18]);
  });

  it('하루 여러 번 기록하면 짧은 간격도 그대로 포함한다', () => {
    const records = recordsFromIntervals(start, [3, 21, 2]);
    expect(getIntervalHours(records, new Date(2026, 8, 10))).toEqual([3, 21, 2]);
  });

  it('7일 넘는 간격은 뺀다', () => {
    const records = recordsFromIntervals(start, [24, 7 * 24, 7 * 24 + 1, 24]);
    expect(getIntervalHours(records, new Date(2026, 9, 1))).toEqual([24, 7 * 24, 24]);
  });

  it('시각을 모르는 기록(v1)이 낀 간격은 뺀다', () => {
    const records = [
      record(new Date(2026, 8, 1, 9)),
      record(new Date(2026, 8, 2), false),
      record(new Date(2026, 8, 3, 9)),
      record(new Date(2026, 8, 4, 10)),
    ];
    expect(getIntervalHours(records, new Date(2026, 8, 10))).toEqual([25]);
  });

  it('최근 60일 밖의 기록은 쓰지 않는다', () => {
    const now = new Date(2026, 10, 1, 9);
    const old = record(new Date(now.getTime() - 61 * DAY));
    const recent = recordsFromIntervals(new Date(now.getTime() - 3 * DAY), [24, 24]);
    // old와 첫 recent 사이 간격(58일)은 7일 규칙과 별개로 60일 밖이라 빠짐
    expect(getIntervalHours([old, ...recent], now)).toEqual([24, 24]);
  });
});

describe('getGapStatus', () => {
  it('기록이 없으면 데이터 부족', () => {
    const status = getGapStatus([], new Date(2026, 8, 1));
    expect(status.level).toBe('insufficient');
    expect(status.hoursSinceLast).toBeNull();
    expect(status.intervalCount).toBe(0);
  });

  it('간격이 10개 미만이면 데이터 부족 (경과 시간은 알려준다)', () => {
    const records = recordsFromIntervals(start, Array(9).fill(24));
    const last = new Date(records[records.length - 1].date).getTime();
    const status = getGapStatus(records, new Date(last + 100 * HOUR));
    expect(status.level).toBe('insufficient');
    expect(status.intervalCount).toBe(9);
    expect(status.hoursSinceLast).toBe(100);
    expect(status.meanHours).toBeNull();
  });

  describe('매일 비슷한 시각에 가는 사용자 (규칙적)', () => {
    // 평균 24시간, 표준편차 2시간 → 주의 28시간 / 한참 30시간
    const records = recordsFromIntervals(start, [22, 26, 22, 26, 22, 26, 22, 26, 22, 26, 24]);
    const last = new Date(records[records.length - 1].date).getTime();
    const at = (hours: number) => getGapStatus(records, new Date(last + hours * HOUR));

    it('평균·표준편차·기준을 계산한다', () => {
      const status = at(0);
      expect(status.intervalCount).toBe(11);
      expect(status.meanHours).toBe(24);
      expect(status.sdHours).toBeCloseTo(2, 5);
      expect(status.lateThresholdHours).toBeCloseTo(28, 5);
      expect(status.wayLateThresholdHours).toBeCloseTo(30, 5);
    });

    it('기준에 따라 평소 → 늦음 → 한참으로 바뀐다', () => {
      expect(at(27).level).toBe('usual');
      expect(at(28).level).toBe('usual'); // 기준과 같으면 아직 평소
      expect(at(29).level).toBe('late');
      expect(at(31).level).toBe('wayLate');
    });
  });

  describe('들쭉날쭉한 사용자 B (1·3·1·3·2일)', () => {
    const days = [1, 3, 1, 3, 2, 1, 3, 1, 3, 2];
    const records = recordsFromIntervals(start, days.map((d) => d * 24));
    const last = new Date(records[records.length - 1].date).getTime();
    const sd = standardDeviation(days) * 24;
    const at = (hours: number) => getGapStatus(records, new Date(last + hours * HOUR));

    it('3일 간격은 B에게 평소', () => {
      expect(at(72).level).toBe('usual');
    });

    it('평균 + 2배 표준편차를 넘으면 늦음, 3배를 넘으면 한참', () => {
      expect(at(48 + 2 * sd + 1).level).toBe('late');
      expect(at(48 + 3 * sd + 1).level).toBe('wayLate');
    });
  });

  it('규칙적인 사람은 같은 경과 시간에도 더 빨리 반응한다', () => {
    const regular = recordsFromIntervals(start, [23, 25, 23, 25, 23, 25, 23, 25, 23, 25]);
    const irregular = recordsFromIntervals(start, [12, 60, 12, 60, 12, 60, 12, 60, 12, 60]);
    const lastOf = (rs: PoopRecord[]) => new Date(rs[rs.length - 1].date).getTime();
    expect(getGapStatus(regular, new Date(lastOf(regular) + 40 * HOUR)).level).toBe('wayLate');
    expect(getGapStatus(irregular, new Date(lastOf(irregular) + 40 * HOUR)).level).toBe('usual');
  });

  it('배수를 바꿔서 판정할 수 있다 (임계값 시뮬레이션용)', () => {
    const records = recordsFromIntervals(start, [22, 26, 22, 26, 22, 26, 22, 26, 22, 26, 24]);
    const last = new Date(records[records.length - 1].date).getTime();
    const now = new Date(last + 29 * HOUR);
    expect(getGapStatus(records, now).level).toBe('late');
    expect(getGapStatus(records, now, { late: 3, wayLate: 4 }).level).toBe('usual');
  });

  it('긴 공백(7일 초과)은 기준 계산에서 빠지지만 경과 시간에는 반영된다', () => {
    const records = recordsFromIntervals(start, [24, 24, 24, 24, 24, 10 * 24, 22, 26, 22, 26, 24]);
    const last = new Date(records[records.length - 1].date).getTime();
    const status = getGapStatus(records, new Date(last + 5 * DAY));
    expect(status.intervalCount).toBe(10);
    expect(status.meanHours).toBe(24);
    expect(status.level).toBe('wayLate');
  });
});
