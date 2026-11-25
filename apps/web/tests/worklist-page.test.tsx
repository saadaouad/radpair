import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { jsonResponse } from './mocks/http.ts';
import { kneeImages, kneeReport, kneeStudy, studies } from './mocks/reports.ts';
import { renderApp } from './render.tsx';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname === '/api/studies') {
      return jsonResponse({ studies });
    }
    if (url.pathname === `/api/studies/${kneeStudy.id}`) {
      return jsonResponse(kneeStudy);
    }
    if (url.pathname === `/api/studies/${kneeStudy.id}/images`) {
      return jsonResponse({ images: kneeImages });
    }
    if (url.pathname === `/api/studies/${kneeStudy.id}/report`) {
      return jsonResponse(kneeReport);
    }
    return jsonResponse({ error: { code: 'not_found', message: 'Not found' } }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});

it('renders the worklist and opens a study', async () => {
  const user = userEvent.setup();
  renderApp('/');

  expect(await screen.findByRole('heading', { name: 'Worklist' })).toBeInTheDocument();
  expect(await screen.findAllByText('Amelia Crowe')).not.toHaveLength(0);
  expect(screen.getAllByText('Nora Kim').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Leo Hart').length).toBeGreaterThan(0);

  await user.click(screen.getByRole('radio', { name: 'Unread' }));
  expect(screen.getAllByText('Amelia Crowe').length).toBeGreaterThan(0);
  expect(screen.queryByText('Nora Kim')).not.toBeInTheDocument();

  await user.click(screen.getByRole('radio', { name: 'All' }));
  await user.type(screen.getByRole('textbox', { name: 'Search' }), 'knee');
  expect(screen.getAllByText('Nora Kim').length).toBeGreaterThan(0);
  expect(screen.queryByText('Amelia Crowe')).not.toBeInTheDocument();

  await user.clear(screen.getByRole('textbox', { name: 'Search' }));
  await user.click(screen.getAllByRole('link', { name: /Nora Kim/ })[0] as HTMLElement);

  expect(await screen.findByRole('heading', { name: 'Nora Kim' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Findings' })).toBeInTheDocument();
  expect(await screen.findByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle'
  );
});

it('lets the reader try the worklist again after a failed load', async () => {
  const user = userEvent.setup();
  fetchMock.mockImplementation(async () => jsonResponse({}, 500));
  renderApp('/');

  expect(await screen.findByText('The worklist could not be loaded.')).toBeInTheDocument();

  fetchMock.mockImplementation(async () => jsonResponse({ studies }));
  await user.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findAllByText('Nora Kim')).not.toHaveLength(0);
});
