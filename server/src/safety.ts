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
  '건강',
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

export const MAX_LINE_LENGTH = 40;

// 한 줄 평 검사. 통과하면 앞뒤 따옴표를 뗀 문장을 돌려준다
export function checkOutput(
  text: string,
  statsText: string
): { ok: true; text: string } | { ok: false; reason: string } {
  const line = text.trim().replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '').trim();
  if (line.length === 0) return { ok: false, reason: 'empty' };
  if (/\n/.test(line)) return { ok: false, reason: 'multi_line' };
  if ([...line].length > MAX_LINE_LENGTH) return { ok: false, reason: 'too_long' };
  const banned = findBannedWord(line);
  if (banned) return { ok: false, reason: `banned:${banned}` };
  // 한 줄 평에는 숫자를 쓰지 않는다 (숫자는 결과지 표에). 혹시 쓰면 통계에 있는 숫자인지라도 확인
  if (/\d/.test(line)) {
    const unknown = findUnknownNumber(line, statsText);
    return { ok: false, reason: unknown ? `number:${unknown}` : 'has_number' };
  }
  return { ok: true, text: line };
}
