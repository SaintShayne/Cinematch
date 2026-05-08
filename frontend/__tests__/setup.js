import { beforeEach } from 'vitest'

// localStorage persists across tests within a module unless cleared.
// Clearing here prevents test-ordering bugs where one test's saved state
// bleeds into the next test's assertions.
beforeEach(() => {
  localStorage.clear()
})
