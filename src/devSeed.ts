import { Storage } from '@apps-in-toss/web-framework';
import { COLOR_LABELS, SHAPE_LABELS, type PoopRecord } from './storage';

// 개발 모드 전용: 달력·통계 화면 확인용 샘플 기록 생성 (main.tsx에서 DEV일 때만 연결)

const RECORDS_KEY = 'poop_records';

// 같은 seed면 항상 같은 기록이 나오도록 하는 간단한 난수 생성기 (mulberry32)
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(items: readonly T[], weights: readonly number[], random: () => number): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll < 0) return items[i];
  }
  return items[items.length - 1];
}

// 토끼똥~물똥 순서. 바나나똥·부들똥이 가장 흔하도록
const SHAPE_WEIGHTS = [1, 2, 6, 5, 2, 1, 0.5];
// 갈색~기타 순서
const COLOR_WEIGHTS = [8, 3, 0.5, 0.3, 0.5, 0.3];
// 하루 기록 횟수 0~3회 비율
const DAILY_COUNT_WEIGHTS = [3, 6, 2, 0.5];
const SAMPLE_MEMOS = ['물 많이 마심', '야식 먹음', '배가 살짝 아팠음', '커피 두 잔'];

export interface SampleOptions {
  days?: number; // 오늘 포함 며칠 전까지 만들지
  seed?: number;
  now?: Date;
}

export function generateSampleRecords({ days = 90, seed = 1, now = new Date() }: SampleOptions = {}): PoopRecord[] {
  const random = createRandom(seed);
  const records: PoopRecord[] = [];

  for (let offset = days - 1; offset >= 0; offset--) {
    const count = pickWeighted([0, 1, 2, 3], DAILY_COUNT_WEIGHTS, random);
    for (let i = 0; i < count; i++) {
      // 아침(7~10시)에 몰리고 나머지는 낮·저녁에 흩어지도록
      const hour = random() < 0.6 ? 7 + Math.floor(random() * 4) : 11 + Math.floor(random() * 12);
      const minute = Math.floor(random() * 60);
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, hour, minute);
      if (date.getTime() > now.getTime()) continue;

      records.push({
        id: `sample-${offset}-${i}`,
        date: date.toISOString(),
        shape: pickWeighted(SHAPE_LABELS, SHAPE_WEIGHTS, random),
        color: pickWeighted(COLOR_LABELS, COLOR_WEIGHTS, random),
        memo: random() < 0.15 ? SAMPLE_MEMOS[Math.floor(random() * SAMPLE_MEMOS.length)] : undefined,
      });
    }
  }

  return records.sort((a, b) => a.date.localeCompare(b.date));
}

// 기존 기록을 모두 지우고 샘플 기록으로 덮어쓴다
export async function seedSampleRecords(options?: SampleOptions): Promise<number> {
  const records = generateSampleRecords(options);
  await Storage.setItem(RECORDS_KEY, JSON.stringify(records));
  return records.length;
}

export async function clearRecords(): Promise<void> {
  await Storage.setItem(RECORDS_KEY, JSON.stringify([]));
}
