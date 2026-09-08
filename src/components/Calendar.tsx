import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import { getColorHex } from '../colorSwatches';
import { AppDialog } from './AppDialog';
import './Calendar.css';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarProps {
  focusDate?: Date | null;
  onBack: () => void;
  onNewRecord: (date: Date, existingRecord: PoopRecord | null) => void;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function Calendar({ focusDate, onBack, onNewRecord }: CalendarProps) {
  const today = new Date();
  const initialDate = focusDate ?? today;
  const [year, setYear] = useState(initialDate.getFullYear());
  const [month, setMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(focusDate ? focusDate.getDate() : null);
  const [records, setRecords] = useState<PoopRecord[]>([]);
  const [showFutureDialog, setShowFutureDialog] = useState(false);

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

  function handleAddClick() {
    const targetYear = selectedDay !== null ? year : today.getFullYear();
    const targetMonth = selectedDay !== null ? month : today.getMonth();
    const targetDay = selectedDay ?? today.getDate();
    const targetDate = new Date(targetYear, targetMonth, targetDay);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (targetDate.getTime() > todayMidnight.getTime()) {
      setShowFutureDialog(true);
      return;
    }

    const existingRecord = recordsByDateKey.get(`${targetYear}-${targetMonth}-${targetDay}`) ?? null;
    onNewRecord(targetDate, existingRecord);
  }

  return (
    <div className="calendar-screen">
      <button type="button" className="calendar-back-button" onClick={onBack} aria-label="홈으로">
        ‹
      </button>

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
            const record = recordsByDateKey.get(`${year}-${month}-${day}`);
            const isSelected = day === selectedDay;
            const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
            return (
              <button
                type="button"
                key={index}
                className={`day-cell${isToday ? ' day-cell-today' : ''}${isSelected ? ' day-cell-selected' : ''}`}
                onClick={() => setSelectedDay(day)}
              >
                <span className="day-number">{day}</span>
                {record && <span className="record-dot" style={{ backgroundColor: getColorHex(record.color) }} />}
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
              <div className="selected-date-info">
                <p className="selected-date-text">
                  {selectedRecord.shape} · {selectedRecord.color}
                </p>
                {selectedRecord.memo && <p className="selected-date-memo">{selectedRecord.memo}</p>}
              </div>
            ) : (
              <p className="selected-date-text selected-date-empty">이 날은 기록이 없어요</p>
            )}
          </div>
        </>
      )}

      <button type="button" className="new-record-fab" onClick={handleAddClick} aria-label="새 기록 추가">
        +
      </button>

      <AppDialog
        open={showFutureDialog}
        message={'아직 오지 않은 날이에요.\n오늘까지만 기록할 수 있어요.'}
        confirmLabel="확인"
        onConfirm={() => setShowFutureDialog(false)}
      />
    </div>
  );
}
