import type { LabelCount, MonthlyComparison, MonthlyStats } from './stats';

// 통계 숫자를 화면·이미지에 보여줄 문구로 바꾼다. 계산은 stats.ts, 여기는 반올림·문장만

export function formatInterval(hours: number): string {
  if (hours < 48) return `${Math.round(hours)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

// 이번 달이 다 안 지났을 수 있어서 총 횟수 대신 주 평균·평균 간격으로 비교해요
export function comparisonLines(prev: MonthlyStats, diff: MonthlyComparison): string[] {
  if (prev.totalCount === 0) return ['지난달 기록이 없어서 비교할 수 없어요'];

  const lines: string[] = [];
  const weekly = Math.round(diff.weeklyAverageDiff * 10) / 10;
  if (weekly === 0) lines.push('주 평균 횟수는 지난달과 비슷해요');
  else lines.push(`주 평균 ${Math.abs(weekly)}회 ${weekly > 0 ? '더 많아요' : '더 적어요'}`);

  if (diff.meanIntervalHoursDiff !== null) {
    const hours = Math.round(diff.meanIntervalHoursDiff);
    if (hours === 0) lines.push('기록 간격은 지난달과 비슷해요');
    else lines.push(`기록 간격이 ${formatInterval(Math.abs(hours))} ${hours > 0 ? '길어졌어요' : '짧아졌어요'}`);
  }
  return lines;
}

// 가장 많은 항목. 횟수가 같으면 라벨 순서상 앞의 것, 전부 0이면 null
export function topLabel<T extends string>(items: LabelCount<T>[]): LabelCount<T> | null {
  return items.reduce<LabelCount<T> | null>((best, item) => {
    if (item.count === 0) return best;
    return best === null || item.count > best.count ? item : best;
  }, null);
}
