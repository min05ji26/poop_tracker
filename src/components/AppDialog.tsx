import { useEffect } from 'react';
import './AppDialog.css';

interface AppDialogProps {
  open: boolean;
  message: string;
  /** 확인 버튼 문구 (기본: 확인) */
  confirmLabel?: string;
  /** 넘기면 취소 버튼이 생겨요. 없으면 확인 버튼만 있는 알림창이에요. */
  cancelLabel?: string;
  /** 확인 버튼을 위험(빨강) 스타일로 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * 앱 내부 확인/알림 창. 토스 웹뷰에서는 window.confirm / window.alert 가
 * 동작하지 않을 수 있어서 직접 그려요.
 */
export function AppDialog({
  open,
  message,
  confirmLabel = '확인',
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onCancel) onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="app-dialog-backdrop"
      onClick={() => onCancel?.()}
      role="presentation"
    >
      <div
        className="app-dialog-card"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="app-dialog-message">{message}</p>
        <div className="app-dialog-actions">
          {cancelLabel && (
            <button type="button" className="app-dialog-button app-dialog-button-cancel" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`app-dialog-button app-dialog-button-confirm${danger ? ' app-dialog-button-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
