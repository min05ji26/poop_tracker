export type CharacterMood = 'happy' | 'neutral' | 'sad';

export interface CharacterStatus {
  mood: CharacterMood;
  headline: string;
  subtext: string;
}

export function getCharacterStatus(lastRecordDate: Date | null): CharacterStatus {
  if (!lastRecordDate) {
    return {
      mood: 'neutral',
      headline: '아직 기록이 없어요',
      subtext: '오늘 첫 기록을 남겨볼까요?',
    };
  }

  const daysSince = Math.floor(
    (Date.now() - lastRecordDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 1) {
    return {
      mood: 'happy',
      headline: '오늘도 활기차네요!',
      subtext: '이 기분 그대로 내일도 기록해봐요',
    };
  }

  if (daysSince <= 3) {
    return {
      mood: 'neutral',
      headline: `${daysSince}일째 소식이 없어요...`,
      subtext: '오늘은 기록을 남기고 가는 건 어때요?',
    };
  }

  return {
    mood: 'sad',
    headline: `${daysSince}일째 소식이 없어요...`,
    subtext: '끄응.. 속이 더부룩해요',
  };
}
