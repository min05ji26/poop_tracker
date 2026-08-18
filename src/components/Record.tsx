import './Record.css';

interface RecordProps {
  onBack: () => void;
}

export function Record({ onBack }: RecordProps) {
  return (
    <div className="record-screen">
      <div className="record-header-row">
        <button type="button" className="back-button" onClick={onBack} aria-label="홈으로">
          ‹
        </button>
        <p className="record-title">오늘의 기록</p>
      </div>
      <p className="record-placeholder">기록하기 화면 준비 중이에요</p>
    </div>
  );
}
