import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { createQueryClient } from './query-client';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* Only included in development builds */}
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </QueryClientProvider>
  );
}
