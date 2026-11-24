import { describe, expect, it } from 'vitest';
import { Storage } from '@apps-in-toss/web-framework';
import { disableLock, getLockout, isLockEnabled, isValidPin, LOCKOUT_MS, resetAllData, setPin, verifyPin } from './appLock';
import { loadRecords, saveRecord } from './storage';

describe('앱 잠금', () => {
  it('4자리 숫자만 비밀번호로 쓸 수 있다', () => {
    expect(isValidPin('0420')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('설정 전에는 꺼져 있고, 설정하면 비밀번호 대신 해시만 저장한다', async () => {
    expect(await isLockEnabled()).toBe(false);
    await setPin('0420');
    expect(await isLockEnabled()).toBe(true);
    const raw = (await Storage.getItem('poop_app_lock')) ?? '';
    expect(raw).not.toContain('0420');
  });

  it('맞으면 통과, 틀리면 남은 횟수를 알려준다', async () => {
    await setPin('0420');
    expect(await verifyPin('0420')).toEqual({ ok: true });
    expect(await verifyPin('1111')).toEqual({ ok: false, locked: false, attemptsLeft: 4 });
  });

  it('5번 틀리면 30초 동안 막히고, 지나면 다시 시도할 수 있다', async () => {
    await setPin('0420');
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) await verifyPin('1111', t);
    expect(await verifyPin('1111', t)).toEqual({ ok: false, locked: true, lockedUntil: t + LOCKOUT_MS });
    // 대기 중엔 맞는 비밀번호도 안 받는다 (앱을 다시 켜도 이어짐)
    expect(await getLockout(t + 1000)).toBe(t + LOCKOUT_MS);
    expect((await verifyPin('0420', t + 1000)).ok).toBe(false);
    // 30초 뒤
    expect(await getLockout(t + LOCKOUT_MS + 1)).toBeNull();
    expect(await verifyPin('1111', t + LOCKOUT_MS + 1)).toEqual({ ok: false, locked: false, attemptsLeft: 4 });
    expect(await verifyPin('0420', t + LOCKOUT_MS + 2)).toEqual({ ok: true });
  });

  it('맞히면 틀린 횟수가 초기화된다', async () => {
    await setPin('0420');
    await verifyPin('1111');
    await verifyPin('1111');
    await verifyPin('0420');
    expect(await verifyPin('1111')).toEqual({ ok: false, locked: false, attemptsLeft: 4 });
  });

  it('끄면 잠금이 풀린다', async () => {
    await setPin('0420');
    await disableLock();
    expect(await isLockEnabled()).toBe(false);
  });

  it('초기화하면 기록과 잠금이 모두 지워진다', async () => {
    await setPin('0420');
    await saveRecord({ id: 'a', date: new Date().toISOString(), hasTime: true, shape: '바나나똥', color: '갈색' });
    await resetAllData();
    expect(await isLockEnabled()).toBe(false);
    expect(await loadRecords()).toEqual([]);
  });
});
