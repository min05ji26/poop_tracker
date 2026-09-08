import { graniteEvent, Screen } from '@apps-in-toss/web-framework';

/**
 * 토스 내비게이션 바 뒤로가기(및 안드로이드 하드웨어 back) 이벤트를 구독해요.
 * 반환된 함수를 호출하면 구독이 해제돼요. 토스 웹뷰가 아니면 아무 동작도 하지 않아요.
 */
export function onBackButton(handler: () => void): () => void {
  try {
    return graniteEvent.addEventListener('backEvent', {
      onEvent: handler,
      onError: () => {},
    });
  } catch {
    return () => {};
  }
}

/** 미니앱을 닫고 토스로 돌아가요. 토스 웹뷰가 아니면 아무 동작도 하지 않아요. */
export function closeApp(): void {
  try {
    void Screen.close().catch(() => {});
  } catch {
    // 토스 웹뷰 밖(로컬 개발 등)에서는 무시
  }
}
