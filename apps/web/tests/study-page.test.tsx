import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { jsonResponse } from './mocks/http.ts';
import { kneeImages, kneeReport, kneeStudy, studyId } from './mocks/reports.ts';
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

it('keeps study details visible when only the report request fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === `/api/studies/${kneeStudy.id}`) {
        return jsonResponse(kneeStudy);
      }
      if (url.pathname === `/api/studies/${kneeStudy.id}/images`) {
        return jsonResponse({ images: [] });
      }
      if (url.pathname === `/api/studies/${kneeStudy.id}/report`) {
        return jsonResponse({ error: { code: 'internal_error', message: 'Boom' } }, 500);
      }
      return jsonResponse({ error: { code: 'not_found', message: 'Not found' } }, 404);
    })
  );
  renderApp(`/studies/${kneeStudy.id}`);

  expect(await screen.findByRole('heading', { name: 'Nora Kim' })).toBeInTheDocument();
  expect(await screen.findByText('The report could not be loaded.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Findings' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to worklist' })).toBeInTheDocument();
});

it('recovers the report workspace after a failed report load', async () => {
  const user = userEvent.setup();
  let reportFails = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === `/api/studies/${kneeStudy.id}`) {
        return jsonResponse(kneeStudy);
      }
      if (url.pathname === `/api/studies/${kneeStudy.id}/images`) {
        return jsonResponse({ images: kneeImages });
      }
      if (url.pathname === `/api/studies/${kneeStudy.id}/report`) {
        if (reportFails) {
          return jsonResponse({}, 503);
        }
        return jsonResponse(kneeReport);
      }
      return jsonResponse({ error: { code: 'not_found', message: 'Not found' } }, 404);
    })
  );
  renderApp(`/studies/${kneeStudy.id}`);

  expect(await screen.findByText('The database is unavailable.')).toBeInTheDocument();
  reportFails = false;
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByRole('heading', { name: 'Findings' })).toBeInTheDocument();
});
