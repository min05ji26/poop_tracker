import { useCallback, useEffect, useState } from 'react';
import { getLockout, MAX_ATTEMPTS, resetAllData, verifyPin } from '../appLock';
import { AppDialog } from './AppDialog';
import { CharacterFace } from './Character';
import { PinPad } from './PinPad';

interface LockScreenProps {
  onUnlock: () => void;
  onReset: () => void;
}

// 앱을 열 때 보이는 잠금 화면. 토스 ‹ 는 앱 종료 (App.tsx 분기)
export function LockScreen({ onUnlock, onReset }: LockScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    getLockout().then(setLockedUntil);
  }, []);

  // 대기 중이면 1초마다 남은 시간 갱신
  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setError(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const handleComplete = useCallback(
    async (pin: string) => {
      const result = await verifyPin(pin);
      if (result.ok) return onUnlock();
      if (result.locked) {
        setNow(Date.now());
        setLockedUntil(result.lockedUntil);
        setError(`${MAX_ATTEMPTS}번 틀려서 잠시 기다려야 해요`);
      } else {
        setError(`비밀번호가 달라요 (${result.attemptsLeft}번 남음)`);
      }
    },
    [onUnlock]
  );

  const waitSeconds = lockedUntil === null ? 0 : Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  return (
    <div className="lock-screen">
      <div className="lock-mascot" aria-hidden="true">
        <CharacterFace mood="neutral" size={64} />
      </div>
      <PinPad
        title="비밀번호를 입력해 주세요"
        subtitle={waitSeconds > 0 ? `${waitSeconds}초 뒤에 다시 입력할 수 있어요` : undefined}
        error={error}
        disabled={waitSeconds > 0}
        onComplete={handleComplete}
      />
      <button type="button" className="lock-forgot" onClick={() => setShowReset(true)}>
        비밀번호를 잊었어요
      </button>

      <AppDialog
        open={showReset}
        message="비밀번호는 되살릴 수 없어요. 초기화하면 이 기기의 모든 기록과 설정이 지워지고 처음부터 시작해요. 초기화할까요?"
        confirmLabel="모두 지우고 초기화"
        cancelLabel="취소"
        danger
        onConfirm={async () => {
          await resetAllData();
          setShowReset(false);
          onReset();
        }}
        onCancel={() => setShowReset(false)}
      />
    </div>
  );
}
