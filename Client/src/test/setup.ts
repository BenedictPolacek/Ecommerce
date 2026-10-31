import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The first render in a test file loads all modules and can take seconds on a busy machine or
// CI runner. findBy*/waitFor would give up after the default 1 s and fail at random (flaky).
configure({ asyncUtilTimeout: 5000 });

// Unmount rendered components and restore stubbed globals (fetch) after each test
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
