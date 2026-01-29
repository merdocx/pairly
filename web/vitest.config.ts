import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    reporters: process.env.CI ? ['default', ['junit', { outputFile: 'test-results/junit.xml' }]] : ['default'],
  },
});
