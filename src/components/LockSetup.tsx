import { useCallback, useState } from 'react';
import { disableLock, setPin, verifyPin } from '../appLock';
import { PinPad } from './PinPad';

export type LockSetupMode = 'set' | 'change' | 'disable';

interface LockSetupProps {
  mode: LockSetupMode;
  onDone: (message: string) => void;
}

type Step = 'current' | 'new' | 'confirm';

// 설정에서 여는 비밀번호 켜기·변경·끄기 화면. 토스 ‹ 는 설정으로 (App.tsx 분기)
export function LockSetup({ mode, onDone }: LockSetupProps) {
  const [step, setStep] = useState<Step>(mode === 'set' ? 'new' : 'current');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (pin: string) => {
      if (step === 'current') {
        const result = await verifyPin(pin);
        if (!result.ok) {
          setError(result.locked ? '여러 번 틀려서 30초 뒤에 다시 해주세요' : `비밀번호가 달라요 (${result.attemptsLeft}번 남음)`);
          return;
        }
        setError(null);
        if (mode === 'disable') {
          await disableLock();
          onDone('앱 잠금을 껐어요');
        } else {
          setStep('new');
        }
        return;
      }
      if (step === 'new') {
        setFirstPin(pin);
        setError(null);
        setStep('confirm');
        return;
      }
      if (pin !== firstPin) {
        setError('두 번 입력한 비밀번호가 달라요. 처음부터 다시 입력해 주세요');
        setFirstPin('');
        setStep('new');
        return;
      }
      await setPin(pin);
      onDone(mode === 'set' ? '앱 잠금을 켰어요' : '비밀번호를 바꿨어요');
    },
    [step, mode, firstPin, onDone]
  );

  const titles: Record<Step, string> = {
    current: '지금 비밀번호를 입력해 주세요',
    new: mode === 'set' ? '사용할 비밀번호 4자리를 정해 주세요' : '새 비밀번호 4자리를 정해 주세요',
    confirm: '한 번 더 입력해 주세요',
  };

  return (
    <div className="lock-screen">
      <PinPad title={titles[step]} error={error} onComplete={handleComplete} />
      {mode !== 'disable' && step !== 'current' && (
        <p className="lock-warning">
          ⚠️ 비밀번호를 잊으면 되살릴 방법이 없어요. 이 기기의 모든 기록을 지우고 처음부터 시작하는 것만 가능해요.
        </p>
      )}
    </div>
  );
}
