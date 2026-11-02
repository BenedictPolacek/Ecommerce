import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The first render in a test file loads all modules and can take seconds on a busy machine or
// CI runner. findBy*/waitFor would give up after the default 1 s and fail at random (flaky).
configure({ asyncUtilTimeout: 5000 });

// jsdom has no layout engine and therefore no ResizeObserver, which Radix components
// (radio group, checkbox) use to measure themselves. A no-op version is enough for tests.
// Assigned directly (not vi.stubGlobal), so unstubAllGlobals below does not remove it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Unmount rendered components and restore stubbed globals (fetch) after each test
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
