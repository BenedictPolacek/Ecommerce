import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { createBrowserRouter } from 'react-router';
// The DOM version supports navigate(to, { flushSync: true }) (see useLeaveSession)
import { RouterProvider } from 'react-router/dom';
import { Toaster } from '@/components/ui/sonner';
import { createQueryClient } from './query-client';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors closeButton />
      {/* Only included in development builds */}
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
