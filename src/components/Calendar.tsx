import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import { getColorHex } from '../colorSwatches';
import { AppDialog } from './AppDialog';
import './Calendar.css';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface CalendarProps {
  focusDate?: Date | null;
  onNewRecord: (date: Date, existingRecord: PoopRecord | null) => void;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function Calendar({ focusDate, onNewRecord }: CalendarProps) {
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

  const monthRecordCount = cells.filter((day) => day !== null && recordsByDateKey.has(`${year}-${month}-${day}`)).length;
  const todayMidnightTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

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
      <div className="month-nav">
        <button type="button" className="month-nav-arrow" onClick={goToPrevMonth} aria-label="이전 달">
          ‹
        </button>
        <div className="month-label-wrap">
          <p className="month-label">
            {year}년 {month + 1}월
          </p>
          <p className="month-count">{monthRecordCount}일 기록했어요</p>
        </div>
        <button type="button" className="month-nav-arrow" onClick={goToNextMonth} aria-label="다음 달">
          ›
        </button>
      </div>

      <div className="calendar-grid-card card">
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
            const isFuture = new Date(year, month, day).getTime() > todayMidnightTime;
            return (
              <button
                type="button"
                key={index}
                className={`day-cell${isToday ? ' day-cell-today' : ''}${isSelected ? ' day-cell-selected' : ''}${isFuture ? ' day-cell-future' : ''}`}
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
          <p className="selected-date-title">
            {month + 1}월 {selectedDay}일
          </p>
          <div className="selected-date-detail card">
            {selectedRecord ? (
              <div className="selected-date-info">
                <div className="selected-date-row">
                  <span
                    className="selected-date-swatch"
                    style={{ backgroundColor: getColorHex(selectedRecord.color) }}
                    aria-hidden="true"
                  />
                  <p className="selected-date-shape">{selectedRecord.shape}</p>
                  <p className="selected-date-color">{selectedRecord.color}</p>
                </div>
                {selectedRecord.memo && <p className="selected-date-memo">{selectedRecord.memo}</p>}
              </div>
            ) : (
              <p className="selected-date-empty">이 날은 기록이 없어요</p>
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
