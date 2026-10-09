import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 개발 모드에서만 브라우저 콘솔에 샘플 기록 함수를 연결 (출시 빌드에는 포함되지 않음)
if (import.meta.env.DEV) {
  import('./devSeed').then(({ seedSampleRecords, seedLegacyRecords, clearRecords }) => {
    Object.assign(window, { seedSampleRecords, seedLegacyRecords, clearRecords })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
