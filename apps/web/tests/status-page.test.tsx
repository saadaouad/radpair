import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { StatusPage } from '@/pages/status-page.tsx';

import { jsonResponse } from './mocks/http.ts';
import { renderPage } from './render.tsx';

it('offers another try when the API is down', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({}, 503));
  vi.stubGlobal('fetch', fetchMock);
  renderPage(<StatusPage />);

  expect(
    await screen.findByText('The API is unavailable. Your place in the app is unchanged.')
  ).toBeInTheDocument();

  fetchMock.mockImplementation(async () =>
    jsonResponse({ status: 'ok', database: 'up', timestamp: '2026-11-24T16:00:00.000Z' })
  );
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(
    await screen.findByText('The API is responding and the database is up.')
  ).toBeInTheDocument();
});
