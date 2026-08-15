import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import './Calendar.css';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarProps {
  onBack: () => void;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function Calendar({ onBack }: CalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [records, setRecords] = useState<PoopRecord[]>([]);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const recordedDateKeys = new Set(records.map((record) => toDateKey(new Date(record.date))));

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function goToPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="calendar-screen">
      <div className="calendar-header-row">
        <button type="button" className="back-button" onClick={onBack} aria-label="홈으로">
          ‹
        </button>
        <p className="calendar-title">지난 기록</p>
      </div>

      <div className="month-nav">
        <button type="button" className="month-nav-arrow" onClick={goToPrevMonth} aria-label="이전 달">
          ‹
        </button>
        <p className="month-label">
          {year}년 {month + 1}월
        </p>
        <button type="button" className="month-nav-arrow" onClick={goToNextMonth} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="calendar-grid-card">
        <div className="weekday-row">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="weekday-label">
              {label}
            </span>
          ))}
        </div>
        <div className="day-grid">
          {cells.map((day, index) => {
            if (day === null) return <div key={index} className="day-cell" />;
            const hasRecord = recordedDateKeys.has(`${year}-${month}-${day}`);
            return (
              <div key={index} className="day-cell">
                <span className="day-number">{day}</span>
                {hasRecord && <span className="record-dot" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
