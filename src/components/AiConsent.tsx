import { useState } from 'react';
import { saveAiConsent } from '../storage';
import { CharacterFace } from './Character';
import './AiConsent.css';

interface AiConsentProps {
  onDone: (agreed: boolean) => void;
}

// 보내는 항목·받는 곳·국외 이전·보관을 미리 알리고 동의받는 화면
// ⚠️ 문구는 법무 검토 전 초안 (노션 5단계 "동의 문구·처리방침 법무 검토")
const ROWS: { label: string; value: string }[] = [
  { label: '목적', value: '월간 결과지의 "AI 한 줄 평" 만들기' },
  {
    label: '보내는 것',
    value: '그 달 통계 숫자만: 기록 횟수, 주 평균, 평균 간격, 기록한 날 수, 모양·시간대·걸린 시간 비율, 지난달 대비 변화',
  },
  { label: '보내지 않는 것', value: '메모, 냄새, 색, 날짜별 기록, 닉네임, 생년월일' },
  {
    label: '받는 곳',
    value: '풉트래커 중계 서버(Cloudflare, Inc.)를 거쳐 Google LLC의 Gemini API로 전송돼요',
  },
  { label: '국외 이전', value: '미국 등 해외 서버로 전송돼요. 결과지를 만들 때 한 번씩, 인터넷으로 보내요' },
  {
    label: '보관',
    value: '풉트래커 서버에는 저장하지 않아요. Google은 AI 학습에 쓰지 않고, 오남용 확인 목적으로만 최대 55일 보관한 뒤 지워요',
  },
];

export function AiConsent({ onDone }: AiConsentProps) {
  const [agreeUse, setAgreeUse] = useState(false);
  const [agreeTransfer, setAgreeTransfer] = useState(false);
  const [saving, setSaving] = useState(false);

  async function finish(agreed: boolean) {
    setSaving(true);
    await saveAiConsent(agreed);
    onDone(agreed);
  }

  return (
    <div className="ai-consent-screen">
      <div className="ai-consent-intro">
        <div className="ai-consent-mascot" aria-hidden="true">
          <CharacterFace mood="happy" size={72} />
        </div>
        <p className="ai-consent-title">AI 한 줄 평을 받아볼까요?</p>
        <p className="ai-consent-sub">결과지에 한 줄 평을 달기 위해 한 달 통계를 AI에게 보내요. 숫자는 앱이 계산하고, AI는 한 줄만 써요.</p>
      </div>

      <dl className="card ai-consent-table">
        {ROWS.map((row) => (
          <div key={row.label} className="ai-consent-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="ai-consent-checks">
        <label className="ai-consent-check">
          <input type="checkbox" checked={agreeUse} onChange={(e) => setAgreeUse(e.target.checked)} />
          <span>위 통계를 AI 한 줄 평에 쓰는 데 동의해요</span>
        </label>
        <label className="ai-consent-check">
          <input type="checkbox" checked={agreeTransfer} onChange={(e) => setAgreeTransfer(e.target.checked)} />
          <span>위 통계가 해외(미국 등)로 전송되는 데 동의해요</span>
        </label>
      </div>

      <p className="ai-consent-note">동의하지 않아도 결과지는 숫자로 그대로 받아요. 설정에서 언제든 끌 수 있어요.</p>

      <div className="ai-consent-actions">
        <button type="button" className="btn-primary" disabled={!agreeUse || !agreeTransfer || saving} onClick={() => finish(true)}>
          동의하고 받아보기
        </button>
        <button type="button" className="btn-secondary" disabled={saving} onClick={() => finish(false)}>
          AI 없이 볼게요
        </button>
      </div>
    </div>
  );
}
