import type { PoopRecord } from './storage';

// 달력 칸을 찾기 위한 키 (월은 0부터)
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// 날짜별 기록 목록. 각 날짜 안에서는 시간순(시각 모르는 기록은 0시라 맨 앞)
export function groupRecordsByDate(records: PoopRecord[]): Map<string, PoopRecord[]> {
  const groups = new Map<string, PoopRecord[]>();
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  for (const record of sorted) {
    const key = toDateKey(new Date(record.date));
    const group = groups.get(key);
    if (group) group.push(record);
    else groups.set(key, [record]);
  }
  return groups;
}

// '오전 8:30' / '오후 11:05', 시각 없는 기록은 '시각 모름'
export function formatRecordTime(record: PoopRecord): string {
  if (!record.hasTime) return '시각 모름';
  const date = new Date(record.date);
  const hours = date.getHours();
  const period = hours < 12 ? '오전' : '오후';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${displayHour}:${String(date.getMinutes()).padStart(2, '0')}`;
}
