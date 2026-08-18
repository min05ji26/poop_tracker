import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import './Calendar.css';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarProps {
  onBack: () => void;
  onNewRecord: () => void;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function Calendar({ onBack, onNewRecord }: CalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(
    year === today.getFullYear() && month === today.getMonth() ? today.getDate() : null
  );
  const [records, setRecords] = useState<PoopRecord[]>([]);

  useEffect(() => {
    loadRecords().then(setRecords);
  }, []);

  const recordsByDateKey = new Map<string, PoopRecord>();
  for (const record of records) {
    recordsByDateKey.set(toDateKey(new Date(record.date)), record);
  }

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedRecord = selectedDay === null ? undefined : recordsByDateKey.get(`${year}-${month}-${selectedDay}`);

  function goToPrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function goToNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
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
            const hasRecord = recordsByDateKey.has(`${year}-${month}-${day}`);
            const isSelected = day === selectedDay;
            return (
              <button
                type="button"
                key={index}
                className={`day-cell${isSelected ? ' day-cell-selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="day-number">{day}</span>
                {hasRecord && <span className="record-dot" />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay !== null && (
        <>
          <p className="selected-date-title">선택한 날짜의 기록</p>
          <div className="selected-date-detail">
            {selectedRecord ? (
              <p className="selected-date-text">
                {selectedRecord.shape} · {selectedRecord.color}
              </p>
            ) : (
              <p className="selected-date-text selected-date-empty">이 날은 기록이 없어요</p>
            )}
          </div>
        </>
      )}

      <button type="button" className="new-record-fab" onClick={onNewRecord} aria-label="새 기록 추가">
        +
      </button>
    </div>
  );
}
