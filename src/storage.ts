import { Storage } from '@apps-in-toss/web-framework';

export const SHAPE_LABELS = [
  '토끼똥',
  '방울똥',
  '바나나똥',
  '부들똥',
  '몽글똥',
  '죽똥',
  '물똥',
] as const;

export type PoopShape = (typeof SHAPE_LABELS)[number];

export const COLOR_LABELS = ['갈색', '황토색', '검정', '붉은기', '녹색', '기타'] as const;

export type PoopColor = (typeof COLOR_LABELS)[number];

// 걸린 시간·냄새는 선택 항목 (기록 안 해도 저장 가능)
export const DURATION_LABELS = ['순삭', '보통', '오래', '사투'] as const;

export type PoopDuration = (typeof DURATION_LABELS)[number];

// 냄새는 재미용 기록. 통계·AI 리포트 분석에는 쓰지 않음
export const SMELL_LABELS = ['거의 없음', '무난', '쿰쿰', '독함', '생화학 무기'] as const;

export type PoopSmell = (typeof SMELL_LABELS)[number];

export interface PoopRecord {
  id: string;
  date: string; // ISO string
  hasTime: boolean; // false면 시각을 모르는 기록(v1) → date는 그날 0시, 날짜 단위 통계에만 사용
  shape: PoopShape;
  color: PoopColor;
  duration?: PoopDuration; // optional
  smell?: PoopSmell; // optional
  memo?: string; // optional
}

const RECORDS_KEY = 'poop_records';
const RECORDS_VERSION_KEY = 'poop_records_version';
const CURRENT_RECORDS_VERSION = '2';

// v1 기록에는 hasTime이 없음 → 시각을 모르는 기록으로 취급
function normalizeRecord(record: Omit<PoopRecord, 'hasTime'> & { hasTime?: boolean }): PoopRecord {
  return { ...record, hasTime: record.hasTime ?? false };
}

export async function loadRecords(): Promise<PoopRecord[]> {
  const raw = await Storage.getItem(RECORDS_KEY);
  if (!raw) return [];
  return (JSON.parse(raw) as PoopRecord[]).map(normalizeRecord);
}

// 앱 시작 시 한 번 실행. 기존 기록은 지우지 않고 v2 형식으로 다시 저장한다
export async function migrateRecords(): Promise<void> {
  if ((await Storage.getItem(RECORDS_VERSION_KEY)) === CURRENT_RECORDS_VERSION) return;

  const raw = await Storage.getItem(RECORDS_KEY);
  if (raw) {
    const records = await loadRecords();
    await Storage.setItem(RECORDS_KEY, JSON.stringify(records));
  }
  await Storage.setItem(RECORDS_VERSION_KEY, CURRENT_RECORDS_VERSION);
}

export async function saveRecord(record: PoopRecord): Promise<void> {
  const records = await loadRecords();
  const index = records.findIndex((r) => r.id === record.id);
  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }
  await Storage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export async function deleteRecord(id: string): Promise<void> {
  const records = await loadRecords();
  const filtered = records.filter((r) => r.id !== id);
  await Storage.setItem(RECORDS_KEY, JSON.stringify(filtered));
}

export interface Profile {
  nickname: string;
  birthdate: string; // YYYY.MM.DD
}

const PROFILE_KEY = 'poop_profile';

export async function loadProfile(): Promise<Profile | null> {
  const raw = await Storage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await Storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ───────────── AI 한 줄 평 동의 ─────────────
// 동의 문구(보내는 항목·국외 이전 등)를 바꾸면 버전을 올려서 다시 동의받는다
export const AI_CONSENT_VERSION = 1;

export interface AiConsent {
  agreed: boolean;
  version: number;
  at: string; // 동의·철회한 시각 (ISO)
}

const AI_CONSENT_KEY = 'poop_ai_consent';

export async function loadAiConsent(): Promise<AiConsent | null> {
  const raw = await Storage.getItem(AI_CONSENT_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as AiConsent;
}

export async function saveAiConsent(agreed: boolean, now: Date = new Date()): Promise<AiConsent> {
  const consent: AiConsent = { agreed, version: AI_CONSENT_VERSION, at: now.toISOString() };
  await Storage.setItem(AI_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

// 지금 문구 버전에 동의한 상태일 때만 AI로 통계를 보낼 수 있다
export function isAiConsentActive(consent: AiConsent | null): boolean {
  return consent !== null && consent.agreed && consent.version === AI_CONSENT_VERSION;
}
