import { defineConfig } from 'vitest/config'

// 테스트는 순수 계산 로직만 다루므로 vite.config.ts의 토스 devtools 플러그인은 불러오지 않는다
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
