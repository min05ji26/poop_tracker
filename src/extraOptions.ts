import type { PoopDuration, PoopSmell } from './storage';

/** 걸린 시간 칩 아래 붙는 대략적인 시간. 재지 않아도 고를 수 있게 범위로만 보여줘요. */
export const DURATION_HINTS: Record<PoopDuration, string> = {
  순삭: '3분 안쪽',
  보통: '3~10분',
  오래: '10~20분',
  사투: '20분 넘게',
};

/** 냄새 칩 이모지. 재미용이라 상태를 판단하는 말은 쓰지 않아요. */
export const SMELL_EMOJIS: Record<PoopSmell, string> = {
  '거의 없음': '🌸',
  무난: '🙂',
  쿰쿰: '😶',
  독함: '😣',
  '생화학 무기': '☣️',
};
