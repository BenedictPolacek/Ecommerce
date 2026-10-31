import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Unmount rendered components and restore stubbed globals (fetch) after each test
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
