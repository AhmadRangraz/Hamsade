import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['apps/municipality/domain/**/*.test.ts'] },
});
