import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router';

import { HomePage } from '@/pages/home-page.tsx';
import { StatusPage } from '@/pages/status-page.tsx';

export const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="shell">
          <header className="topbar">
            <p className="wordmark">RADPAIR</p>
            <nav aria-label="Primary">
              <NavLink to="/" end>
                Home
              </NavLink>
              <NavLink to="/status">API status</NavLink>
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/status" element={<StatusPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
