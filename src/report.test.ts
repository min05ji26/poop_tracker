import { describe, expect, it } from 'vitest';
import type { PoopRecord } from './storage';
import {
  buildMonthReport,
  getClientId,
  getDayCounts,
  getFallbackLine,
  getReportMonth,
  isReportSeen,
  loadCachedLine,
  markReportSeen,
  reportKey,
  saveCachedLine,
  toRelayInput,
} from './report';

let seq = 0;
function rec(date: Date, extra: Partial<PoopRecord> = {}): PoopRecord {
  seq += 1;
  return { id: `r${seq}`, date: date.toISOString(), hasTime: true, shape: '바나나똥', color: '갈색', ...extra };
}

const DEC_1 = new Date(2026, 11, 1, 9);

describe('결과지 대상 달', () => {
  it('지난달이 대상, 1월이면 작년 12월', () => {
    expect(getReportMonth(DEC_1)).toEqual({ year: 2026, month: 10 });
    expect(getReportMonth(new Date(2027, 0, 3))).toEqual({ year: 2026, month: 11 });
    expect(reportKey({ year: 2026, month: 10 })).toBe('2026-11');
  });

  it('지난달 기록이 없으면 결과지가 없다', () => {
    expect(buildMonthReport([rec(new Date(2026, 11, 1, 8))], DEC_1)).toBeNull();
    expect(buildMonthReport([rec(new Date(2026, 10, 20, 8))], DEC_1)?.current.totalCount).toBe(1);
  });
});

describe('달력·기본 한 줄 평', () => {
  it('날짜별 기록 횟수', () => {
    const counts = getDayCounts([rec(new Date(2026, 10, 1, 8)), rec(new Date(2026, 10, 1, 20)), rec(new Date(2026, 10, 30, 8))], { year: 2026, month: 10 });
    expect(counts).toHaveLength(30);
    expect(counts[0]).toBe(2);
    expect(counts[29]).toBe(1);
  });

  it('많았던 시간대·모양으로 기본 한 줄 평을 만든다', () => {
    const report = buildMonthReport([rec(new Date(2026, 10, 2, 8), { shape: '토끼똥' }), rec(new Date(2026, 10, 3, 9), { shape: '토끼똥' })], DEC_1)!;
    expect(getFallbackLine(report)).toBe('아침형 토끼똥 수집가의 한 달 💩');
  });
});

describe('중계 서버 입력', () => {
  it('월은 1~12로, 색·메모·냄새는 넣지 않는다', () => {
    const report = buildMonthReport([rec(new Date(2026, 10, 2, 8), { memo: '비밀', smell: '독함', color: '검정' })], DEC_1)!;
    const input = toRelayInput(report);
    expect(input.month).toBe(11);
    expect(input.vsLastMonth).toBeNull();
    const text = JSON.stringify(input);
    expect(text).not.toContain('비밀');
    expect(text).not.toContain('독함');
    expect(text).not.toContain('검정');
    expect(text).not.toContain('colors');
  });
});

describe('기기 저장', () => {
  it('한 줄 평은 같은 달일 때만 돌려준다', async () => {
    await saveCachedLine('2026-11', '바나나 장인 🍌');
    expect(await loadCachedLine('2026-11')).toBe('바나나 장인 🍌');
    expect(await loadCachedLine('2026-12')).toBeNull();
  });

  it('열어본 달을 기억한다', async () => {
    expect(await isReportSeen('2026-11')).toBe(false);
    await markReportSeen('2026-11');
    expect(await isReportSeen('2026-11')).toBe(true);
    expect(await isReportSeen('2026-12')).toBe(false);
  });

  it('익명 식별자는 한 번 만들면 그대로', async () => {
    const id = await getClientId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(await getClientId()).toBe(id);
  });
});

describe('requestAiLine', () => {
  const ok = (body: unknown) => (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;

  it('성공하면 한 줄 평, 막히거나 실패하면 null', async () => {
    const { requestAiLine } = await import('./aiReport');
    expect(await requestAiLine({}, 'c_1234567890', { relayUrl: 'http://x', fetcher: ok({ ok: true, text: ' 바나나 장인 🍌 ' }) })).toBe('바나나 장인 🍌');
    expect(await requestAiLine({}, 'c_1234567890', { relayUrl: 'http://x', fetcher: ok({ ok: false, reason: 'limit' }) })).toBeNull();
    const failing = (async () => {
      throw new Error('network');
    }) as unknown as typeof fetch;
    expect(await requestAiLine({}, 'c_1234567890', { relayUrl: 'http://x', fetcher: failing })).toBeNull();
    expect(await requestAiLine({}, 'c_1234567890', { relayUrl: '' })).toBeNull();
  });
});
