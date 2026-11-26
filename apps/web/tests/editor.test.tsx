import type { ReportResponse } from '@repo/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';

import { NodeSelection } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

import { ReportWorkspace } from '@/components/report/editor.tsx';
import { KeyImage } from '@/components/report/key-image.ts';
import { studyImageDragType } from '@/components/report/study-image-drag.ts';

import { jsonResponse } from './mocks/http.ts';
import {
  emptyReport,
  kneeBodyPart,
  kneeImages,
  kneeReport,
  otherTabDocument,
  secondImageId
} from './mocks/reports.ts';
import { renderPage } from './render.tsx';

class DragData {
  effectAllowed = 'all';
  dropEffect = 'none';
  private readonly values = new Map<string, string>();

  get types() {
    return [...this.values.keys()];
  }

  setData(type: string, value: string) {
    this.values.set(type, value);
  }

  getData(type: string) {
    return this.values.get(type) ?? '';
  }
}

afterEach(() => {
  cleanup();
});

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
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  expect(screen.getByRole('heading', { name: 'Findings' })).toBeInTheDocument();
  expect(screen.getByText('Marrow edema in the lateral femoral condyle.')).toBeInTheDocument();
  expect(await screen.findByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle'
  );
  expect(document.querySelector('[data-drag-handle]')).not.toBeNull();
  expect(screen.getByRole('button', { name: /Image 1/ })).toHaveAttribute('aria-pressed', 'true');
});

const follows = (first: HTMLElement, second: HTMLElement) =>
  (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

it('moves a key image up and then down again', async () => {
  const user = userEvent.setup();
  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  const heading = () => screen.getByRole('heading', { name: 'Findings' });
  const paragraph = () => screen.getByText('Marrow edema in the lateral femoral condyle.');
  const caption = () => screen.getByRole('textbox', { name: 'Caption' });

  expect(await screen.findByRole('textbox', { name: 'Caption' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Move image down' })).toBeDisabled();
  expect(follows(heading(), paragraph())).toBe(true);
  expect(follows(paragraph(), caption())).toBe(true);

  await user.click(screen.getByRole('button', { name: 'Move image up' }));
  expect(follows(heading(), caption())).toBe(true);
  expect(follows(caption(), paragraph())).toBe(true);

  await user.click(screen.getByRole('button', { name: 'Move image up' }));
  expect(screen.getByRole('button', { name: 'Move image up' })).toBeDisabled();
  expect(follows(caption(), heading())).toBe(true);
  expect(follows(heading(), paragraph())).toBe(true);

  await user.click(screen.getByRole('button', { name: 'Move image down' }));
  expect(follows(heading(), caption())).toBe(true);
  expect(follows(caption(), paragraph())).toBe(true);
});

it('inserts a key image and removes it', async () => {
  const user = userEvent.setup();
  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={emptyReport}
    />
  );

  await user.click(screen.getByRole('button', { name: /Image 2/ }));
  expect(screen.getByRole('dialog', { name: 'Image 2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Previous' }));
  expect(screen.getByRole('dialog', { name: 'Image 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Next' }));
  const dialog = screen.getByRole('dialog', { name: 'Image 2' });
  await user.click(within(dialog).getByRole('button', { name: 'Insert image' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  expect(screen.getByRole('textbox', { name: 'Caption' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Image 2/ })).toHaveAttribute('aria-pressed', 'true');

  await user.click(screen.getByRole('button', { name: 'Remove image from report' }));

  expect(screen.queryByRole('textbox', { name: 'Caption' })).not.toBeInTheDocument();
});

const reportEditor = (content: ReportResponse['content']) => {
  const element = document.createElement('div');
  document.body.append(element);
  return new Editor({
    element,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        horizontalRule: false,
        trailingNode: false,
        link: false,
        strike: false,
        underline: false,
        heading: { levels: [1, 2, 3] }
      }),
      KeyImage.configure({ images: [] })
    ],
    content
  });
};

const blockPosition = (editor: Editor, type: string) => {
  let position = -1;
  editor.state.doc.descendants((node, pos) => {
    if (position === -1 && node.type.name === type) {
      position = pos;
    }
  });
  return position;
};

const pressKey = (editor: Editor, key: string) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  return editor.view.someProp('handleKeyDown', (handle) => handle(editor.view, event)) === true;
};

it('keeps a key image when the text beside it is deleted', () => {
  const editor = reportEditor(kneeReport.content);
  const text = 'Marrow edema in the lateral femoral condyle.';
  const paragraph = blockPosition(editor, 'paragraph');

  editor.commands.setTextSelection(paragraph + 1 + text.length);
  pressKey(editor, 'Delete');
  expect(editor.getJSON(), JSON.stringify(editor.getJSON())).toMatchObject({
    content: expect.arrayContaining([expect.objectContaining({ type: 'keyImage' })])
  });
  expect(editor.getText()).toContain(text);
  expect(editor.state.selection).toBeInstanceOf(NodeSelection);

  editor.commands.setTextSelection({ from: paragraph + 1, to: paragraph + 1 + text.length });
  expect(pressKey(editor, 'Backspace')).toBe(true);
  expect(editor.getText()).not.toContain(text);
  expect(blockPosition(editor, 'keyImage')).toBeGreaterThan(-1);

  const image = blockPosition(editor, 'keyImage');
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, image)));
  expect(pressKey(editor, 'Backspace')).toBe(true);
  expect(blockPosition(editor, 'keyImage')).toBe(-1);
  editor.destroy();
});

