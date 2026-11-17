import type { CharacterMood } from './character';

// 마스코트 모양·색. 홈 캐릭터(SVG)와 요약 이미지(Canvas)가 같이 쓴다

export const FACE_STYLE: Record<CharacterMood, { bodyColor: string; highlightColor: string; blushOpacity: number }> = {
  happy: { bodyColor: '#8B5E3C', highlightColor: '#AA7D58', blushOpacity: 0.85 },
  neutral: { bodyColor: '#8B5E3C', highlightColor: '#AA7D58', blushOpacity: 0.6 },
  sad: { bodyColor: '#A08674', highlightColor: '#B9A393', blushOpacity: 0.3 },
};

/* Stitch 마스코트: 끝이 살짝 말린 말랑한 몸통 */
export const BODY_PATH =
  'M 52 160 C 32 158 34 132 50 122 C 44 110 52 90 70 82 C 66 68 80 50 98 36 C 102 33 105 35 103 42 ' +
  'C 100 52 112 58 120 66 C 134 77 148 90 144 106 C 158 114 166 134 158 148 C 152 162 134 166 100 166 ' +
  'C 66 166 58 162 52 160 Z';
export const HIGHLIGHT_PATH = 'M 72 70 C 76 58 88 48 98 42 C 96 48 90 56 84 66 C 80 72 75 72 72 70 Z';
