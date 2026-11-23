import type { LabelRatio, ReportInput } from './input';

// ⚠️ 초안. 문구 다듬기·샘플 점검은 노션 5단계 "프롬프트 작성" 태스크에서 한다
// 원칙: 숫자는 앱이 계산해서 표시용 문자열로 넘기고, LLM은 그 숫자를 그대로 옮겨 쓰기만 한다

export const SYSTEM_PROMPT = `너는 배변 기록 앱 "풉트래커"의 귀여운 마스코트야. 20대 사용자에게 한 달 기록을 친구처럼 다정하게 요약해줘.

규칙:
- 반말 말고 "~해요"체로, 3~4문장, 이모지는 1개까지.
- 아래 [통계]에 있는 숫자만 그대로 쓴다. 새로운 숫자를 계산하거나 추정하거나 만들지 않는다.
- 건강 상태를 판단하지 않는다. 진단, 질병·증상 이름, 병원·약·치료 권유, "정상/비정상", "이상해요", "위험해요", "변비", "설사" 같은 표현은 절대 쓰지 않는다.
- 좋다/나쁘다 평가 대신 "이번 달은 이랬어요" 하는 관찰과 가벼운 응원으로 마무리한다.
- 참고·재미용 기록이라는 톤을 지킨다.`;

function round1(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

export function formatHours(hours: number): string {
  return hours < 48 ? `${Math.round(hours)}시간` : `${round1(hours / 24)}일`;
}

function top(items: LabelRatio[], n: number): string {
  const sorted = items.filter((i) => i.count > 0).sort((a, b) => b.count - a.count).slice(0, n);
  return sorted.length === 0 ? '없음' : sorted.map((i) => `${i.label} ${pct(i.ratio)}`).join(', ');
}

// LLM에 넘기는 [통계] 블록. 여기 나온 숫자 문자열만 답에 쓸 수 있다 (safety.ts가 다시 확인)
export function buildStatsLines(input: ReportInput): string[] {
  const lines = [
    `기간: ${input.year}년 ${input.month}월 (${input.coveredDays}일 동안)`,
    `총 기록: ${input.totalCount}회, 기록한 날: ${input.recordDays}일`,
    `주 평균: ${round1(input.weeklyAverage)}회`,
    `평균 간격: ${input.meanIntervalHours === null ? '계산할 수 없음' : formatHours(input.meanIntervalHours)}`,
    `많았던 모양: ${top(input.shapes, 2)}`,
    `많았던 색: ${top(input.colors, 2)}`,
    `자주 기록한 시간대: ${top(input.timeSlots, 1)}`,
  ];

  if (input.durations.some((d) => d.count > 0)) {
    lines.push(`걸린 시간(입력한 기록 ${pct(input.durationInputRate)} 기준): ${top(input.durations, 2)}`);
  }

  if (input.vsLastMonth) {
    const w = Math.round(input.vsLastMonth.weeklyAverageDiff * 10) / 10;
    lines.push(w === 0 ? '지난달 대비 주 평균: 비슷함' : `지난달 대비 주 평균: ${Math.abs(w)}회 ${w > 0 ? '많음' : '적음'}`);
    const h = input.vsLastMonth.meanIntervalHoursDiff;
    if (h !== null) {
      const hr = Math.round(h);
      lines.push(hr === 0 ? '지난달 대비 간격: 비슷함' : `지난달 대비 간격: ${formatHours(Math.abs(hr))} ${hr > 0 ? '길어짐' : '짧아짐'}`);
    }
  } else {
    lines.push('지난달 비교: 지난달 기록 없음');
  }
  return lines;
}

export function buildUserPrompt(input: ReportInput): string {
  return `[통계]\n${buildStatsLines(input).join('\n')}\n\n위 통계로 이번 달 요약을 써줘.`;
}
