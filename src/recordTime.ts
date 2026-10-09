// 기록 화면 시각 입력(<input type="time">)과 기록 date 사이 변환

// Date → 'HH:mm' (시각 입력 칸 값)
export function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 날짜 + 'HH:mm' → 그날 그 시각. 시각이 비어 있으면 그날 0시(시각 모르는 기록)
export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time ? time.split(':').map(Number) : [0, 0];
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

export function isFutureTime(date: Date, time: string, now: Date = new Date()): boolean {
  return time !== '' && combineDateAndTime(date, time).getTime() > now.getTime();
}
