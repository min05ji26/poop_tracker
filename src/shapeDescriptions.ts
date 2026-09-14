import type { PoopShape } from './storage';

/** 모양 칩 아래 붙는 짧은 설명. 상태를 판단하는 말이 아니라 생김새만 묘사해요. */
export const SHAPE_DESCRIPTIONS: Record<PoopShape, string> = {
  토끼똥: '작고 단단한 알갱이',
  방울똥: '뭉친 울퉁불퉁 덩어리',
  바나나똥: '금이 간 길쭉한 모양',
  부들똥: '매끈하고 부드러운 모양',
  몽글똥: '말랑한 덩어리 조각',
  죽똥: '흐트러진 죽 같은 모양',
  물똥: '덩어리 없는 물 같은 모양',
};
