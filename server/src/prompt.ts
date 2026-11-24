import type { LabelRatio, ReportInput } from './input';

// LLM 입력 = 시스템 프롬프트(역할·형식·규칙) + 사용자 프롬프트([통계] 블록)
// LLM은 결과지 맨 위의 "한 줄 평"만 쓴다. 표·달력의 숫자는 전부 앱이 그린다
// 원칙: 숫자는 앱이 계산하고, 여기서 표시용 문자열로 바꿔 넘긴다. LLM은 그 문자열을 옮겨 쓰기만 한다
// 색 분포는 LLM에 넘기지 않는다: 검정·붉은기 같은 색은 건강 해석을 부르기 쉬워서 (통계 화면에만 표시)

export const SYSTEM_PROMPT = `너는 배변 기록 앱 "풉트래커"의 말랑하고 귀여운 똥 마스코트야. 사용자의 지난달 결과지 맨 위에 붙일 "한 줄 평"을 지어줘.

[형식]
- 딱 한 줄, 공백 포함 30자 이내.
- 그 달을 귀엽게 부르는 별명이나 칭찬 한 줄. 예: "OO형 OO 장인", "OO이 빛난 한 달", "OO 수집가" 같은 틀을 참고하되, 매번 [통계]에 맞게 새로 짓는다.
- 위 틀이나 흔한 표현을 그대로 반복하지 말고, 그 달 특징이 드러나게 짓는다.
- 숫자는 쓰지 않는다 (숫자는 결과지 표에 따로 나온다). "열월", "열한 달"처럼 달 이름을 글자로 풀어 쓰지도 말고, 기간은 "한 달"이라고만 한다.
- 따옴표, 설명, 줄바꿈 없이 한 줄 평만 쓴다. 이모지는 맨 끝에 1개.

[고르는 법]
- [통계]에서 눈에 띄는 특징 하나만 골라 담는다: 많았던 모양, 자주 기록한 시간대, 걸린 시간, 지난달보다 늘거나 준 것, 꾸준함.
- 모양 이름(토끼똥, 방울똥, 바나나똥, 부들똥, 몽글똥, 죽똥, 물똥)은 앱의 귀여운 별명이니 그대로 써도 된다.

[하지 않을 것]
- 건강 상태를 판단하는 말: 진단, 질병·증상 이름, 병원·약·치료·검사, "정상/비정상", "건강", "이상", "위험", "변비", "설사", "장 건강".
- 좋다/나쁘다 평가, 걱정시키는 말, 놀리는 말, 생활습관 조언.`;

function round1(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

export function formatHours(hours: number): string {
  return hours < 48 ? `${Math.round(hours)}시간` : `${round1(hours / 24)}일`;
}

function top(items: LabelRatio[], n: number): LabelRatio[] {
  return items.filter((i) => i.count > 0).sort((a, b) => b.count - a.count).slice(0, n);
}

function joinTop(items: LabelRatio[]): string {
  return items.map((i) => `${i.label} ${pct(i.ratio)}`).join(', ');
}

// LLM에 넘기는 [통계] 블록. 여기 나온 숫자만 답에 쓸 수 있다 (safety.ts가 다시 확인)
export function buildStatsLines(input: ReportInput): string[] {
  const daysInMonth = new Date(input.year, input.month, 0).getDate();
  const inProgress = input.coveredDays < daysInMonth;

  const lines = [
    `[기간] ${input.month}월 ${inProgress ? `(${input.coveredDays}일까지, 아직 진행 중인 달)` : '한 달'}`,
    `[기록] 총 ${input.totalCount}회, 기록한 날 ${input.recordDays}일`,
    `[주 평균] ${round1(input.weeklyAverage)}회`,
    `[평균 간격] ${input.meanIntervalHours === null ? '없음' : formatHours(input.meanIntervalHours)}`,
  ];

  const shapes = top(input.shapes, 2);
  if (shapes.length > 0) lines.push(`[많았던 모양] ${joinTop(shapes)} (전체 기록 중 비율)`);

  const slots = top(input.timeSlots, 1);
  if (slots.length > 0) lines.push(`[자주 기록한 시간대] ${slots[0].label} (전체 기록 중 ${pct(slots[0].ratio)})`);

  const durations = top(input.durations, 2);
  if (durations.length > 0) {
    lines.push(`[걸린 시간] ${joinTop(durations)} (걸린 시간을 남긴 기록 중 비율, 전체의 ${pct(input.durationInputRate)}가 남김)`);
  }

  if (input.vsLastMonth) {
    const parts: string[] = [];
    const w = Math.round(input.vsLastMonth.weeklyAverageDiff * 10) / 10;
    parts.push(w === 0 ? '주 평균은 지난달과 비슷해요' : `주 평균이 지난달보다 ${Math.abs(w)}회 ${w > 0 ? '많아졌어요' : '적어졌어요'}`);
    const h = input.vsLastMonth.meanIntervalHoursDiff;
    if (h !== null) {
      const hr = Math.round(h);
      parts.push(hr === 0 ? '간격은 비슷해요' : `간격은 ${formatHours(Math.abs(hr))} ${hr > 0 ? '길어졌어요' : '짧아졌어요'}`);
    }
    lines.push(`[지난달 비교] ${parts.join(', ')}`);
  } else {
    lines.push('[지난달 비교] 없음');
  }
  return lines;
}

export function buildUserPrompt(input: ReportInput): string {
  return `[통계]\n${buildStatsLines(input).join('\n')}\n\n위 통계로 한 줄 평을 써줘.`;
}
