import { useState } from 'react';
import { SHAPE_LABELS, saveRecord, type PoopShape, type PoopColor } from '../storage';
import { COLOR_SWATCHES } from '../colorSwatches';
import './Record.css';

interface RecordProps {
  date: Date;
  onBack: () => void;
  onSave: () => void;
}

export function Record({ date, onBack, onSave }: RecordProps) {
  const [shape, setShape] = useState<PoopShape | null>(null);
  const [color, setColor] = useState<PoopColor | null>(null);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = shape !== null && color !== null && !saving;

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const title = isToday ? '오늘의 기록' : `${date.getMonth() + 1}월 ${date.getDate()}일 기록`;

  async function handleSave() {
    if (!shape || !color) return;
    setSaving(true);
    await saveRecord({
      id: crypto.randomUUID(),
      date: date.toISOString(),
      shape,
      color,
      memo: memo.trim() || undefined,
    });
    onSave();
  }

  return (
    <div className="record-screen">
      <div className="record-header-row">
        <button type="button" className="back-button" onClick={onBack} aria-label="홈으로">
          ‹
        </button>
      </div>

      <p className="record-disclaimer">💡 진단이 아닌 참고·재미용 기록이에요</p>
      <p className="record-title">{title}</p>

      <div className="record-section">
        <p className="record-section-label">오늘 모양은 어땠나요?</p>
        <div className="shape-chip-grid">
          {SHAPE_LABELS.map((label) => (
            <button
              type="button"
              key={label}
              className={`shape-chip${shape === label ? ' shape-chip-selected' : ''}`}
              onClick={() => setShape(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="record-section">
        <p className="record-section-label">색은 어때요?</p>
        <div className="color-chip-row">
          {COLOR_SWATCHES.map(({ label, hex }) => (
            <button
              type="button"
              key={label}
              className={`color-chip${hex === null ? ' color-chip-other' : ''}${color === label ? ' color-chip-selected' : ''}`}
              style={hex ? { backgroundColor: hex } : undefined}
              onClick={() => setColor(label)}
              aria-label={label}
            >
              {hex === null && '?'}
            </button>
          ))}
        </div>
      </div>

      <div className="record-section">
        <p className="record-section-label">메모 (선택)</p>
        <textarea
          className="memo-input"
          placeholder="자유롭게 적어보세요"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <button type="button" className="save-button" disabled={!canSave} onClick={handleSave}>
        {saving ? '저장 중...' : '저장하기'}
      </button>
    </div>
  );
}
