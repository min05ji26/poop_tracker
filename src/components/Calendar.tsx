import { useEffect, useState } from 'react';
import { loadRecords, type PoopRecord } from '../storage';
import { getColorHex } from '../colorSwatches';
import { formatRecordTime, groupRecordsByDate } from '../calendarData';
import { AppDialog } from './AppDialog';
import './Calendar.css';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
// 날짜 칸에 점으로 보여줄 최대 횟수. 넘으면 숫자로 표시
const MAX_DOTS = 3;

interface CalendarProps {
  focusDate?: Date | null;
  onNewRecord: (date: Date, existingRecord: PoopRecord | null) => void;
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

  const recordsByDateKey = groupRecordsByDate(records);

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthDayRecords = cells.flatMap((day) => (day === null ? [] : [recordsByDateKey.get(`${year}-${month}-${day}`) ?? []]));
  const monthRecordDays = monthDayRecords.filter((dayRecords) => dayRecords.length > 0).length;
  const monthRecordTotal = monthDayRecords.reduce((sum, dayRecords) => sum + dayRecords.length, 0);
  const todayMidnightTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const selectedRecords = selectedDay === null ? [] : (recordsByDateKey.get(`${year}-${month}-${selectedDay}`) ?? []);

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

    const existingRecord = recordsByDateKey.get(`${targetYear}-${targetMonth}-${targetDay}`)?.[0] ?? null;
    onNewRecord(targetDate, existingRecord);
  }

  return (
    <div className="calendar-screen">
      <div className="month-label-wrap">
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
        <p className="month-count">
          <span className="month-count-dot" aria-hidden="true" />
          {monthRecordDays}일 · {monthRecordTotal}회 기록했어요
        </p>
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
            const dayRecords = recordsByDateKey.get(`${year}-${month}-${day}`) ?? [];
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
                {dayRecords.length > 0 && (
                  <span className="record-marks" aria-label={`${dayRecords.length}회 기록`}>
                    {dayRecords.length > MAX_DOTS ? (
                      <span className="record-count">{dayRecords.length}</span>
                    ) : (
                      dayRecords.map((record) => (
                        <span key={record.id} className="record-dot" style={{ backgroundColor: getColorHex(record.color) }} />
                      ))
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay !== null && (
        <>
          <p className="selected-date-title">
            {month + 1}월 {selectedDay}일
            {selectedRecords.length > 0 && <span className="selected-date-count">{selectedRecords.length}회</span>}
          </p>
          {selectedRecords.length > 0 ? (
            <ul className="selected-date-list">
              {selectedRecords.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    className="selected-date-item card"
                    onClick={() => onNewRecord(new Date(year, month, selectedDay), record)}
                  >
                    <div className="selected-date-info">
                      <p className={`selected-date-time${record.hasTime ? '' : ' selected-date-time-unknown'}`}>
                        {formatRecordTime(record)}
                      </p>
                      <div className="selected-date-row">
                        <span
                          className="selected-date-swatch"
                          style={{ backgroundColor: getColorHex(record.color) }}
                          aria-hidden="true"
                        />
                        <p className="selected-date-chip">{record.shape}</p>
                        <p className="selected-date-chip">{record.color}</p>
                      </div>
                      {record.memo && <p className="selected-date-memo">{record.memo}</p>}
                    </div>
                    <span className="selected-date-edit" aria-hidden="true">
                      수정
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="selected-date-detail card">
              <p className="selected-date-empty">이 날은 기록이 없어요</p>
            </div>
          )}
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
