import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app.tsx';
import { ErrorBoundary } from '@/components/error-boundary.tsx';
import '@/index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element is missing');
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary message="The workspace could not be shown.">
      <App />
    </ErrorBoundary>
  </StrictMode>
);
