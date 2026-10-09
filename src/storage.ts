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

export async function getLastRecordDate(): Promise<Date | null> {
  const records = await loadRecords();
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  return new Date(sorted[0].date);
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