it('drops a study image into the report and refuses a second copy', async () => {
  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={emptyReport}
    />
  );

  const thumb = screen.getByRole('button', { name: /Image 2/ });
  expect(thumb).toHaveAttribute('draggable', 'true');
  const dataTransfer = new DragData();
  fireEvent.dragStart(thumb, { dataTransfer });
  fireEvent.dragEnd(thumb);
  fireEvent.click(thumb);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(dataTransfer.getData(studyImageDragType)).toBe(secondImageId);

  const report = screen.getByRole('textbox', { name: 'Report' });
  const originalPosAtCoords = EditorView.prototype.posAtCoords;
  EditorView.prototype.posAtCoords = () => ({ pos: 1, inside: -1 });
  try {
    fireEvent.drop(report, { dataTransfer });

    expect(await screen.findByRole('textbox', { name: 'Caption' })).toHaveValue('');
    expect(
      await screen.findByRole('button', { name: /Image 2, already in the report/ })
    ).not.toHaveAttribute('draggable', 'true');

    const duplicate = new DragData();
    duplicate.setData(studyImageDragType, secondImageId);
    fireEvent.drop(report, { dataTransfer: duplicate });
    expect(await screen.findByText('This image is already in the report.')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'Caption' })).toHaveLength(1);

    const foreign = new DragData();
    foreign.setData(studyImageDragType, 'not-in-this-study');
    fireEvent.drop(report, { dataTransfer: foreign });
    expect(screen.getAllByRole('textbox', { name: 'Caption' })).toHaveLength(1);
  } finally {
    EditorView.prototype.posAtCoords = originalPosAtCoords;
  }
});

it('saves a caption edit and keeps the local text when another tab wins', async () => {
  const user = userEvent.setup();
  const saves = stubReportSaves();
  await new Promise((resolve) => setTimeout(resolve, 900));

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  await screen.findByRole('textbox', { name: 'Caption' });
  saves.count = 0;

  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Caption' }), ' reviewed');
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));
  await waitFor(() => expect(saves.count).toBe(1));
  expect(screen.getByText('Saved')).toBeInTheDocument();
  expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle reviewed'
  );

  await user.type(screen.getByRole('textbox', { name: 'Caption' }), ' again');
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));
  await waitFor(() => expect(saves.count).toBe(2));
  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle reviewed again'
  );
  expect(screen.getByRole('button', { name: 'Load latest' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Overwrite with mine' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Load latest' }));

  expect(await screen.findByText('From the other tab.')).toBeInTheDocument();
  expect(screen.queryByText('Conflict')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Caption' })).not.toBeInTheDocument();
});

