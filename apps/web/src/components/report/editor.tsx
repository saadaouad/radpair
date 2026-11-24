import type { ReportResponse, StudyImageResponse } from '@repo/contracts';
import type { Content } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filmstrip } from '@/components/report/filmstrip.tsx';
import { ImageDialog } from '@/components/report/image-dialog.tsx';
import { imageIdsInDocument, KeyImage } from '@/components/report/key-image.ts';
import { useReportAutosave } from '@/components/report/use-autosave.ts';
import { Button } from '@/components/ui/button.tsx';

const formats = [
  {
    id: 'bold',
    label: 'Bold',
    run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
      editor.chain().focus().toggleBold().run()
  },
  {
    id: 'italic',
    label: 'Italic',
    run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
      editor.chain().focus().toggleItalic().run()
  },
  {
    id: 'h1',
    label: 'H1',
    run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run()
  },
  {
    id: 'h2',
    label: 'H2',
    run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run()
  },
  {
    id: 'h3',
    label: 'H3',
    run: (editor: NonNullable<ReturnType<typeof useEditor>>) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run()
  }
] as const;

export const ReportWorkspace = ({
  report,
  images,
  readOnly
}: {
  report: ReportResponse;
  images: StudyImageResponse[];
  readOnly: boolean;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const baseline = useRef<string | null>(null);
  const autosaveHandlers = useRef({
    schedule: () => {},
    flush: async () => {}
  });
  const extensions = useMemo(
    () => [
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
      KeyImage.configure({ images })
    ],
    [images]
  );

  const editor = useEditor({
    immediatelyRender: true,
    editable: !readOnly,
    content: report.content as Content,
    extensions,
    editorProps: {
      attributes: {
        class: 'report-editor min-h-72 px-4 py-3 text-sm leading-6 focus:outline-none',
        'aria-label': 'Report'
      }
    },
    onCreate: ({ editor: current }) => {
      baseline.current = JSON.stringify(current.getJSON());
      setPlacedIds(imageIdsInDocument(current.state.doc));
    },
    onUpdate: ({ editor: current }) => {
      setPlacedIds(imageIdsInDocument(current.state.doc));
      setNotice('');
      autosaveHandlers.current.schedule();
    },
    onBlur: () => {
      void autosaveHandlers.current.flush();
    }
  });

  const autosave = useReportAutosave({
    editor,
    reportId: report.id,
    initialVersion: report.version,
    readOnly,
    baseline
  });
  autosaveHandlers.current = {
    schedule: autosave.schedule,
    flush: autosave.flush
  };

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return { bold: false, italic: false, h1: false, h2: false, h3: false };
      }
      return {
        bold: current.isActive('bold'),
        italic: current.isActive('italic'),
        h1: current.isActive('heading', { level: 1 }),
        h2: current.isActive('heading', { level: 2 }),
        h3: current.isActive('heading', { level: 3 })
      };
    }
  });

  const insertSelected = useCallback(() => {
    if (!editor || readOnly || !selectedId) {
      return;
    }
    if (imageIdsInDocument(editor.state.doc).includes(selectedId)) {
      setNotice('This image is already in the report.');
      return;
    }
    const inserted = editor
      .chain()
      .focus()
      .insertContent({ type: 'keyImage', attrs: { imageId: selectedId, caption: '' } })
      .run();
    if (!inserted) {
      setNotice('Place the cursor in the report, then insert the image.');
    }
  }, [editor, readOnly, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !event.shiftKey || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      event.preventDefault();
      insertSelected();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [insertSelected]);

  const expanded = images.find((image) => image.id === expandedId) ?? null;
  const selectedIsPlaced = selectedId !== null && placedIds.includes(selectedId);
  const pressed = {
    bold: active?.bold ?? false,
    italic: active?.italic ?? false,
    h1: active?.h1 ?? false,
    h2: active?.h2 ?? false,
    h3: active?.h3 ?? false
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-0">
      <div className="lg:grid lg:grid-cols-[7.5rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <Filmstrip
          images={images}
          onExpand={setExpandedId}
          onSelect={setSelectedId}
          placedIds={placedIds}
          selectedId={selectedId}
        />
        <div className="min-w-0 space-y-3">
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 lg:mx-0 lg:max-w-none">
              <div className="min-w-0 space-y-2">
                <p aria-live="polite" className="text-sm text-muted-foreground">
                  {readOnly
                    ? 'This report is signed and can no longer be changed.'
                    : autosave.label}
                  {!readOnly && autosave.status === 'failed' ? `. ${autosave.message}` : null}
                </p>
                {!readOnly && autosave.status === 'conflict' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm">
                      This report was updated somewhere else. Your text is still in the editor, so
                      you can copy it before loading the other version.
                    </p>
                    <Button onClick={autosave.loadLatest} size="sm" type="button" variant="outline">
                      Load latest
                    </Button>
                    <Button onClick={autosave.overwrite} size="sm" type="button">
                      Overwrite with mine
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                disabled={
                  readOnly ||
                  autosave.status === 'saved' ||
                  autosave.status === 'saving' ||
                  autosave.status === 'conflict'
                }
                onClick={() => void autosave.flush()}
                type="button"
              >
                Save
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-1 border-b p-2">
              {formats.map((format) => (
                <Button
                  aria-pressed={pressed[format.id]}
                  disabled={readOnly || !editor}
                  key={format.id}
                  onClick={() => {
                    if (editor) {
                      format.run(editor);
                    }
                  }}
                  size="sm"
                  type="button"
                  variant={pressed[format.id] ? 'default' : 'ghost'}
                >
                  {format.label}
                </Button>
              ))}
              <Button
                aria-keyshortcuts="Control+Shift+K Meta+Shift+K"
                disabled={readOnly || !editor || !selectedId || selectedIsPlaced}
                onClick={insertSelected}
                size="sm"
                type="button"
                variant="outline"
              >
                Insert image
              </Button>
            </div>
            <EditorContent editor={editor} />
          </div>
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          {!readOnly ? (
            <p className="text-xs text-muted-foreground">
              Select an image, then insert it at the cursor. The shortcut is Shift+Ctrl+K or
              Shift+⌘K. The same image can be placed once.
            </p>
          ) : null}
        </div>
      </div>
      <ImageDialog image={expanded} onClose={() => setExpandedId(null)} />
      {autosave.blocker.state === 'blocked' &&
      (autosave.status === 'failed' || autosave.status === 'conflict') ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            aria-labelledby="unsaved-title"
            aria-modal="true"
            className="w-full max-w-md space-y-3 rounded-xl bg-background p-4 shadow-lg"
            role="alertdialog"
          >
            <h2 className="text-lg font-semibold" id="unsaved-title">
              This report hasn't been saved
            </h2>
            <p className="text-sm text-muted-foreground">
              Your text stays in the editor if you stay on this page.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => autosave.blocker.reset?.()} type="button" variant="outline">
                Stay
              </Button>
              <Button onClick={() => autosave.blocker.proceed?.()} type="button">
                Leave
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
