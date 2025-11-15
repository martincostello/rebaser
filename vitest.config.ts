import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json', 'text'],
      include: ['src/**/*.ts'],
    },
    reporters: ['default', 'github-actions'],
  },
});
