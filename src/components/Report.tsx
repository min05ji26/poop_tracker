import { useEffect, useRef, useState } from 'react';
import type { PoopRecord } from '../storage';
import type { MonthlyReport } from '../stats';
import { formatInterval, formatPercent, topLabel } from '../statsFormat';
import {
  getClientId,
  getDayCounts,
  getFallbackLine,
  loadCachedLine,
  markReportSeen,
  reportKey,
  saveCachedLine,
  toRelayInput,
} from '../report';
import { requestAiLine } from '../aiReport';
import { getSummaryImageContent, saveSummaryImage, type SaveResult } from '../summaryImage';
import { AppDialog } from './AppDialog';
import './Report.css';

interface ReportProps {
  report: MonthlyReport;
  records: PoopRecord[];
  aiEnabled: boolean; // AI 한 줄 평 동의가 켜져 있을 때만 서버를 부른다
}

// 8초 카운트다운: 평균 응답(약 6초)보다 조금 길게. 0이 돼도 안 오면 "거의 다 됐어요", 15초면 기본 한 줄 평
const COUNTDOWN_FROM = 8;
const STEP_MESSAGES = [
  '한 달 기록 모으는 중...',
  '모양 세는 중...',
  '시간대 살펴보는 중...',
  '지난달이랑 비교하는 중...',
  '한 줄 평 고민하는 중...',
  '한 줄 평 다듬는 중...',
  '도장 찍는 중...',
  '거의 다 됐어요!',
];
const RING_LENGTH = 2 * Math.PI * 66;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const SAVE_MESSAGES: Record<SaveResult, string> = {
  saved: '사진첩에 저장했어요.',
  unsupported: '지금 토스 앱 버전에서는 이미지 저장을 지원하지 않아요. 토스 앱을 최신 버전으로 업데이트해 주세요.',
  failed: '이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

type LineState = { status: 'loading' } | { status: 'done'; line: string; byAi: boolean };

function diffCell(diff: number | null, unit: string, digits = 0) {
  if (diff === null) return <span className="report-diff">—</span>;
  const rounded = Number(diff.toFixed(digits));
  if (rounded === 0) return <span className="report-diff">비슷</span>;
  return (
    <span className={`report-diff ${rounded > 0 ? 'report-diff-up' : 'report-diff-down'}`}>
      {rounded > 0 ? '▲' : '▼'} {Math.abs(rounded)}
      {unit}
    </span>
  );
}

function Countdown() {
  const [left, setLeft] = useState(COUNTDOWN_FROM);
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const progress = (COUNTDOWN_FROM - left) / COUNTDOWN_FROM;
  return (
    <div className="report-loading" role="status" aria-live="polite">
      <p className="report-loading-title">결과지 만드는 중</p>
      <div className="report-ring">
        <svg viewBox="0 0 150 150" aria-hidden="true">
          <circle className="report-ring-track" cx="75" cy="75" r="66" />
          <circle
            className="report-ring-bar"
            cx="75"
            cy="75"
            r="66"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
          />
        </svg>
        <span className="report-ring-num">{left}</span>
      </div>
      <p className="report-loading-step">{STEP_MESSAGES[COUNTDOWN_FROM - left] ?? STEP_MESSAGES[STEP_MESSAGES.length - 1]}</p>
    </div>
  );
}

export function Report({ report, records, aiEnabled }: ReportProps) {
  const { current, previous, vsLastMonth } = report;
  const month = { year: current.year, month: current.month };
  const key = reportKey(month);
  const [lineState, setLineState] = useState<LineState>({ status: 'loading' });
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    markReportSeen(key);

    (async () => {
      const cached = await loadCachedLine(key);
      if (cached) return setLineState({ status: 'done', line: cached, byAi: true });
      if (!aiEnabled) return setLineState({ status: 'done', line: getFallbackLine(report), byAi: false });

      const line = await requestAiLine(toRelayInput(report), await getClientId());
      if (line) {
        await saveCachedLine(key, line);
        setLineState({ status: 'done', line, byAi: true });
      } else {
        setLineState({ status: 'done', line: getFallbackLine(report), byAi: false });
      }
    })();
  }, [key, aiEnabled, report]);

  if (lineState.status === 'loading') return <Countdown />;

  const lastDay = new Date(current.year, current.month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dayCounts = getDayCounts(records, month);
  const firstWeekday = new Date(current.year, current.month, 1).getDay();
  const hasPrev = previous.totalCount > 0;
  const shapes = current.shapes.filter((s) => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  const slot = topLabel(current.timeSlots);
  const duration = topLabel(current.durations);

  return (
    <div className="report-screen">
      <div className="report-head">
        <div>
          <p className="report-title">{current.month + 1}월 풉 결과지</p>
          <p className="report-period">
            {current.year}.{pad(current.month + 1)}.01 – {pad(current.month + 1)}.{pad(lastDay)}
          </p>
        </div>
        <span className="report-stamp">발급 완료</span>
      </div>

      <p className="disclaimer-pill">💡 진단이 아닌 참고·재미용 결과지예요</p>

      <section className="card report-line">
        <span className="report-line-badge">{lineState.byAi ? 'AI가 만든 한 줄 평' : '풉트래커 한 줄 평'}</span>
        <p className="report-line-text">{lineState.line}</p>
      </section>

      <section className="card report-section">
        <table className="report-table">
          <thead>
            <tr>
              <th>항목</th>
              <th className="num">{current.month + 1}월</th>
              <th className="num">지난달 대비</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>총 횟수</td>
              <td className="num strong">{current.totalCount}회</td>
              <td className="num">{diffCell(hasPrev ? current.totalCount - previous.totalCount : null, '회')}</td>
            </tr>
            <tr>
              <td>주 평균</td>
              <td className="num strong">{current.weeklyAverage.toFixed(1)}회</td>
              <td className="num">{diffCell(hasPrev ? vsLastMonth.weeklyAverageDiff : null, '회', 1)}</td>
            </tr>
            <tr>
              <td>평균 간격</td>
              <td className="num strong">{current.meanIntervalHours === null ? '-' : formatInterval(current.meanIntervalHours)}</td>
              <td className="num">{diffCell(hasPrev ? vsLastMonth.meanIntervalHoursDiff : null, '시간')}</td>
            </tr>
            <tr>
              <td>기록한 날</td>
              <td className="num strong">
                {current.recordDays} / {lastDay}일
              </td>
              <td className="num">{diffCell(hasPrev ? current.recordDays - previous.recordDays : null, '일')}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card report-section">
        <h2 className="report-section-title">기록 달력</h2>
        <div className="report-cal" role="img" aria-label={`${current.month + 1}월 날짜별 기록 횟수`}>
          {WEEKDAYS.map((d) => (
            <span key={d} className="report-cal-weekday">
              {d}
            </span>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {dayCounts.map((count, i) => (
            <span key={i} className={`report-cal-day level-${Math.min(count, 3)}`}>
              {i + 1}
            </span>
          ))}
        </div>
        <p className="report-cal-legend">
          <span className="level-0" /> 0 <span className="level-1" /> 1 <span className="level-2" /> 2 <span className="level-3" /> 3회+
        </p>
      </section>

      <section className="card report-section">
        <h2 className="report-section-title">많았던 모양</h2>
        <ul className="report-bars">
          {shapes.map((s) => (
            <li key={s.label} className="report-bar-row">
              <span>{s.label}</span>
              <span className="report-bar-track" aria-hidden="true">
                <span className="report-bar-fill" style={{ width: formatPercent(s.ratio) }} />
              </span>
              <span className="num">{formatPercent(s.ratio)}</span>
            </li>
          ))}
        </ul>
        <table className="report-table report-table-compact">
          <tbody>
            <tr>
              <td>자주 기록한 시간대</td>
              <td className="num strong">{slot ? `${slot.label} ${formatPercent(slot.ratio)}` : '-'}</td>
            </tr>
            <tr>
              <td>걸린 시간</td>
              <td className="num strong">{duration ? `${duration.label} ${formatPercent(duration.ratio)}` : '기록 없음'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <button
        type="button"
        className="btn-primary"
        onClick={async () => setSaveResult(await saveSummaryImage(getSummaryImageContent(report)))}
      >
        이미지로 저장하기
      </button>

      <AppDialog open={saveResult !== null} message={SAVE_MESSAGES[saveResult ?? 'saved']} onConfirm={() => setSaveResult(null)} />
    </div>
  );
}
