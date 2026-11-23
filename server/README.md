# AI 리포트 중계 서버 (Cloudflare Workers)

앱 → 이 서버 → Gemini → 앱. API 키는 **이 서버에만** 있고 앱 코드에는 절대 넣지 않는다.

## 키 넣는 법

키는 채팅·코드·`wrangler.toml` 어디에도 붙여넣지 말 것. 아래 두 곳에만 넣는다.

### 1. 로컬에서 시험할 때: `server/.dev.vars`
```
cp server/.dev.vars.example server/.dev.vars
```
`server/.dev.vars`를 열어 `GEMINI_API_KEY=` 뒤에 키를 붙여넣는다. 이 파일은 `.gitignore`에 있어 git에 안 올라간다.

실행: Claude Code에서 `ai-relay-gemini` 미리보기로 띄우거나 `cd server && npm run dev` (http://localhost:8787)

### 2. 실제 배포할 때: Workers secret
```
cd server
npx wrangler login
npx wrangler kv namespace create RATE_LIMIT   # 나온 id를 wrangler.toml의 REPLACE_WITH_KV_NAMESPACE_ID 자리에
npx wrangler secret put GEMINI_API_KEY         # 프롬프트가 뜨면 키 붙여넣기
npm run deploy
```

## 비용 상한 (wrangler.toml `[vars]`)
- `USER_DAILY_LIMIT` (기본 3): 한 사람이 하루에 부를 수 있는 횟수
- `GLOBAL_MONTHLY_LIMIT` (기본 600): 서버 전체가 한 달(한국 시간)에 부를 수 있는 횟수. 넘으면 모델을 아예 안 부른다
- Google 쪽 예산 알림은 **알림만** 보내고 결제를 멈추진 않는다. 실제로 막는 건 이 상한이다

## 하는 일
- `POST /report` + 헤더 `x-client-id` + 앱이 계산한 통계 JSON
- 허용 origin(토스 실서비스·QR 테스트)만 받음, 자유 텍스트(메모)는 받지 않음
- 답에서 금지어(진단·병원·변비 등)나 통계에 없는 숫자가 나오면 `{ ok: false, reason: 'blocked' }` → 앱은 기본 문구 사용
- 요청·응답 내용은 저장·로그하지 않음 (토큰 수와 차단 사유만 로그)

## 테스트
```
cd server && npm test
```
