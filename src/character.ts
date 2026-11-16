import { getGapStatus } from './stats';
import type { PoopRecord } from './storage';

export type CharacterMood = 'happy' | 'neutral' | 'sad';

export interface CharacterStatus {
  mood: CharacterMood;
  headline: string;
  subtext: string;
  hint?: string; // 개인 기준이 아직 없을 때 안내
}

const HAPPY: CharacterStatus = {
  mood: 'happy',
  headline: '오늘도 활기차네요!',
  subtext: '이 기분 그대로 내일도 기록해봐요',
};

// 기록이 쌓이면 "평소의 나"와 비교하고, 아직 모자라면 고정 기준(1일/3일)을 쓴다
export function getCharacterStatus(records: PoopRecord[], now: Date = new Date()): CharacterStatus {
  const gap = getGapStatus(records, now);

  if (gap.hoursSinceLast === null) {
    return {
      mood: 'neutral',
      headline: '아직 기록이 없어요',
      subtext: '오늘 첫 기록을 남겨볼까요?',
    };
  }

  if (gap.level === 'usual') return HAPPY;
  if (gap.level === 'late') {
    return {
      mood: 'neutral',
      headline: '평소보다 소식이 늦네요',
      subtext: '생각나면 살짝 기록해줘요',
    };
  }
  if (gap.level === 'wayLate') {
    return {
      mood: 'sad',
      headline: '요즘 평소보다 한참 조용해요',
      subtext: '여기서 기다리고 있을게요...',
    };
  }

  // 데이터 부족: 기존 고정 기준
  const hint = '기록이 더 쌓이면 나만의 기준이 생겨요';
  const daysSince = Math.floor(gap.hoursSinceLast / 24);

  if (daysSince <= 1) return { ...HAPPY, hint };

  if (daysSince <= 3) {
    return {
      mood: 'neutral',
      headline: `${daysSince}일째 소식이 없어요...`,
      subtext: '오늘은 기록을 남기고 가는 건 어때요?',
      hint,
    };
  }

  return {
    mood: 'sad',
    headline: `${daysSince}일째 소식이 없어요...`,
    subtext: '여기서 기다리고 있을게요...',
    hint,
  };
}
