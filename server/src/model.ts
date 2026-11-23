// 모델 호출 부분만 분리. 다른 모델로 바꾸거나 테스트할 때 여기만 교체한다

export interface ModelResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface Model {
  generate(system: string, user: string): Promise<ModelResult>;
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function createGeminiModel(apiKey: string, model: string, fetcher: typeof fetch = fetch): Model {
  return {
    async generate(system, user) {
      const res = await fetcher(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      });
      if (!res.ok) throw new Error(`gemini ${res.status}`);

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
      };
      const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
      const usage = data.usageMetadata;
      return {
        text,
        inputTokens: usage?.promptTokenCount,
        // 생각(thinking) 토큰도 출력 요금으로 청구되므로 합쳐서 본다
        outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
      };
    },
  };
}

// 키 없이 로컬·테스트에서 쓰는 가짜 모델. [통계]의 숫자만 그대로 옮긴다
export function createMockModel(): Model {
  return {
    async generate(_system, user) {
      const total = /총 기록: (\d+)회/.exec(user)?.[1] ?? '0';
      const weekly = /주 평균: ([\d.]+)회/.exec(user)?.[1] ?? '0';
      return {
        text: `이번 달은 총 ${total}번 기록했어요! 일주일에 ${weekly}번꼴로 꾸준히 찾아와 줬네요. 다음 달에도 같이 기록해요 💩`,
        inputTokens: 0,
        outputTokens: 0,
      };
    },
  };
}
