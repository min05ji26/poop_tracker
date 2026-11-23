// 모델 답을 앱에 보내기 전 마지막 검사. 걸리면 앱은 통계 기반 기본 문구를 쓴다

// 건강 상태를 단정하거나 의료 행위를 권하는 표현 (CLAUDE.md 핵심 원칙)
export const BANNED_WORDS = [
  '진단',
  '질병',
  '질환',
  '증상',
  '병원',
  '의사',
  '치료',
  '처방',
  '복용',
  '약을',
  '약국',
  '검사',
  '변비',
  '설사',
  '장염',
  '과민성',
  '대장암',
  '위암',
  '비정상',
  '정상이',
  '정상적',
  '이상해',
  '이상이 있',
  '위험',
  '심각',
];

export function findBannedWord(text: string): string | null {
  const compact = text.replace(/\s+/g, '');
  return BANNED_WORDS.find((w) => compact.includes(w.replace(/\s+/g, ''))) ?? null;
}

// 답에 나온 숫자가 전부 [통계]에 있던 숫자인지 확인 (LLM이 숫자를 지어내지 않게)
export function findUnknownNumber(text: string, statsText: string): string | null {
  const allowed = new Set(statsText.match(/\d+(?:\.\d+)?/g) ?? []);
  const used = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return used.find((n) => !allowed.has(n)) ?? null;
}

export function checkOutput(text: string, statsText: string): { ok: true } | { ok: false; reason: string } {
  if (text.trim().length === 0) return { ok: false, reason: 'empty' };
  if (text.length > 600) return { ok: false, reason: 'too_long' };
  const banned = findBannedWord(text);
  if (banned) return { ok: false, reason: `banned:${banned}` };
  const unknown = findUnknownNumber(text, statsText);
  if (unknown) return { ok: false, reason: `number:${unknown}` };
  return { ok: true };
}
