import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/routes';
import type { User } from '@/features/auth/types';

/** Renders the real app routes at the given URL, with a fresh query cache */
export function renderRoute(path: string) {
  const queryClient = createQueryClient();
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return { router, queryClient };
}

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: '6f1c2a3e-1111-4c8b-9a1d-2b3c4d5e6f70',
  email: 'jane@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  role: 'customer',
  email_verified_at: '2026-10-01T10:00:00.000Z',
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});
