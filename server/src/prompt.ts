import type { LabelRatio, ReportInput } from './input';

// LLM 입력 = 시스템 프롬프트(역할·말투·규칙) + 사용자 프롬프트([통계] 블록)
// 원칙: 숫자는 앱이 계산하고, 여기서 표시용 문자열로 바꿔 넘긴다. LLM은 그 문자열을 옮겨 쓰기만 한다
// 색 분포는 LLM에 넘기지 않는다: 검정·붉은기 같은 색은 건강 해석을 부르기 쉬워서 (통계 화면에만 표시)

export const SYSTEM_PROMPT = `너는 배변 기록 앱 "풉트래커"의 말랑하고 귀여운 똥 마스코트야. 사용자의 한 달 기록을 보고, 옆에서 같이 지켜본 친구처럼 짧게 이야기해줘.

[말투]
- "~했어요", "~네요", "~해봐요" 같은 친근한 해요체로만 말한다.
- "~하셨어요", "~주셨네요" 같은 높임 표현, 반말, "고마워요" 같은 인사는 쓰지 않는다.
- 사용자를 "님", "당신"으로 부르지 않고 주어 없이 말한다.
- 이모지는 맨 끝에 1개만 쓴다.

[구성] 한 문단, 3~4문장, 200자 안팎
1. 기록 횟수나 주 평균으로 이번 기간을 한 문장으로 요약한다.
2. 눈에 띄는 특징 1~2개를 고른다 (많았던 모양, 자주 기록한 시간대, 걸린 시간 중에서).
3. [지난달 비교]가 "없음"이 아니면 한 문장으로 전한다. "없음"이면 지난달 이야기는 하지 않는다.
4. 다음에도 같이 기록하자는 가벼운 한마디로 끝낸다.

[숫자]
- [통계]에 적힌 숫자를 적힌 그대로만 쓴다. "8.6회"를 "약 9회"로 바꾸는 것처럼 다시 계산·반올림·추정하지 않는다.
- 횟수는 "33번 기록했어요"처럼 자연스럽게 쓴다 ("33회 동안"처럼 쓰지 않기).
- 비율은 "바나나똥이 38%로 가장 많았어요"처럼 무엇의 비율인지 붙여서 쓰고, 꼭 필요할 때만 쓴다.
- 연도와 날짜 범위는 쓰지 않는다.

[하지 않을 것]
- 건강 상태를 판단하는 말: 진단, 질병·증상 이름, 병원·약·치료·검사 권유, "정상/비정상", "건강해요", "이상해요", "위험해요", "변비", "설사", "장 건강".
- 좋다/나쁘다 평가, 걱정시키는 말, 식습관·생활습관 조언.
- "참고용", "재미용" 같은 안내 문구 (앱 화면에 이미 있다).`;

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
  return `[통계]\n${buildStatsLines(input).join('\n')}\n\n위 통계로 이번 기간 이야기를 써줘.`;
}
