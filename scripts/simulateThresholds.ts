// 임계값(배수) 시뮬레이션: 가상 사용자 기록에 판정 기준을 적용해
// 평범한 사용자에게 😐(늦음)·😢(한참) 반응이 한 달에 몇 번 뜨는지 센다
// 실행: node scripts/simulateThresholds.ts (Node 22.18+ 필요, TS를 그대로 실행)

import type { PoopRecord } from '../src/storage.ts';
import { getGapStatus, type GapMultipliers } from '../src/stats.ts';

// ── 가정 (공개 통계 기반) ───────────────────────────────────
// - 주 평균 횟수: UK Biobank 평균 주 6.1회 → 사용자별 주 횟수를 로그정규분포로 뽑고
//   흔히 쓰는 정상 범위(주 3회 ~ 하루 3회)로 자른다
// - 간격의 들쭉날쭉함(변동계수 CV = 표준편차/평균): 사용자마다 0.3(규칙적) ~ 1.0(불규칙)
// - 기록 누락: 실제로 간 것 중 일부는 기록을 잊는다 (기본 10%)
const USERS = 2000;
const MEAN_PER_WEEK = 6.1;
const PER_WEEK_SIGMA = 0.45;
const MIN_PER_WEEK = 3;
const MAX_PER_WEEK = 21;
const CV_RANGE: [number, number] = [0.3, 1.0];
const HISTORY_DAYS = 60; // 기준 계산용 과거 기록
const EVAL_DAYS = 30; // 반응 횟수를 세는 한 달

const HOUR = 60 * 60 * 1000;
const START = new Date(2026, 0, 1).getTime();

// 같은 결과가 나오도록 시드 고정 난수
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 감마분포 (Marsaglia-Tsang). 간격은 항상 양수이고 CV를 자유롭게 정할 수 있어 사용
function gamma(rand: () => number, shape: number, scale: number): number {
  if (shape < 1) return gamma(rand, shape + 1, scale) * Math.pow(rand(), 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
}

interface VirtualUser {
  perWeek: number;
  cv: number;
  records: PoopRecord[];
}

function makeUser(rand: () => number, logRate: number): VirtualUser {
  const mu = Math.log(MEAN_PER_WEEK) - PER_WEEK_SIGMA ** 2 / 2; // 평균이 6.1이 되도록
  const perWeek = Math.min(MAX_PER_WEEK, Math.max(MIN_PER_WEEK, Math.exp(mu + PER_WEEK_SIGMA * normal(rand))));
  const cv = CV_RANGE[0] + (CV_RANGE[1] - CV_RANGE[0]) * rand();
  const meanHours = (7 * 24) / perWeek;
  const shape = 1 / (cv * cv);

  const records: PoopRecord[] = [];
  const end = START + (HISTORY_DAYS + EVAL_DAYS) * 24 * HOUR;
  let t = START + rand() * meanHours * HOUR;
  while (t < end) {
    if (rand() < logRate) {
      const date = new Date(t).toISOString();
      records.push({ id: date, date, hasTime: true, shape: '바나나똥', color: '갈색' });
    }
    t += gamma(rand, shape, meanHours / shape) * HOUR;
  }
  return { perWeek, cv, records };
}

interface UserResult {
  cv: number;
  late: number; // 한 달 동안 😐 이상이 뜬 공백 수 (😢 포함)
  wayLate: number; // 😢까지 간 공백 수
  insufficient: boolean;
}

// 평가 기간 안의 각 공백마다: 공백이 시작될 때의 기준으로, 다음 기록 전까지 기준을 넘었는지 본다
function evaluate(user: VirtualUser, multipliers: GapMultipliers): UserResult {
  const evalStart = START + HISTORY_DAYS * 24 * HOUR;
  const times = user.records.map((r) => new Date(r.date).getTime());
  let late = 0;
  let wayLate = 0;
  let insufficient = false;

  for (let i = 0; i < times.length - 1; i++) {
    if (times[i] < evalStart) continue;
    const status = getGapStatus(user.records.slice(0, i + 1), new Date(times[i]), multipliers);
    if (status.level === 'insufficient') {
      insufficient = true;
      continue;
    }
    const gapHours = (times[i + 1] - times[i]) / HOUR;
    if (gapHours > status.lateThresholdHours!) late++;
    if (gapHours > status.wayLateThresholdHours!) wayLate++;
  }
  return { cv: user.cv, late, wayLate, insufficient };
}

function summarize(results: UserResult[]) {
  const n = results.length;
  const avg = (f: (r: UserResult) => number) => results.reduce((s, r) => s + f(r), 0) / n;
  const pct = (f: (r: UserResult) => boolean) => (results.filter(f).length / n) * 100;
  return {
    late: avg((r) => r.late).toFixed(2),
    wayLate: avg((r) => r.wayLate).toFixed(2),
    late3plus: pct((r) => r.late >= 3).toFixed(1) + '%',
    lateZero: pct((r) => r.late === 0).toFixed(1) + '%',
  };
}

const CANDIDATES: GapMultipliers[] = [
  { late: 1.0, wayLate: 2.0 },
  { late: 1.5, wayLate: 2.5 },
  { late: 2.0, wayLate: 3.0 },
  { late: 1.5, wayLate: 3.0 },
  { late: 2.0, wayLate: 3.5 },
];

for (const logRate of [0.9, 1.0]) {
  const rand = mulberry32(20261011);
  const users = Array.from({ length: USERS }, () => makeUser(rand, logRate));

  console.log(`\n=== 기록률 ${logRate * 100}% (가상 사용자 ${USERS}명, 한 달 기준) ===`);
  const table: Record<string, Record<string, string>> = {};
  for (const m of CANDIDATES) {
    const results = users.map((u) => evaluate(u, m));
    const regular = results.filter((r) => r.cv < 0.55);
    const irregular = results.filter((r) => r.cv >= 0.75);
    const all = summarize(results);
    table[`${m.late} / ${m.wayLate}`] = {
      '😐 이상(회/월)': all.late,
      '😢(회/월)': all.wayLate,
      '😐 0회 사용자': all.lateZero,
      '😐 3회+ 사용자': all.late3plus,
      '규칙적 😐': summarize(regular).late,
      '불규칙 😐': summarize(irregular).late,
    };
  }
  console.table(table);
}
