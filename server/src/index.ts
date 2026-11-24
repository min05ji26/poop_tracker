import { parseReportInput } from './input';
import { consumeQuota, type CounterStore } from './limits';
import { createGeminiModel, createMockModel, type Model } from './model';
import { buildStatsLines, buildUserPrompt, SYSTEM_PROMPT } from './prompt';
import { checkOutput } from './safety';

// AI 리포트 중계 서버. 앱 → (여기) → Gemini → 앱
// - API 키는 여기(Workers secret)에만 있다
// - 요청·응답 내용은 저장하지도, 로그로 남기지도 않는다 (토큰 수만 기록)

export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  MODEL_PROVIDER?: string; // 'mock'이면 가짜 모델
  ALLOWED_ORIGINS: string;
  USER_DAILY_LIMIT: string;
  GLOBAL_MONTHLY_LIMIT: string;
  RATE_LIMIT: CounterStore;
}

// 앱이 받는 응답. ok가 아니면 앱이 통계 기반 기본 문구를 보여준다
export type ReportResponse =
  | { ok: true; text: string }
  | { ok: false; reason: 'bad_request' | 'limit' | 'blocked' | 'error' };

const MAX_BODY_BYTES = 8 * 1024;
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-client-id',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(body: ReportResponse, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors },
  });
}

function pickModel(env: Env): Model | null {
  if (env.MODEL_PROVIDER === 'mock') return createMockModel();
  if (!env.GEMINI_API_KEY) return null;
  return createGeminiModel(env.GEMINI_API_KEY, env.GEMINI_MODEL);
}

export async function handleRequest(request: Request, env: Env, model: Model | null = pickModel(env)): Promise<Response> {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin, env);
  const url = new URL(request.url);

  // 허용 안 된 곳(다른 웹사이트 등)에서 온 요청은 거절
  if (Object.keys(cors).length === 0) return new Response('forbidden', { status: 403 });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST' || url.pathname !== '/report') return json({ ok: false, reason: 'bad_request' }, 404, cors);

  const clientId = request.headers.get('x-client-id') ?? '';
  if (!CLIENT_ID_PATTERN.test(clientId)) return json({ ok: false, reason: 'bad_request' }, 400, cors);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, reason: 'bad_request' }, 413, cors);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, reason: 'bad_request' }, 400, cors);
  }
  const input = parseReportInput(body);
  if (!input || input.totalCount === 0) return json({ ok: false, reason: 'bad_request' }, 400, cors);

  if (!model) {
    console.error('GEMINI_API_KEY가 설정되지 않았어요');
    return json({ ok: false, reason: 'error' }, 500, cors);
  }

  const quota = await consumeQuota(env.RATE_LIMIT, clientId, {
    userDaily: Number(env.USER_DAILY_LIMIT),
    globalMonthly: Number(env.GLOBAL_MONTHLY_LIMIT),
  });
  if (!quota.ok) {
    console.log(JSON.stringify({ event: 'limit', reason: quota.reason }));
    return json({ ok: false, reason: 'limit' }, 429, cors);
  }

  try {
    const startedAt = Date.now();
    const result = await model.generate(SYSTEM_PROMPT, buildUserPrompt(input));
    console.log(
      JSON.stringify({ event: 'generated', ms: Date.now() - startedAt, inputTokens: result.inputTokens, outputTokens: result.outputTokens })
    );

    const check = checkOutput(result.text, buildStatsLines(input).join('\n'));
    if (!check.ok) {
      // 어떤 규칙에 걸렸는지만 남기고 문장 내용은 남기지 않는다
      console.log(JSON.stringify({ event: 'blocked', reason: check.reason }));
      return json({ ok: false, reason: 'blocked' }, 200, cors);
    }
    return json({ ok: true, text: check.text }, 200, cors);
  } catch (e) {
    console.error(JSON.stringify({ event: 'model_error', message: e instanceof Error ? e.message : 'unknown' }));
    return json({ ok: false, reason: 'error' }, 502, cors);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
