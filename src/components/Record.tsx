import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DURATION_LABELS,
  SHAPE_LABELS,
  SMELL_LABELS,
  saveRecord,
  deleteRecord,
  type PoopShape,
  type PoopColor,
  type PoopDuration,
  type PoopRecord,
  type PoopSmell,
} from '../storage';
import { COLOR_SWATCHES } from '../colorSwatches';
import { SHAPE_DESCRIPTIONS } from '../shapeDescriptions';
import { DURATION_HINTS, SMELL_EMOJIS } from '../extraOptions';
import { combineDateAndTime, isFutureTime, toTimeInputValue } from '../recordTime';
import { AppDialog } from './AppDialog';
import './Record.css';

interface RecordProps {
  date: Date;
  existingRecord: PoopRecord | null;
  onBack: () => void;
  registerBackHandler: (handler: (() => void) | null) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function Record({ date, existingRecord, onBack, registerBackHandler, onSave, onDelete }: RecordProps) {
  const [shape, setShape] = useState<PoopShape | null>(existingRecord?.shape ?? null);
  const [color, setColor] = useState<PoopColor | null>(existingRecord?.color ?? null);
  const [duration, setDuration] = useState<PoopDuration | null>(existingRecord?.duration ?? null);
  const [smell, setSmell] = useState<PoopSmell | null>(existingRecord?.smell ?? null);
  const [memo, setMemo] = useState(existingRecord?.memo ?? '');
  // 선택 항목은 접어두고, 이미 적어둔 값이 있는 기록을 열 때만 펼쳐서 보여줌
  const [showMore, setShowMore] = useState(
    Boolean(existingRecord?.duration || existingRecord?.smell || existingRecord?.memo),
  );
  // 새 기록은 지금 시각, 시각 있는 기록은 그 시각, 시각 없는 v1 기록은 빈 칸
  const [initialTime] = useState(() => {
    if (!existingRecord) return toTimeInputValue(new Date());
    return existingRecord.hasTime ? toTimeInputValue(new Date(existingRecord.date)) : '';
  });
  const [time, setTime] = useState(initialTime);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const timeIsFuture = isFutureTime(date, time);
  const canSave = shape !== null && color !== null && !timeIsFuture && !saving && !deleting;

  // 저장하지 않은 입력이 하나라도 있으면 "기록 중"으로 간주 (뒤로가기 시 확인용)
  const isDirty =
    !saving &&
    !deleting &&
    (shape !== (existingRecord?.shape ?? null) ||
      color !== (existingRecord?.color ?? null) ||
      time !== initialTime ||
      duration !== (existingRecord?.duration ?? null) ||
      smell !== (existingRecord?.smell ?? null) ||
      memo.trim() !== (existingRecord?.memo ?? ''));

  // 뒤로가기 시점의 최신 isDirty 를 읽기 위한 ref (내비바 뒤로가기 핸들러가 stale 값을 보지 않도록)
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // 토스 내비바 뒤로가기가 이 핸들러를 거침 (자체 뒤로가기 버튼은 심사 반려로 제거)
  const requestBack = useCallback(() => {
    if (isDirtyRef.current) {
      setShowLeaveDialog(true);
      return;
    }
    onBack();
  }, [onBack]);

  useEffect(() => {
    registerBackHandler(requestBack);
    return () => registerBackHandler(null);
  }, [registerBackHandler, requestBack]);

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const title = isToday ? '오늘의 기록' : `${date.getMonth() + 1}월 ${date.getDate()}일 기록`;

  async function handleSave() {
    if (!shape || !color) return;
    setSaving(true);
    // 시각 칸을 비우면 시각 모르는 기록(그날 0시)으로 저장
    await saveRecord({
      id: existingRecord?.id ?? crypto.randomUUID(),
      date: combineDateAndTime(date, time).toISOString(),
      hasTime: time !== '',
      shape,
      color,
      duration: duration ?? undefined,
      smell: smell ?? undefined,
      memo: memo.trim() || undefined,
    });
    onSave();
  }

  async function handleDelete() {
    if (!existingRecord) return;
    setShowDeleteDialog(false);
    setDeleting(true);
    await deleteRecord(existingRecord.id);
    onDelete();
  }

  return (
    <div className="record-screen">
      <div className="record-heading">
        <p className="record-title">{title}</p>
        <p className="disclaimer-pill">💡 진단이 아닌 참고·재미용 기록이에요</p>
      </div>

      <section className="record-section card">
        <div className="time-row">
          <label className="record-section-label" htmlFor="record-time">
            몇 시에 갔나요?
          </label>
          <input
            id="record-time"
            type="time"
            className={`time-input${timeIsFuture ? ' time-input-invalid' : ''}`}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        {timeIsFuture && <p className="time-hint time-hint-error">아직 오지 않은 시각이에요</p>}
        {!timeIsFuture && time === '' && <p className="time-hint">시각을 몰라도 괜찮아요. 비워두고 저장할 수 있어요</p>}
      </section>

      <section className="record-section card">
        <p className="record-section-label">모양은 어땠나요?</p>
        <div className="shape-chip-grid">
          {SHAPE_LABELS.map((label) => (
            <button
              type="button"
              key={label}
              className={`shape-chip${shape === label ? ' shape-chip-selected' : ''}`}
              onClick={() => setShape(label)}
              aria-pressed={shape === label}
            >
              <span className="shape-chip-name">{label}</span>
              <span className="shape-chip-desc">{SHAPE_DESCRIPTIONS[label]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="record-section card">
        <p className="record-section-label">색은 어때요?</p>
        <div className="color-chip-row">
          {COLOR_SWATCHES.map(({ label, hex }) => (
            <button
              type="button"
              key={label}
              className={`color-chip${color === label ? ' color-chip-selected' : ''}`}
              onClick={() => setColor(label)}
              aria-pressed={color === label}
            >
              <span
                className={`color-chip-swatch${hex === null ? ' color-chip-swatch-other' : ''}`}
                style={hex ? { backgroundColor: hex } : undefined}
                aria-hidden="true"
              >
                {hex === null && '?'}
              </span>
              <span className="color-chip-label">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="more-toggle"
        onClick={() => setShowMore((open) => !open)}
        aria-expanded={showMore}
      >
        더 기록하기 <span className="record-section-optional">걸린 시간 · 냄새 · 메모</span>
        <span className={`more-toggle-arrow${showMore ? ' more-toggle-arrow-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      {showMore && (
        <>
          <section className="record-section card">
            <p className="record-section-label">
              얼마나 걸렸나요? <span className="record-section-optional">선택</span>
            </p>
            <div className="option-chip-row option-chip-row-4">
              {DURATION_LABELS.map((label) => (
                <button
                  type="button"
                  key={label}
                  className={`option-chip${duration === label ? ' option-chip-selected' : ''}`}
                  // 선택 항목이라 한 번 더 누르면 선택 해제
                  onClick={() => setDuration(duration === label ? null : label)}
                  aria-pressed={duration === label}
                >
                  <span className="option-chip-name">{label}</span>
                  <span className="option-chip-desc">{DURATION_HINTS[label]}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="record-section card">
            <p className="record-section-label">
              냄새는요? <span className="record-section-optional">선택</span>
            </p>
            <div className="option-chip-row option-chip-row-5">
              {SMELL_LABELS.map((label) => (
                <button
                  type="button"
                  key={label}
                  className={`option-chip${smell === label ? ' option-chip-selected' : ''}`}
                  onClick={() => setSmell(smell === label ? null : label)}
                  aria-pressed={smell === label}
                >
                  <span className="option-chip-emoji" aria-hidden="true">
                    {SMELL_EMOJIS[label]}
                  </span>
                  <span className="option-chip-desc">{label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="record-section card">
            <p className="record-section-label">
              메모 <span className="record-section-optional">선택</span>
            </p>
            <textarea
              className="memo-input"
              placeholder="자유롭게 적어보세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </section>
        </>
      )}

      <div className="record-actions">
        <button type="button" className="btn-primary" disabled={!canSave} onClick={handleSave}>
          {saving ? '저장 중...' : '저장하기'}
        </button>

        {existingRecord && (
          <button
            type="button"
            className="delete-button"
            disabled={saving || deleting}
            onClick={() => setShowDeleteDialog(true)}
          >
            {deleting ? '삭제 중...' : '이 기록 삭제하기'}
          </button>
        )}
      </div>

      <AppDialog
        open={showLeaveDialog}
        message={'입력한 내용이 저장되지 않아요.\n그만둘까요?'}
        cancelLabel="계속 쓰기"
        confirmLabel="그만두기"
        onCancel={() => setShowLeaveDialog(false)}
        onConfirm={() => {
          setShowLeaveDialog(false);
          onBack();
        }}
      />

      <AppDialog
        open={showDeleteDialog}
        message={'이 기록을 삭제할까요?'}
        cancelLabel="취소"
        confirmLabel="삭제하기"
        danger
        onCancel={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
