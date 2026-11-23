// 호출 횟수 제한 = 비용 상한. 모델을 부르기 "전에" 세서, 넘으면 아예 호출하지 않는다
// KV는 동시에 들어온 요청을 완벽히 막지는 못하지만(최종 일관성), 사용자 수가 적어 이 정도면 충분

export interface CounterStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export type LimitResult = { ok: true } | { ok: false; reason: 'user_daily' | 'global_monthly' };

function kstParts(now: Date): { day: string; month: string } {
  // 한국 시간 기준으로 하루·한 달을 나눈다
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return { day: kst.slice(0, 10), month: kst.slice(0, 7) };
}

export async function consumeQuota(
  store: CounterStore,
  clientId: string,
  limits: { userDaily: number; globalMonthly: number },
  now: Date = new Date()
): Promise<LimitResult> {
  const { day, month } = kstParts(now);
  const userKey = `u:${clientId}:${day}`;
  const globalKey = `g:${month}`;

  const [userCount, globalCount] = await Promise.all([store.get(userKey), store.get(globalKey)]);
  const u = Number(userCount ?? 0);
  const g = Number(globalCount ?? 0);

  if (g >= limits.globalMonthly) return { ok: false, reason: 'global_monthly' };
  if (u >= limits.userDaily) return { ok: false, reason: 'user_daily' };

  await Promise.all([
    store.put(userKey, String(u + 1), { expirationTtl: 2 * 24 * 60 * 60 }),
    store.put(globalKey, String(g + 1), { expirationTtl: 40 * 24 * 60 * 60 }),
  ]);
  return { ok: true };
}