it('overwrites the other tab only when asked', async () => {
  const user = userEvent.setup();
  const gate = { allow: false };
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? 'GET') !== 'PUT') {
        return jsonResponse({});
      }
      const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
      if (!gate.allow && JSON.stringify(body.content).includes('again')) {
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
    })
  );

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  const caption = await screen.findByRole('textbox', { name: 'Caption' });
  await user.type(caption, ' reviewed');
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  fireEvent.focusOut(caption);
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  await user.type(caption, ' again');
  expect(caption).toHaveValue('Edema in the lateral femoral condyle reviewed again');
  fireEvent.focusOut(caption);
  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  expect(caption).toHaveValue('Edema in the lateral femoral condyle reviewed again');

  gate.allow = true;
  await user.click(screen.getByRole('button', { name: 'Overwrite with mine' }));

  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.queryByText('Conflict')).not.toBeInTheDocument();
  expect(caption).toHaveValue('Edema in the lateral femoral condyle reviewed again');
});

it('keeps a signed report read-only', async () => {
  const user = userEvent.setup();
  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly
      report={{ ...kneeReport, status: 'signed', signedAt: '2026-11-18T12:00:00.000Z' }}
    />
  );

  expect(
    screen.getByText('This report is signed and can no longer be changed.')
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sign report' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Image 2/ })).not.toHaveAttribute('draggable', 'true');
  expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
  await screen.findByRole('button', { name: 'View image 1' });
  const keyImage = document.querySelector('[data-key-image]');
  expect(keyImage).toHaveTextContent('Edema in the lateral femoral condyle');
  expect(screen.queryByRole('textbox', { name: 'Caption' })).not.toBeInTheDocument();
  expect(document.querySelector('[data-drag-handle]')).toBeNull();
  await user.click(screen.getByRole('button', { name: /Image 2/ }));
  expect(
    within(screen.getByRole('dialog', { name: 'Image 2' })).getByRole('button', {
      name: 'Insert image'
    })
  ).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Remove image from report' })
  ).not.toBeInTheDocument();
});

it('keeps Saved on screen and shows Saving... while a change is stored', async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? 'GET') !== 'PUT') {
        return jsonResponse({});
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
      const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
      return jsonResponse(saved(kneeReport, body.expectedVersion + 1, body.content));
    })
  );

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' slow');
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));
  expect(screen.getByText('Saving...')).toBeInTheDocument();
  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
});

it('keeps a failed save on screen until Retry succeeds', async () => {
  const user = userEvent.setup();
  let puts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? 'GET') !== 'PUT') {
        return jsonResponse({});
      }
      puts += 1;
      if (puts === 1) {
        return jsonResponse(
          {
            error: {
              code: 'validation_error',
              message: 'The report could not be saved.'
            }
          },
          400
        );
      }
      const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
      return jsonResponse(saved(kneeReport, body.expectedVersion + 1, body.content));
    })
  );

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' failed');
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));

  expect(await screen.findByText('Failed to save')).toBeInTheDocument();
  expect(screen.getByText('The report could not be saved.')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle failed'
  );

  await user.click(screen.getByRole('button', { name: 'Retry' }));

  expect(await screen.findByText('Saved')).toBeInTheDocument();
  expect(screen.queryByText('Failed to save')).not.toBeInTheDocument();
});

it('saves the report before it leaves the page', async () => {
  const user = userEvent.setup();
  let releaseSave = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let puts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? 'GET') !== 'PUT') {
        return jsonResponse({});
      }
      puts += 1;
      await gate;
      const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
      return jsonResponse(saved(kneeReport, body.expectedVersion + 1, body.content));
    })
  );
  const router = createMemoryRouter(
    [
      { path: '/', element: <h1>Worklist</h1> },
      {
        path: '/studies/:id',
        element: (
          <>
            <Link to="/">Back to worklist</Link>
            <ReportWorkspace
              bodyPart={kneeBodyPart}
              images={kneeImages}
              onSigned={() => {}}
              readOnly={false}
              report={kneeReport}
            />
          </>
        )
      }
    ],
    { initialEntries: [`/studies/${kneeReport.id}`] }
  );

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' leaving');
  await user.click(screen.getByRole('link', { name: 'Back to worklist' }));

  expect(screen.queryByRole('heading', { name: 'Worklist' })).not.toBeInTheDocument();
  expect(puts).toBe(1);
  releaseSave();
  expect(await screen.findByRole('heading', { name: 'Worklist' })).toBeInTheDocument();
});

