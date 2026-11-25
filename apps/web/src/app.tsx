import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createBrowserRouter, NavLink, Outlet, RouterProvider, useLocation } from 'react-router';

import { ErrorBoundary, NotFound, RouteError } from '@/components/error-boundary.tsx';
import { StudyPage } from '@/pages/study-page.tsx';
import { WorklistPage } from '@/pages/worklist-page.tsx';

const PageBoundary = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;
};

const WorkspaceShell = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-[#2e2e2e]">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-4 lg:px-6">
          <NavLink className="text-sm font-semibold tracking-[0.16em]" to="/">
            RADPAIR
          </NavLink>
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
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <PageBoundary>
            <WorklistPage />
          </PageBoundary>
        )
      },
      {
        path: 'studies/:id',
        element: (
          <PageBoundary>
            <StudyPage />
          </PageBoundary>
        )
      },
      { path: '*', element: <NotFound /> }
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
