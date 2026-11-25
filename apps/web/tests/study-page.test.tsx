import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { jsonResponse } from './mocks/http.ts';
import { studyId } from './mocks/reports.ts';
import { renderApp } from './render.tsx';

it('shows a readable error when a study cannot be opened', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      jsonResponse({ error: { code: 'not_found', message: 'Study not found.' } }, 404)
    )
  );
  renderApp(`/studies/${studyId}`);

  expect(await screen.findByText('This study is not on the worklist.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
