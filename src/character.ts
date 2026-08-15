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
      subtext: '오늘 기록하면 다시 활기 찾을지도?',
    };
  }

  return {
    mood: 'sad',
    headline: `${daysSince}일째 소식이 없어요...`,
    subtext: '많이 기다렸어요, 오늘 기록해줄래요?',
  };
}
