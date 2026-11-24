// AI 한 줄 평 요청. 중계 서버 주소는 비밀값이 아니라 환경 변수로 둔다 (API 키는 서버에만 있음)
// 주소가 없거나, 실패하거나, 15초를 넘기면 null → 화면은 기본 한 줄 평을 쓴다

const RELAY_URL = import.meta.env.VITE_AI_RELAY_URL as string | undefined;
export const AI_TIMEOUT_MS = 15_000;

export async function requestAiLine(
  input: unknown,
  clientId: string,
  { fetcher = fetch, timeoutMs = AI_TIMEOUT_MS, relayUrl = RELAY_URL }: { fetcher?: typeof fetch; timeoutMs?: number; relayUrl?: string } = {}
): Promise<string | null> {
  if (!relayUrl) return null;
  try {
    const res = await fetcher(`${relayUrl.replace(/\/$/, '')}/report`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-id': clientId },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = (await res.json()) as { ok: boolean; text?: string };
    return body.ok && typeof body.text === 'string' && body.text.trim() ? body.text.trim() : null;
  } catch {
    return null;
  }
}
