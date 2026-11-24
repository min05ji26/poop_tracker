import { PRIVACY_POLICY, PRIVACY_POLICY_EFFECTIVE_DATE } from '../privacyPolicy';
import './PrivacyPolicy.css';

// 처리방침 전문. 온보딩(겹쳐 보기)과 설정(화면)에서 같이 쓴다. 닫기는 토스 ‹ 또는 onClose 버튼
export function PrivacyPolicy({ onClose }: { onClose?: () => void }) {
  return (
    <div className="privacy-screen">
      <p className="privacy-title">개인정보처리방침</p>
      <p className="privacy-sub">시행일 {PRIVACY_POLICY_EFFECTIVE_DATE}</p>
      {PRIVACY_POLICY.map((section) => (
        <section key={section.title} className="card privacy-section">
          <h2 className="privacy-section-title">{section.title}</h2>
          <ul className="privacy-items">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      {onClose && (
        <button type="button" className="btn-primary" onClick={onClose}>
          확인했어요
        </button>
      )}
    </div>
  );
}
