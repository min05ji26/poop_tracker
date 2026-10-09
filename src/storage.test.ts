import { Storage } from '@apps-in-toss/web-framework';
import { describe, expect, it } from 'vitest';
import { loadRecords, migrateRecords, saveRecord } from './storage';

// 출시된 v1이 저장하던 형식 그대로 (hasTime 없음, date는 그날 0시)
const V1_RECORDS = [
  { id: 'a', date: new Date(2026, 8, 30).toISOString(), shape: '바나나똥', color: '갈색', memo: '물 많이 마심' },
  { id: 'b', date: new Date(2026, 9, 1).toISOString(), shape: '토끼똥', color: '황토색' },
];

async function storeV1Records() {
  await Storage.setItem('poop_records', JSON.stringify(V1_RECORDS));
}

describe('migrateRecords', () => {
  it('v1 기록을 하나도 지우지 않고 시각 없는 기록으로 바꾼다', async () => {
    await storeV1Records();
    await migrateRecords();

    const records = await loadRecords();
    expect(records).toEqual(V1_RECORDS.map((r) => ({ ...r, hasTime: false })));
  });

  it('저장소에도 v2 형식으로 다시 저장한다', async () => {
    await storeV1Records();
    await migrateRecords();

    const stored = JSON.parse((await Storage.getItem('poop_records'))!);
    expect(stored.every((r: { hasTime?: boolean }) => r.hasTime === false)).toBe(true);
    expect(await Storage.getItem('poop_records_version')).toBe('2');
  });

  it('두 번 실행해도 기록이 늘거나 바뀌지 않는다', async () => {
    await storeV1Records();
    await migrateRecords();
    const first = await loadRecords();
    await migrateRecords();

    expect(await loadRecords()).toEqual(first);
  });

  it('마이그레이션 이후 저장한 시각 있는 기록은 다시 실행해도 그대로 유지된다', async () => {
    await storeV1Records();
    await migrateRecords();
    const newRecord = {
      id: 'c',
      date: new Date(2026, 9, 2, 8, 30).toISOString(),
      hasTime: true,
      shape: '부들똥',
      color: '갈색',
    } as const;
    await saveRecord(newRecord);
    await migrateRecords();

    const records = await loadRecords();
    expect(records).toHaveLength(3);
    expect(records.find((r) => r.id === 'c')).toEqual(newRecord);
  });

  it('기록이 없는 신규 사용자도 오류 없이 버전만 표시한다', async () => {
    await migrateRecords();

    expect(await Storage.getItem('poop_records')).toBeNull();
    expect(await loadRecords()).toEqual([]);
    expect(await Storage.getItem('poop_records_version')).toBe('2');
  });
});

describe('loadRecords', () => {
  it('마이그레이션 전이라도 v1 기록을 시각 없는 기록으로 읽는다', async () => {
    await storeV1Records();

    expect((await loadRecords()).every((r) => r.hasTime === false)).toBe(true);
  });
});
