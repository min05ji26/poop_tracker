import { beforeEach, vi } from 'vitest';

// 토스 Storage는 토스 앱 밖에서 동작하지 않으므로 테스트에서는 메모리 저장소로 대체한다
const memoryStore = new Map<string, string>();

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {
    getItem: async (key: string) => memoryStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    removeItem: async (key: string) => {
      memoryStore.delete(key);
    },
    clearItems: async () => {
      memoryStore.clear();
    },
  },
}));

beforeEach(() => {
  memoryStore.clear();
});
