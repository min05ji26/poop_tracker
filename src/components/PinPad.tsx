import { useEffect, useState } from 'react';
import { PIN_LENGTH } from '../appLock';
import './AppLock.css';

interface PinPadProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

// 숫자 4자리 입력 패드. 4자리가 차면 onComplete 후 비운다
export function PinPad({ title, subtitle, error, disabled = false, onComplete }: PinPadProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      onComplete(pin);
      setPin('');
    }
  }, [pin, onComplete]);

  function press(key: string) {
    if (disabled) return;
    if (key === 'del') setPin((p) => p.slice(0, -1));
    else if (key) setPin((p) => (p.length < PIN_LENGTH ? p + key : p));
  }

  return (
    <div className="pin">
      <p className="pin-title">{title}</p>
      {subtitle && <p className="pin-sub">{subtitle}</p>}
      <div className={`pin-dots ${error ? 'pin-dots-error' : ''}`} aria-label={`${pin.length}자리 입력됨`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`pin-dot ${i < pin.length ? 'pin-dot-filled' : ''}`} />
        ))}
      </div>
      <p className="pin-error" role="alert">
        {error ?? ''}
      </p>
      <div className="pin-keys">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="pin-key"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === 'del' ? '지우기' : key}
            >
              {key === 'del' ? '⌫' : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
