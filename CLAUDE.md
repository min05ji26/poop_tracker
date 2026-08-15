# 프로젝트: 똥 트래커 (가칭)

Apps in Toss용 React 미니앱. 생리 트래커처럼 오늘의 배변 상태를 가볍게 기록하는 20대 여성 타겟 서비스.

## 참고 문서
- PRD(전체 기획): https://app.notion.com/p/3bb1c9b6b4aa817f90a2f499e48d0ca1
- Figma 디자인: https://www.figma.com/design/heQCtI0yYS5dVc5aze7Edr
- 태스크 목록(v1 순서): https://app.notion.com/p/3bb1c9b6b4aa81cf8e41c5fce69653cf

## 핵심 원칙
- MVP는 최대한 간단하게. PRD의 "out of scope" 항목(먹은 것 태그, 소셜 공유, 통계 등)은 절대 지금 단계에서 구현하지 말 것
- 건강 상태를 단정하는 문구 금지. 참고·재미용이라는 톤 유지
- 데이터는 v1에서 서버 없이 로컬(Storage API)에만 저장

## 기술 스택 & 확정 사항
- `@apps-in-toss/web-framework`의 `Storage` API 사용 (getItem/setItem/removeItem/clearItems, 문자열 기반 — JSON.stringify로 감싸서 저장)
- `src/spike-storage.ts`에 이미 기본 저장/조회 함수와 캐릭터 기분 계산 로직이 스파이크로 작성되어 있음 — 이걸 기반으로 정식 구현할 것
- 모양 선택 라벨(숫자 아님, 이 순서 그대로 사용): 토끼똥 / 방울똥 / 바나나똥 / 부들똥 / 몽글똥 / 죽똥 / 물똥

## 유저 플로우 (중요 — 이 순서 지킬 것)
```
홈(캐릭터, 기록 안 하면 표정이 시무룩해짐)
  → 달력/히스토리 (체크 아이콘 표시, 탭하면 상세 + 새 기록 버튼)
  → 기록하기 (모양/색/메모 선택 → 저장 → 홈으로 복귀)
```

## 작업 순서
Notion 태스크 목록(위 링크)의 순서를 그대로 따를 것. 한 태스크씩 완료하고 확인받은 뒤 다음으로 넘어갈 것.
