import { useState } from 'react';
import { saveProfile } from '../storage';
import { CharacterFace } from './Character';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: (nickname: string) => void;
}

const MIN_AGE = 14;

function formatBirthdateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  return [year, month, day].filter(Boolean).join('.');
}

function parseBirthdate(value: string): Date | null {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const hadBirthdayThisYear =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() && today.getDate() >= birthdate.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [nickname, setNickname] = useState('');
  const [birthdateInput, setBirthdateInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = nickname.trim().length > 0 && birthdateInput.length === 10 && !saving;

  async function handleStart() {
    const birthdate = parseBirthdate(birthdateInput);
    if (!birthdate) {
      setError('생년월일을 정확히 입력해주세요');
      return;
    }
    if (calculateAge(birthdate) < MIN_AGE) {
      setError(`만 ${MIN_AGE}세 이상만 이용할 수 있어요`);
      return;
    }

    setError(null);
    setSaving(true);
    const trimmedNickname = nickname.trim();
    await saveProfile({ nickname: trimmedNickname, birthdate: birthdateInput });
    onComplete(trimmedNickname);
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-body">
        <div className="onboarding-intro">
          <div className="onboarding-mascot" aria-hidden="true">
            <CharacterFace mood="happy" size={88} />
          </div>
          <p className="onboarding-title">
            반가워요!
            <br />
            나만의 편안한 하루를 시작해볼까요?
          </p>
          <p className="onboarding-subtitle">매일의 작은 습관으로 속 편한 일상을 기록해요.</p>
        </div>

        <div className="onboarding-form">
          <label className="onboarding-section">
            <span className="onboarding-label">닉네임</span>
            <input
              type="text"
              className="onboarding-input"
              placeholder="어떻게 불러드릴까요?"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </label>

          <label className="onboarding-section">
            <span className="onboarding-label">생년월일</span>
            <input
              type="text"
              inputMode="numeric"
              className="onboarding-input"
              placeholder="YYYY.MM.DD"
              value={birthdateInput}
              onChange={(e) => setBirthdateInput(formatBirthdateInput(e.target.value))}
            />
          </label>

          {error ? (
            <p className="onboarding-error">{error}</p>
          ) : (
            <p className="onboarding-disclaimer">
              입력한 정보는 이 기기에만 저장돼요
              <br />
              생년월일은 만 {MIN_AGE}세 이상 확인에만 써요
            </p>
          )}
        </div>
      </div>

      <button type="button" className="btn-primary" disabled={!canSubmit} onClick={handleStart}>
        {saving ? '시작하는 중...' : '시작하기'}
      </button>
    </div>
  );
}
