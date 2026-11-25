import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { StudyPage } from '@/pages/study-page.tsx';
import { WorklistPage } from '@/pages/worklist-page.tsx';

const client = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

export const renderPage = (element: ReactNode) => {
  const router = createMemoryRouter([{ path: '/', element }], { initialEntries: ['/'] });

  render(
    <QueryClientProvider client={client()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

export const renderApp = (path: string) => {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WorklistPage /> },
      { path: '/studies/:id', element: <StudyPage /> }
    ],
    { initialEntries: [path] }
  );

  render(
    <QueryClientProvider client={client()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
