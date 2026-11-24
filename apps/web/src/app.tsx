import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserRouter, NavLink, Outlet, RouterProvider } from 'react-router';

import { StatusPage } from '@/pages/status-page.tsx';
import { StudyPage } from '@/pages/study-page.tsx';
import { WorklistPage } from '@/pages/worklist-page.tsx';

const WorkspaceShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-6">
          <NavLink className="text-sm font-semibold tracking-[0.16em]" to="/">
            RADPAIR
          </NavLink>
          <nav aria-label="Primary">
            <NavLink
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline aria-[current=page]:text-foreground aria-[current=page]:underline"
              to="/status"
            >
              API status
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <WorkspaceShell />,
    children: [
      { index: true, element: <WorklistPage /> },
      { path: 'studies/:id', element: <StudyPage /> },
      { path: 'status', element: <StatusPage /> }
    ]
  }
]);

export const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
