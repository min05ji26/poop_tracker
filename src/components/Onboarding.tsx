import { useState } from 'react';
import { saveProfile } from '../storage';
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
      <div className="onboarding-intro">
        <p className="onboarding-title">반가워요 👋</p>
        <p className="onboarding-subtitle">몇 가지만 알려주면 시작할 수 있어요</p>
      </div>

      <div className="onboarding-section">
        <p className="onboarding-label">닉네임</p>
        <input
          type="text"
          className="onboarding-input"
          placeholder="사용할 닉네임을 입력해주세요"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div className="onboarding-section">
        <p className="onboarding-label">생년월일</p>
        <input
          type="text"
          inputMode="numeric"
          className="onboarding-input"
          placeholder="YYYY.MM.DD"
          value={birthdateInput}
          onChange={(e) => setBirthdateInput(formatBirthdateInput(e.target.value))}
        />
      </div>

      {error ? (
        <p className="onboarding-error">{error}</p>
      ) : (
        <p className="onboarding-disclaimer">💡 생년월일은 만 {MIN_AGE}세 이상 확인 용도로만 사용돼요</p>
      )}

      <div className="onboarding-spacer" />

      <button type="button" className="onboarding-start-button" disabled={!canSubmit} onClick={handleStart}>
        {saving ? '시작하는 중...' : '시작하기'}
      </button>
    </div>
  );
}
