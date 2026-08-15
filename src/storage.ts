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

export interface PoopRecord {
  id: string;
  date: string; // ISO string
  shape: PoopShape;
  color: PoopColor;
  memo?: string; // optional
}

const RECORDS_KEY = 'poop_records';

export async function loadRecords(): Promise<PoopRecord[]> {
  const raw = await Storage.getItem(RECORDS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as PoopRecord[];
}

export async function saveRecord(record: PoopRecord): Promise<void> {
  const records = await loadRecords();
  records.push(record);
  await Storage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export async function getLastRecordDate(): Promise<Date | null> {
  const records = await loadRecords();
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  return new Date(sorted[0].date);
}
