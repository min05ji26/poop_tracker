import { Storage } from '@apps-in-toss/web-framework';

// 앱 잠금 비밀번호 (4자리). 비밀번호는 저장하지 않고 PBKDF2 해시만 기기에 저장한다
// 분실 시 되살릴 방법이 없어서 "모든 데이터 초기화"만 가능 (설정할 때 미리 안내)

export const PIN_LENGTH = 4;
export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30_000;

const LOCK_KEY = 'poop_app_lock';
const FAIL_KEY = 'poop_app_lock_fail';
const ITERATIONS = 100_000;

interface StoredLock {
  salt: string; // base64
  hash: string; // base64
  iterations: number;
}

interface FailState {
  count: number;
  lockedUntil: number | null; // epoch ms
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return toBase64(new Uint8Array(bits));
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

async function loadLock(): Promise<StoredLock | null> {
  const raw = await Storage.getItem(LOCK_KEY);
  return raw ? (JSON.parse(raw) as StoredLock) : null;
}

export async function isLockEnabled(): Promise<boolean> {
  return (await loadLock()) !== null;
}

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('비밀번호는 숫자 4자리여야 해요');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const stored: StoredLock = { salt: toBase64(salt), hash: await derive(pin, salt, ITERATIONS), iterations: ITERATIONS };
  await Storage.setItem(LOCK_KEY, JSON.stringify(stored));
  await Storage.removeItem(FAIL_KEY);
}

export async function disableLock(): Promise<void> {
  await Storage.removeItem(LOCK_KEY);
  await Storage.removeItem(FAIL_KEY);
}

async function loadFail(): Promise<FailState> {
  const raw = await Storage.getItem(FAIL_KEY);
  return raw ? (JSON.parse(raw) as FailState) : { count: 0, lockedUntil: null };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; locked: false; attemptsLeft: number }
  | { ok: false; locked: true; lockedUntil: number };

// 지금 대기 중이면 남은 시각을 알려준다 (앱을 껐다 켜도 이어짐)
export async function getLockout(now: number = Date.now()): Promise<number | null> {
  const fail = await loadFail();
  return fail.lockedUntil !== null && fail.lockedUntil > now ? fail.lockedUntil : null;
}

export async function verifyPin(pin: string, now: number = Date.now()): Promise<VerifyResult> {
  const lock = await loadLock();
  if (!lock) return { ok: true };

  const fail = await loadFail();
  if (fail.lockedUntil !== null && fail.lockedUntil > now) return { ok: false, locked: true, lockedUntil: fail.lockedUntil };

  const hash = await derive(pin, fromBase64(lock.salt), lock.iterations);
  if (hash === lock.hash) {
    await Storage.removeItem(FAIL_KEY);
    return { ok: true };
  }

  // 대기 시간이 끝났으면 횟수를 새로 센다
  const count = (fail.lockedUntil !== null ? 0 : fail.count) + 1;
  if (count >= MAX_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_MS;
    await Storage.setItem(FAIL_KEY, JSON.stringify({ count: 0, lockedUntil } satisfies FailState));
    return { ok: false, locked: true, lockedUntil };
  }
  await Storage.setItem(FAIL_KEY, JSON.stringify({ count, lockedUntil: null } satisfies FailState));
  return { ok: false, locked: false, attemptsLeft: MAX_ATTEMPTS - count };
}

// 비밀번호를 잊었을 때: 기록·프로필·동의·잠금까지 이 기기의 풉트래커 데이터를 모두 지운다
export async function resetAllData(): Promise<void> {
  await Storage.clearItems();
}
