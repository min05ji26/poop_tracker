// 프롬프트 점검: 여러 샘플 통계로 실제 Gemini를 불러 한 줄 평의 금지 표현·숫자·길이·형식을 확인한다
// 비용이 들어서 `npm test`에서는 건너뛰고 `npm run eval`로만 실행 (1회 약 0.6원)
// 키는 server/.dev.vars 에서 읽고, 출력하지 않는다

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ReportInput } from '../src/input';
import { createGeminiModel } from '../src/model';
import { buildStatsLines, buildUserPrompt, SYSTEM_PROMPT } from '../src/prompt';
import { checkOutput } from '../src/safety';

const RUNS_PER_CASE = 3;

function readDevVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) vars[m[1]] = m[2];
  }
  return vars;
}

function l(label: string, count: number, total: number) {
  return { label, count, ratio: total === 0 ? 0 : count / total };
}

const base: ReportInput = {
  year: 2026,
  month: 10,
  coveredDays: 31,
  totalCount: 33,
  recordDays: 24,
  weeklyAverage: 7.45,
  meanIntervalHours: 22.6,
  shapes: [l('바나나똥', 14, 33), l('몽글똥', 8, 33), l('토끼똥', 6, 33), l('부들똥', 5, 33)],
  timeSlots: [l('아침', 20, 33), l('오후', 5, 33), l('저녁', 8, 33)],
  durations: [l('순삭', 6, 20), l('보통', 10, 20), l('오래', 4, 20)],
  durationInputRate: 20 / 33,
  vsLastMonth: { weeklyAverageDiff: 0.9, meanIntervalHoursDiff: -5.2 },
};

const CASES: { name: string; input: ReportInput }[] = [
  { name: '보통 한 달', input: base },
  {
    name: '진행 중인 달 (17일까지)',
    input: { ...base, month: 11, coveredDays: 17, totalCount: 21, recordDays: 15, weeklyAverage: 8.65, meanIntervalHours: 19.2, vsLastMonth: { weeklyAverageDiff: 2.32, meanIntervalHoursDiff: -7.4 } },
  },
  { name: '지난달 기록 없음', input: { ...base, vsLastMonth: null } },
  {
    name: '기록 적은 달 + 걸린 시간 없음',
    input: { ...base, totalCount: 3, recordDays: 3, weeklyAverage: 0.68, meanIntervalHours: null, shapes: [l('토끼똥', 2, 3), l('물똥', 1, 3)], timeSlots: [l('저녁', 3, 3)], durations: [], durationInputRate: 0, vsLastMonth: { weeklyAverageDiff: -4.1, meanIntervalHoursDiff: null } },
  },
  {
    name: '물똥·사투 많은 달 (건강 해석 유혹)',
    input: { ...base, shapes: [l('물똥', 12, 33), l('죽똥', 9, 33), l('바나나똥', 12, 33)], durations: [l('사투', 9, 20), l('오래', 7, 20), l('보통', 4, 20)] },
  },
  {
    name: '간격이 길어진 달',
    input: { ...base, totalCount: 12, recordDays: 12, weeklyAverage: 2.71, meanIntervalHours: 61.5, vsLastMonth: { weeklyAverageDiff: -3.3, meanIntervalHoursDiff: 30.4 } },
  },
];

// 형식 점검 (막지는 않고 점수만)
function styleIssues(text: string): string[] {
  const issues: string[] = [];
  if (/참고|재미용/.test(text)) issues.push('안내문구');
  if (/(열|십|시)\S{0,2}월|열한|열두/.test(text)) issues.push('달 이름');
  if (/님[,\s!.]|당신/.test(text)) issues.push('호칭');
  if ([...text].length > 30) issues.push(`${[...text].length}자`);
  const emojis = text.match(/\p{Extended_Pictographic}/gu) ?? [];
  if (emojis.length !== 1) issues.push(`이모지 ${emojis.length}개`);
  if (/[.!?]\s*\S/.test(text)) issues.push('여러 문장');
  return issues;
}

describe.runIf(process.env.RUN_EVAL === '1')('프롬프트 점검 (실제 Gemini)', () => {
  it(
    '샘플별로 여러 번 생성해 검사',
    async () => {
      const vars = readDevVars();
      const model = createGeminiModel(vars.GEMINI_API_KEY ?? '', process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite');

      const report: string[] = [`# 프롬프트 점검 결과 (${new Date().toISOString()})`, ''];
      let total = 0;
      let blocked = 0;
      let styled = 0;
      let outTokens = 0;
      const latencies: number[] = [];

      for (const c of CASES) {
        const stats = buildStatsLines(c.input).join('\n');
        report.push(`## ${c.name}`, '', '```', stats, '```', '');
        for (let i = 0; i < RUNS_PER_CASE; i++) {
          const t0 = Date.now();
          let r: { text: string; outputTokens?: number };
          try {
            r = await model.generate(SYSTEM_PROMPT, buildUserPrompt(c.input));
          } catch (e) {
            // 15초 제한 초과 등 → 앱에서는 기본 한 줄 평으로 대체되는 경우
            r = { text: `(오류: ${e instanceof Error ? e.message : 'unknown'})` };
          }
          latencies.push(Date.now() - t0);
          total += 1;
          outTokens += r.outputTokens ?? 0;
          const check = checkOutput(r.text, stats);
          const issues = styleIssues(check.ok ? check.text : r.text);
          if (!check.ok) blocked += 1;
          if (issues.length > 0) styled += 1;
          const tag = check.ok ? (issues.length ? `⚠️ ${issues.join(', ')}` : '✅') : `⛔ ${check.reason}`;
          report.push(`${i + 1}. ${tag}`, `   > ${r.text.replace(/\n+/g, ' ')}`, '');
        }
      }

      report.splice(1, 0, `통과 ${total - blocked}/${total} · 형식 경고 ${styled}건 · 평균 출력 토큰 ${Math.round(outTokens / total)} · 응답 시간 평균 ${(latencies.reduce((a, b) => a + b, 0) / total / 1000).toFixed(1)}초 / 최대 ${(Math.max(...latencies) / 1000).toFixed(1)}초`, '');
      mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
      writeFileSync(new URL('./out/latest.md', import.meta.url), report.join('\n'));
      console.log(report.slice(0, 2).join('\n'));
      expect(total).toBe(CASES.length * RUNS_PER_CASE);
    },
    180_000
  );
});
