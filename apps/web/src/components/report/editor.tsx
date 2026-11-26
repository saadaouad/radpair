import {
  hasReportSubstance,
  parseReportDocument,
  reportSchema,
  ReportDocumentError,
  type ReportResponse,
  type StudyImageResponse
} from '@repo/contracts';
import type { Content } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Filmstrip } from '@/components/report/filmstrip.tsx';
import { ImageDialog } from '@/components/report/image-dialog.tsx';
import { imageIdsInDocument, KeyImage } from '@/components/report/key-image.ts';
import {
  insertDroppedStudyImage,
  isStudyImageDrag,
  markImageDropTarget
} from '@/components/report/study-image-drag.ts';
import { LateralityAlert } from '@/components/report/laterality-alert.tsx';
import { SignDialog } from '@/components/report/sign-dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useReportAutosave } from '@/hooks/use-autosave.ts';
import { useMutation } from '@/hooks/use-mutation.ts';
import { checkReportLaterality, type LateralityWarning } from '@/lib/laterality.ts';
import { ReportSaveError } from '@/lib/reports.ts';

const sameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

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
  bodyPart,
  readOnly,
  onSigned,
  onSaved,
  reloadReport
}: {
  report: ReportResponse;
  images: StudyImageResponse[];
  bodyPart: string;
  readOnly: boolean;
  onSigned: (report: ReportResponse) => void;
  onSaved?: (report: ReportResponse) => void;
  reloadReport?: () => Promise<ReportResponse>;
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [placedIds, setPlacedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signMessage, setSignMessage] = useState('');
  const [lateralityWarning, setLateralityWarning] = useState<LateralityWarning | null>(() =>
    checkReportLaterality(bodyPart, report.content)
  );
  const { mutate } = useMutation<ReportResponse>();
  const baseline = useRef<string | null>(null);
  const editorFrame = useRef<HTMLDivElement>(null);
  const autosaveHandlers = useRef({
    schedule: () => {},
    flush: async () => {}
  });
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        hardBreak: false,
        dropcursor: { color: '#4e9a67', width: 2 },
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
      },
      handleDrop: (view, event, _slice, moved) => {
        markImageDropTarget(view.dom, false);
        if (moved || !view.editable) {
          return false;
        }
        const result = insertDroppedStudyImage(
          view,
          event,
          imagesRef.current.map((image) => image.id)
        );
        if (result === 'ignored') {
          return false;
        }
        if (result === 'duplicate') {
          setNotice('This image is already in the report.');
        }
        return true;
      },
      handleDOMEvents: {
        dragover: (view, event) => {
          if (!view.editable || !isStudyImageDrag(event)) {
            return false;
          }
          event.preventDefault();
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
          }
          markImageDropTarget(view.dom, true);
          return true;
        },
        dragleave: (view, event) => {
          if (event.relatedTarget instanceof Node && view.dom.contains(event.relatedTarget)) {
            return false;
          }
          markImageDropTarget(view.dom, false);
          return false;
        }
      }
    },
    onCreate: ({ editor: current }) => {
      baseline.current = JSON.stringify(current.getJSON());
      setPlacedIds(imageIdsInDocument(current.state.doc));
      setLateralityWarning(checkReportLaterality(bodyPart, current.getJSON()));
    },
    onUpdate: ({ editor: current }) => {
      const nextIds = imageIdsInDocument(current.state.doc);
      setPlacedIds((currentIds) => (sameIds(currentIds, nextIds) ? currentIds : nextIds));
      setNotice('');
      setLateralityWarning(checkReportLaterality(bodyPart, current.getJSON()));
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
    baseline,
    onSaved
  });
  autosaveHandlers.current = {
    schedule: autosave.schedule,
    flush: autosave.flush
  };

  useEffect(() => {
    if (!editor || readOnly || autosave.status === 'conflict' || autosave.status === 'saving') {
      return;
    }
    if (report.version <= autosave.version()) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    if (baseline.current !== null && current !== baseline.current) {
      return;
    }
    autosave.replaceDocument(report.content, report.version);
  }, [autosave.replaceDocument, autosave.status, autosave.version, editor, readOnly, report]);

  const [changed, setChanged] = useState(false);
  useEffect(() => {
    if (autosave.status === 'unsaved' || autosave.status === 'saving') {
      setChanged(true);
    }
  }, [autosave.status]);

  useEffect(() => {
    const frame = editorFrame.current;
    if (!frame || readOnly) {
      return;
    }
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && frame.contains(next)) {
        return;
      }
      void autosave.flush();
    };
    frame.addEventListener('focusout', onFocusOut);
    return () => frame.removeEventListener('focusout', onFocusOut);
  }, [autosave.flush, readOnly]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

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
      return false;
    }
    if (imageIdsInDocument(editor.state.doc).includes(selectedId)) {
      setNotice('This image is already in the report.');
      return false;
    }
    const inserted = editor
      .chain()
      .focus()
      .insertContent({ type: 'keyImage', attrs: { imageId: selectedId, caption: '' } })
      .run();
    if (!inserted) {
      setNotice('Place the cursor in the report, then insert the image.');
      return false;
    }
    return true;
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

  const closeImage = useCallback(() => {
    setExpandedId(null);
  }, []);
  const showImage = useCallback((imageId: string) => {
    setExpandedId(imageId);
    setSelectedId(imageId);
  }, []);
  const insertExpanded = useCallback(() => {
    if (insertSelected()) {
      setExpandedId(null);
    }
  }, [insertSelected]);

  const confirmSign = async () => {
    if (!editor || readOnly || signing) {
      return;
    }
    setSigning(true);
    setSignMessage('');
    try {
      const settled = await autosave.settle();
      if (settled.status === 'conflict') {
        setSignMessage('This report was updated somewhere else. Resolve that before signing.');
        return;
      }
      if (settled.status === 'failed') {
        setSignMessage(settled.message || 'The report could not be saved.');
        return;
      }
      if (settled.status !== 'saved') {
        setSignMessage('Save the report before signing.');
        return;
      }

      let substance = false;
      try {
        substance = hasReportSubstance(parseReportDocument(editor.getJSON()));
      } catch (error) {
        setSignMessage(
          error instanceof ReportDocumentError ? error.message : 'This report cannot be signed.'
        );
        return;
      }
      if (!substance) {
        setSignMessage('A report needs text or a key image before it can be signed.');
        return;
      }

      const signed = await mutate({
        endpoint: `/api/reports/${report.id}/sign`,
        method: 'POST',
        body: { expectedVersion: autosave.version() },
        parse: (body) => reportSchema.parse(body),
        fallback: 'The report could not be signed.'
      });
      autosave.adopt(signed.version, JSON.stringify(editor.getJSON()));
      onSigned(signed);
      setSignOpen(false);
    } catch (error) {
      if (error instanceof ReportSaveError && error.status === 409 && error.conflict) {
        autosave.noteConflict(error.conflict);
        setSignOpen(false);
        return;
      }
      if (error instanceof ReportSaveError && error.status === 403 && reloadReport) {
        const latest = await reloadReport();
        if (latest.status === 'signed') {
          autosave.replaceDocument(latest.content, latest.version);
          onSigned(latest);
          setSignOpen(false);
          return;
        }
      }
      setSignMessage(error instanceof Error ? error.message : 'The report could not be signed.');
    } finally {
      setSigning(false);
    }
  };

  const expanded = images.find((image) => image.id === expandedId) ?? null;
  const expandedIsPlaced = expanded !== null && placedIds.includes(expanded.id);
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
          readOnly={readOnly}
          selectedId={selectedId}
        />
        <div className="min-w-0 space-y-3">
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 lg:mx-0 lg:max-w-none">
              {readOnly ? (
                <p className="mr-auto text-sm text-muted-foreground">
                  This report is signed and can no longer be changed.
                </p>
              ) : autosave.status === 'failed' ? (
                <div className="mr-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <p aria-live="polite" className="text-sm text-destructive">
                    {autosave.label}
                  </p>
                  <p className="text-sm text-muted-foreground">{autosave.message}</p>
                  <Button
                    onClick={() => {
                      void autosave.flush();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              ) : autosave.status === 'conflict' ? (
                <div className="mr-auto min-w-0 space-y-2">
                  <p className="text-sm text-muted-foreground">Conflict</p>
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
                </div>
              ) : changed ? (
                <p aria-live="polite" className="mr-auto text-sm text-muted-foreground">
                  {autosave.label}
                </p>
              ) : null}
              {readOnly ? null : (
                <Button
                  onClick={() => {
                    setSignMessage('');
                    setSignOpen(true);
                  }}
                  type="button"
                >
                  Sign report
                </Button>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border bg-card" ref={editorFrame}>
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
            </div>
            <EditorContent editor={editor} />
          </div>
          {lateralityWarning ? <LateralityAlert message={lateralityWarning.message} /> : null}
          {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          {!readOnly ? (
            <p className="text-xs text-muted-foreground">
              Drag an image into the report to place it. Drag a placed image to move it. You can
              also open an image and choose Insert image. The shortcut is Shift+Ctrl+K or Shift+⌘K.
              The same image can be placed once.
            </p>
          ) : null}
        </div>
      </div>
      <ImageDialog
        canInsert={editor !== null && !readOnly && expanded !== null && !expandedIsPlaced}
        imageId={expanded?.id ?? null}
        images={images}
        onClose={closeImage}
        onInsert={insertExpanded}
        onShow={showImage}
      />
      <SignDialog
        lateralityWarning={lateralityWarning?.message}
        message={signMessage}
        onCancel={() => setSignOpen(false)}
        onConfirm={() => void confirmSign()}
        open={signOpen}
        pending={signing}
      />
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
