import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import { getMonthlyReport, type LabelCount } from '../stats';
import { comparisonLines, formatInterval, formatPercent } from '../statsFormat';
import { getSummaryImageContent, saveSummaryImage, type SaveResult } from '../summaryImage';
import { AppDialog } from './AppDialog';
import { getColorHex } from '../colorSwatches';
import './Stats.css';

// 숫자는 전부 stats.ts가 계산하고, 이 화면은 statsFormat.ts로 문구만 만들어요

const SAVE_MESSAGES: Record<SaveResult, string> = {
  saved: '사진첩에 저장했어요. 친구에게 자랑해 보세요!',
  unsupported: '지금 토스 앱 버전에서는 이미지 저장을 지원하지 않아요. 토스 앱을 최신 버전으로 업데이트해 주세요.',
  failed: '이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

interface BarListProps<T extends string> {
  title: string;
  items: LabelCount<T>[];
  note?: string;
  swatch?: (label: T) => string;
}

function BarList<T extends string>({ title, items, note, swatch }: BarListProps<T>) {
  return (
    <section className="card stats-section">
      <h2 className="stats-section-title">{title}</h2>
      <ul className="stats-bars">
        {items.map((item) => (
          <li key={item.label} className="stats-bar-row">
            <span className="stats-bar-label">
              {swatch && <span className="stats-swatch" style={{ background: swatch(item.label) }} aria-hidden="true" />}
              {item.label}
            </span>
            <span className="stats-bar-track" aria-hidden="true">
              <span className="stats-bar-fill" style={{ width: formatPercent(item.ratio) }} />
            </span>
            <span className="stats-bar-value">
              {item.count}회<span className="stats-bar-percent">{formatPercent(item.ratio)}</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="stats-note">{note}</p>}
    </section>
  );
}

export function Stats() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [records, setRecords] = useState<PoopRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const { current, previous, vsLastMonth } = getMonthlyReport(records, year, month, today);

  async function handleSaveImage() {
    setSaving(true);
    setSaveResult(await saveSummaryImage(getSummaryImageContent({ current, previous, vsLastMonth }, today)));
    setSaving(false);
  }

  function moveMonth(delta: number) {
    const target = new Date(year, month + delta, 1);
    setYear(target.getFullYear());
    setMonth(target.getMonth());
  }

  return (
    <div className="stats-screen">
      <div className="stats-month-nav">
        <button type="button" className="stats-month-arrow" onClick={() => moveMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <p className="stats-month-label">
          {year}년 {month + 1}월
        </p>
        <button
          type="button"
          className="stats-month-arrow"
          onClick={() => moveMonth(1)}
          disabled={isCurrentMonth}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <p className="disclaimer-pill">💡 진단이 아닌 참고·재미용 통계예요</p>

      {current.totalCount === 0 ? (
        <div className="card stats-empty">
          <p className="stats-empty-title">이 달은 기록이 없어요</p>
          <p className="stats-empty-sub">기록이 쌓이면 여기에서 한 달을 한눈에 볼 수 있어요</p>
        </div>
      ) : (
        <>
          <div className="stats-summary">
            <div className="stats-summary-item">
              <span className="stats-summary-label">총 횟수</span>
              <span className="stats-summary-value">{current.totalCount}회</span>
            </div>
            <div className="stats-summary-item">
              <span className="stats-summary-label">주 평균</span>
              <span className="stats-summary-value">{current.weeklyAverage.toFixed(1)}회</span>
            </div>
            <div className="stats-summary-item">
              <span className="stats-summary-label">평균 간격</span>
              <span className="stats-summary-value">
                {current.meanIntervalHours === null ? '-' : formatInterval(current.meanIntervalHours)}
              </span>
            </div>
            <div className="stats-summary-item">
              <span className="stats-summary-label">기록한 날</span>
              <span className="stats-summary-value">
                {current.recordDays}일<span className="stats-summary-unit">/ {current.coveredDays}일</span>
              </span>
            </div>
          </div>

          <section className="card stats-section">
            <h2 className="stats-section-title">지난달과 비교</h2>
            <ul className="stats-compare">
              {comparisonLines(previous, vsLastMonth).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <BarList title="모양" items={current.shapes} />
          <BarList title="색" items={current.colors} swatch={getColorHex} />
          <BarList
            title="자주 기록한 시간대"
            items={current.timeSlots}
            note={current.unknownTimeCount > 0 ? `시각 없이 저장된 예전 기록 ${current.unknownTimeCount}개는 빼고 셌어요` : undefined}
          />
          {current.durationInputCount > 0 && (
            <BarList
              title="걸린 시간"
              items={current.durations}
              note={`걸린 시간을 남긴 기록 ${current.durationInputCount}개 기준이에요 (전체의 ${formatPercent(current.durationInputRate)})`}
            />
          )}

          <button type="button" className="btn-primary" onClick={handleSaveImage} disabled={saving}>
            {saving ? '저장하는 중...' : '요약 이미지 저장하기'}
          </button>
          <p className="stats-note stats-save-note">메모는 이미지에 들어가지 않아요</p>
        </>
      )}

      <AppDialog
        open={saveResult !== null}
        message={SAVE_MESSAGES[saveResult ?? 'saved']}
        onConfirm={() => setSaveResult(null)}
      />
    </div>
  );
}