it('keeps saving when the page closes during a request', async () => {
  const user = userEvent.setup();
  let releaseSave = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  const requests: boolean[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async (_input, init) => {
      if ((init?.method ?? 'GET') !== 'PUT') {
        return jsonResponse({});
      }
      requests.push(init?.keepalive === true);
      if (init?.keepalive !== true) {
        await gate;
      }
      const body = JSON.parse(String(init?.body)) as { content: unknown; expectedVersion: number };
      return jsonResponse(saved(kneeReport, body.expectedVersion + 1, body.content));
    })
  );

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' bye');
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));
  await waitFor(() => expect(requests).toEqual([false]));
  window.dispatchEvent(new Event('pagehide'));
  await waitFor(() => expect(requests).toEqual([false, true]));
  releaseSave();
});

const reportAfterLeaving: ReportResponse = {
  ...kneeReport,
  version: kneeReport.version + 1,
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Updated after leaving.' }]
      }
    ]
  }
};

const ReopenHost = () => {
  const [report, setReport] = useState(kneeReport);
  return (
    <>
      <button onClick={() => setReport(reportAfterLeaving)} type="button">
        Refresh report
      </button>
      <ReportWorkspace
        bodyPart={kneeBodyPart}
        images={kneeImages}
        onSigned={() => {}}
        readOnly={false}
        report={report}
      />
    </>
  );
};

it('shows the saved report when it is opened again', async () => {
  const user = userEvent.setup();
  renderPage(<ReopenHost />);

  expect(
    await screen.findByText('Marrow edema in the lateral femoral condyle.')
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Refresh report' }));

  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Load latest' }));
  expect(await screen.findByText('Updated after leaving.')).toBeInTheDocument();
});

it('keeps typed text when another report arrives', async () => {
  const user = userEvent.setup();
  renderPage(<ReopenHost />);

  const caption = await screen.findByRole('textbox', { name: 'Caption' });
  await user.type(caption, ' local');
  await user.click(screen.getByRole('button', { name: 'Refresh report' }));

  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Caption' })).toHaveValue(
    'Edema in the lateral femoral condyle local'
  );
  expect(screen.queryByText('Updated after leaving.')).not.toBeInTheDocument();
});

it('flags a newer report from another tab without changing the editor', async () => {
  const user = userEvent.setup();
  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  expect(
    await screen.findByText('Marrow edema in the lateral femoral condyle.')
  ).toBeInTheDocument();
  const channel = new BroadcastChannel(`radpair-report-${kneeReport.id}`);
  channel.postMessage({
    tabId: 'other-tab',
    version: kneeReport.version + 1,
    status: 'draft',
    content: reportAfterLeaving.content
  });
  channel.close();

  expect(await screen.findByText('Conflict')).toBeInTheDocument();
  expect(screen.getByText('Marrow edema in the lateral femoral condyle.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Load latest' }));
  expect(await screen.findByText('Updated after leaving.')).toBeInTheDocument();
});

it('remembers a saved report for the next visit', async () => {
  const user = userEvent.setup();
  const savedReports: ReportResponse[] = [];
  stubReportSaves();

  renderPage(
    <ReportWorkspace
      bodyPart={kneeBodyPart}
      images={kneeImages}
      onSaved={(report) => {
        savedReports.push(report);
      }}
      onSigned={() => {}}
      readOnly={false}
      report={kneeReport}
    />
  );

  await user.type(await screen.findByRole('textbox', { name: 'Caption' }), ' kept');
  fireEvent.focusOut(screen.getByRole('textbox', { name: 'Caption' }));

  await waitFor(() => expect(savedReports).toHaveLength(1));
  expect(JSON.stringify(savedReports[0]?.content)).toContain('kept');
  expect(savedReports[0]?.version).toBe(2);
});
