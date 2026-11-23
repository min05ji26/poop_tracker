import { useCallback, useEffect, useState } from 'react';
import { loadProfile, saveProfile, type Profile } from '../storage';
import { AppDialog } from './AppDialog';
import './Settings.css';

const NICKNAME_MAX_LENGTH = 12;

interface SettingsProps {
  onBack: () => void;
  registerBackHandler: (handler: (() => void) | null) => void;
  onNicknameChange: (nickname: string) => void;
}

// 앱 설정을 한곳에 모으는 화면. 이후 AI 리포트 동의·앱 잠금도 여기에 추가해요
export function Settings({ onBack, registerBackHandler, onNicknameChange }: SettingsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  useEffect(() => {
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

      <p className="settings-footnote">모든 기록은 이 기기에만 저장돼요</p>

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
