import { useCallback, useEffect, useState } from 'react';
import { isAiConsentActive, loadAiConsent, loadProfile, saveAiConsent, saveProfile, type AiConsent, type Profile } from '../storage';
import { AppDialog } from './AppDialog';
import { isLockEnabled } from '../appLock';
import type { LockSetupMode } from './LockSetup';
import './Settings.css';

const NICKNAME_MAX_LENGTH = 12;

interface SettingsProps {
  onBack: () => void;
  registerBackHandler: (handler: (() => void) | null) => void;
  onNicknameChange: (nickname: string) => void;
  onOpenAiConsent: () => void;
  onOpenPrivacy: () => void;
  onOpenLockSetup: (mode: LockSetupMode) => void;
  notice?: string | null; // 다른 화면에서 돌아올 때 보여줄 한 줄 (예: "앱 잠금을 켰어요")
}

// 켜짐/꺼짐 토글. 누르면 바로 바뀌지 않고 동의·비밀번호 확인 같은 다음 단계를 거친다
function Switch({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-switch ${checked ? 'settings-switch-on' : ''}`}
      onClick={onToggle}
    >
      <span className="settings-switch-knob" />
    </button>
  );
}

function formatConsentDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

// 앱 설정을 한곳에 모으는 화면. 이후 AI 리포트 동의·앱 잠금도 여기에 추가해요
export function Settings({
  onBack,
  registerBackHandler,
  onNicknameChange,
  onOpenAiConsent,
  onOpenPrivacy,
  onOpenLockSetup,
  notice,
}: SettingsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [aiConsent, setAiConsent] = useState<AiConsent | null>(null);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [lockOn, setLockOn] = useState(false);

  useEffect(() => {
    loadAiConsent().then(setAiConsent);
    isLockEnabled().then(setLockOn);
    loadProfile().then((loaded) => {
      setProfile(loaded);
      setNickname(loaded?.nickname ?? '');
    });
  }, []);

  const trimmed = nickname.trim();
  const isDirty = profile !== null && trimmed !== profile.nickname;
  const canSave = isDirty && trimmed.length > 0 && !saving;

  // 토스 ‹: 바꾼 닉네임을 저장 안 했으면 한 번 물어봐요
  const requestBack = useCallback(() => {
    if (isDirty) setShowLeaveDialog(true);
    else onBack();
  }, [isDirty, onBack]);

  useEffect(() => {
    registerBackHandler(requestBack);
    return () => registerBackHandler(null);
  }, [registerBackHandler, requestBack]);

  async function handleSave() {
    if (!profile || !canSave) return;
    setSaving(true);
    const updated = { ...profile, nickname: trimmed };
    await saveProfile(updated);
    setProfile(updated);
    setNickname(trimmed);
    setSaving(false);
    setSavedMessage(true);
    onNicknameChange(trimmed);
  }

  return (
    <div className="settings-screen">
      <p className="settings-title">설정</p>

      <section className="card settings-section">
        <h2 className="settings-section-title">프로필</h2>
        <label className="settings-field">
          <span className="settings-label">닉네임</span>
          <input
            type="text"
            className="settings-input"
            placeholder="어떻게 불러드릴까요?"
            maxLength={NICKNAME_MAX_LENGTH}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setSavedMessage(false);
            }}
          />
        </label>
        {savedMessage ? (
          <p className="settings-help settings-help-done">닉네임을 바꿨어요</p>
        ) : (
          <p className="settings-help">홈 화면 인사말에 쓰여요 (최대 {NICKNAME_MAX_LENGTH}자)</p>
        )}
        <button type="button" className="btn-primary" disabled={!canSave} onClick={handleSave}>
          {saving ? '저장하는 중...' : '저장하기'}
        </button>
      </section>

      <section className="card settings-section">
        <div className="settings-switch-row">
          <div>
            <h2 className="settings-section-title">AI 한 줄 평</h2>
            <p className="settings-help">
              {isAiConsentActive(aiConsent) && aiConsent
                ? `${formatConsentDate(aiConsent.at)}에 동의했어요. 결과지를 만들 때 한 달 통계를 AI에게 보내요`
                : '켜면 월간 결과지에 마스코트의 한 줄 평이 붙어요'}
            </p>
          </div>
          <Switch
            label="AI 한 줄 평"
            checked={isAiConsentActive(aiConsent)}
            onToggle={() => (isAiConsentActive(aiConsent) ? setShowWithdrawDialog(true) : onOpenAiConsent())}
          />
        </div>
      </section>

      <section className="card settings-section">
        <div className="settings-switch-row">
          <div>
            <h2 className="settings-section-title">앱 잠금</h2>
            <p className="settings-help">
              {notice ?? (lockOn ? '앱을 열 때마다 비밀번호 4자리를 물어봐요' : '켜면 앱을 열 때 비밀번호 4자리를 물어봐요')}
            </p>
          </div>
          <Switch label="앱 잠금" checked={lockOn} onToggle={() => onOpenLockSetup(lockOn ? 'disable' : 'set')} />
        </div>
        {lockOn && (
          <button type="button" className="settings-row-link" onClick={() => onOpenLockSetup('change')}>
            <span>비밀번호 변경</span>
            <span aria-hidden="true">›</span>
          </button>
        )}
      </section>

      <button type="button" className="settings-link" onClick={onOpenPrivacy}>
        개인정보처리방침 보기 ›
      </button>

      <p className="settings-footnote">기록은 이 기기에만 저장돼요. AI 한 줄 평을 켠 경우에만 한 달 통계가 AI로 전송돼요</p>

      <AppDialog
        open={showWithdrawDialog}
        message="AI 한 줄 평을 끌까요? 앞으로는 통계를 보내지 않고, 결과지는 숫자로만 받아요."
        confirmLabel="끄기"
        cancelLabel="취소"
        onConfirm={async () => {
          setAiConsent(await saveAiConsent(false));
          setShowWithdrawDialog(false);
        }}
        onCancel={() => setShowWithdrawDialog(false)}
      />

      <AppDialog
        open={showLeaveDialog}
        message="바꾼 닉네임이 저장되지 않아요. 그만둘까요?"
        confirmLabel="그만두기"
        cancelLabel="계속 쓰기"
        onConfirm={() => {
          setShowLeaveDialog(false);
          onBack();
        }}
        onCancel={() => setShowLeaveDialog(false)}
      />
    </div>
  );
}
