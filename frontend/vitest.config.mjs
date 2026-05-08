import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // jsdom gives tests a real browser-like DOM + localStorage + window
    environment: 'jsdom',
    // Clears localStorage + resets mocks between tests
    setupFiles: ['./__tests__/setup.js'],
    // describe / it / expect available without importing from 'vitest'
    globals: true,
  },
})
