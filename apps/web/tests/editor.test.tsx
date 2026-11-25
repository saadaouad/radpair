import type { ReportResponse } from '@repo/contracts';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { ReportWorkspace } from '@/components/report/editor.tsx';

import { jsonResponse } from './mocks/http.ts';
import { emptyReport, kneeImages, kneeReport, otherTabDocument } from './mocks/reports.ts';
import { renderPage } from './render.tsx';

const saved = (report: ReportResponse, version: number, content: unknown): ReportResponse => ({
  ...report,
  version,
  status: 'draft',
  content: content as ReportResponse['content']
});

const stubReportSaves = () => {
  const saves = { count: 0 };
  const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
    if ((init?.method ?? 'GET') !== 'PUT') {
      return jsonResponse({});
    }

    saves.count += 1;
    const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
    if (saves.count === 2) {
      return jsonResponse(
        {
          error: {
            code: 'version_conflict',
            message: 'This report was updated somewhere else.',
            details: { version: 4, status: 'draft', content: otherTabDocument }
          }
        },
        409
      );
    }

    return jsonResponse(saved(kneeReport, body.expectedVersion + 1, body.content));
  });
  vi.stubGlobal('fetch', fetchMock);
  return saves;
};

it('restores the report text and its key image', async () => {
  renderPage(
    <ReportWorkspace images={kneeImages} onSigned={() => {}} readOnly={false} report={kneeReport} />
  );

  expect(screen.getByRole('heading', { name: 'Findings' })).toBeInTheDocument();
  expect(screen.getByText('Marrow edema in the lateral femoral condyle.')).toBeInTheDocument();
  expect(await screen.findByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle'
  );
  expect(screen.getByRole('button', { name: /Image 1/ })).toHaveAttribute('aria-pressed', 'true');
});

it('inserts a key image and removes it', async () => {
  const user = userEvent.setup();
  renderPage(
    <ReportWorkspace
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={emptyReport}
    />
  );

  await user.click(screen.getByRole('button', { name: /Image 2/ }));
  await user.click(screen.getByRole('button', { name: 'Insert image' }));

  expect(screen.getByRole('textbox', { name: 'Caption' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Image 2/ })).toHaveAttribute('aria-pressed', 'true');

  await user.click(screen.getByRole('button', { name: 'Remove' }));

  expect(screen.queryByRole('textbox', { name: 'Caption' })).not.toBeInTheDocument();
});

it('saves a caption edit and keeps the local text when another tab wins', async () => {
  const user = userEvent.setup();
  const saves = stubReportSaves();

  renderPage(
    <ReportWorkspace images={kneeImages} onSigned={() => {}} readOnly={false} report={kneeReport} />
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' reviewed');
  await waitFor(() => expect(saves.count).toBe(1));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle reviewed'
  );

  await user.type(screen.getByRole('textbox', { name: 'Caption' }), ' again');
  await waitFor(() => expect(saves.count).toBe(2));
  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle reviewed again'
  );
  expect(screen.getByRole('button', { name: 'Load latest' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Overwrite with mine' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Load latest' }));

  expect(await screen.findByText('From the other tab.')).toBeInTheDocument();
  expect(screen.getByText('Saved')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Caption' })).not.toBeInTheDocument();
});

it('overwrites the other tab only when asked', async () => {
  const user = userEvent.setup();
  const saves = stubReportSaves();

  renderPage(
    <ReportWorkspace images={kneeImages} onSigned={() => {}} readOnly={false} report={kneeReport} />
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' reviewed');
  await waitFor(() => expect(saves.count).toBe(1));
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Caption' }), ' again');
  await waitFor(() => expect(saves.count).toBe(2));
  expect(await screen.findByText('Conflict')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Overwrite with mine' }));

  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle reviewed again'
  );
  expect(saves.count).toBe(3);
});

it('keeps a signed report read-only', async () => {
  renderPage(
    <ReportWorkspace
      images={kneeImages}
      onSigned={() => {}}
      readOnly
      report={{ ...kneeReport, status: 'signed', signedAt: '2026-11-18T12:00:00.000Z' }}
    />
  );

  expect(
    screen.getByText('This report is signed and can no longer be changed.')
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sign' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Insert image' })).toBeDisabled();
  expect(await screen.findByRole('textbox', { name: 'Caption' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
});
