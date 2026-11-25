import type { ReportResponse } from '@repo/contracts';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

import { ReportSaveError, saveReport, type ReportConflict } from '@/lib/reports.ts';

const saveDelayMs = 800;
const retryDelayMs = 400;

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'failed' | 'conflict';

const statusLabel: Record<SaveStatus, string> = {
  saved: 'Saved',
  unsaved: 'Saving...',
  saving: 'Saving...',
  failed: 'Failed to save',
  conflict: 'Conflict'
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryable = (error: unknown) => {
  if (!(error instanceof ReportSaveError)) {
    return true;
  }
  return error.status === 500 || error.status === 503;
};

export const useReportAutosave = ({
  editor,
  reportId,
  initialVersion,
  readOnly,
  baseline,
  onSaved
}: {
  editor: Editor | null;
  reportId: string;
  initialVersion: number;
  readOnly: boolean;
  baseline: { current: string | null };
  onSaved?: (report: ReportResponse) => void;
}) => {
  const editorRef = useRef(editor);
  editorRef.current = editor;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const versionRef = useRef(initialVersion);
  const statusRef = useRef<SaveStatus>('saved');
  const inFlight = useRef(false);
  const queued = useRef(false);
  const timer = useRef<number | null>(null);
  const suppress = useRef(false);
  const flushingLeave = useRef(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [message, setMessageState] = useState('');
  const messageRef = useRef('');
  const setMessage = useCallback((next: string) => {
    messageRef.current = next;
    setMessageState(next);
  }, []);
  const [conflict, setConflict] = useState<ReportConflict | null>(null);

  const setSaveStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // baseline is a stable ref shared with the editor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const flush = useCallback(async () => {
    const current = editorRef.current;
    if (!current || readOnly || statusRef.current === 'conflict') {
      return;
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const content = current.getJSON();
    const serialized = JSON.stringify(content);
    if (baseline.current !== null && serialized === baseline.current) {
      if (!inFlight.current) {
        setSaveStatus('saved');
      }
      return;
    }
    if (inFlight.current) {
      queued.current = true;
      return;
    }

    inFlight.current = true;
    setSaveStatus('saving');
    setMessage('');
    try {
      let saved: Awaited<ReturnType<typeof saveReport>> | null = null;
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          saved = await saveReport(reportId, content, versionRef.current);
          break;
        } catch (error) {
          lastError = error;
          if (attempt === 0 && retryable(error)) {
            await wait(retryDelayMs);
            continue;
          }
          throw error;
        }
      }
      if (!saved) {
        throw lastError;
      }
      versionRef.current = saved.version;
      baseline.current = serialized;
      onSavedRef.current?.(saved);
      const latest = editorRef.current ? JSON.stringify(editorRef.current.getJSON()) : serialized;
      if (latest === serialized) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
        queued.current = true;
      }
    } catch (error) {
      queued.current = false;
      if (error instanceof ReportSaveError && error.status === 409 && error.conflict) {
        setConflict(error.conflict);
        setSaveStatus('conflict');
        setMessage(error.message);
      } else {
        setSaveStatus('failed');
        setMessage(error instanceof Error ? error.message : 'The report could not be saved.');
      }
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void flush();
      }
    }
  }, [readOnly, reportId, setSaveStatus]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const schedule = useCallback(() => {
    const current = editorRef.current;
    if (!current || readOnly || suppress.current || statusRef.current === 'conflict') {
      return;
    }
    if (baseline.current === null) {
      return;
    }
    const serialized = JSON.stringify(current.getJSON());
    if (baseline.current !== null && serialized === baseline.current) {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      if (!inFlight.current && statusRef.current !== 'saving') {
        setSaveStatus('saved');
      }
      return;
    }
    if (statusRef.current !== 'saving') {
      setSaveStatus('unsaved');
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      void flush();
    }, saveDelayMs);
  }, [flush, readOnly, setSaveStatus]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const loadLatest = useCallback(() => {
    const current = editorRef.current;
    if (!current || !conflict) {
      return;
    }
    suppress.current = true;
    current.commands.setContent(conflict.content);
    baseline.current = JSON.stringify(current.getJSON());
    versionRef.current = conflict.version;
    suppress.current = false;
    setConflict(null);
    setMessage('');
    setSaveStatus('saved');
  }, [conflict, setMessage, setSaveStatus]);

  const overwrite = useCallback(() => {
    if (!conflict) {
      return;
    }
    versionRef.current = conflict.version;
    setConflict(null);
    setMessage('');
    setSaveStatus('unsaved');
    void flush();
  }, [conflict, flush, setMessage, setSaveStatus]);

  const settle = useCallback(async () => {
    await flush();
    while (inFlight.current || statusRef.current === 'saving') {
      await wait(40);
    }
    return { status: statusRef.current, message: messageRef.current };
  }, [flush]);

  const version = useCallback(() => versionRef.current, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const adopt = useCallback(
    (nextVersion: number, serialized: string) => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      versionRef.current = nextVersion;
      baseline.current = serialized;
      setConflict(null);
      setMessage('');
      setSaveStatus('saved');
    },
    [setSaveStatus]
  );

  const noteConflict = useCallback(
    (next: ReportConflict) => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      setConflict(next);
      setMessage('This report was updated somewhere else.');
      setSaveStatus('conflict');
    },
    [setMessage, setSaveStatus]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const replaceDocument = useCallback(
    (content: ReportConflict['content'], nextVersion: number) => {
      const current = editorRef.current;
      if (!current) {
        return;
      }
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      suppress.current = true;
      current.commands.setContent(content);
      baseline.current = JSON.stringify(current.getJSON());
      versionRef.current = nextVersion;
      suppress.current = false;
      setConflict(null);
      setMessage('');
      setSaveStatus('saved');
    },
    [setSaveStatus]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  useEffect(() => {
    const onHide = () => {
      const current = editorRef.current;
      if (!current || readOnly || statusRef.current === 'conflict') {
        return;
      }
      const content = current.getJSON();
      const serialized = JSON.stringify(content);
      if (baseline.current !== null && serialized === baseline.current) {
        return;
      }
      if (serialized.length > 60_000) {
        return;
      }
      void saveReport(reportId, content, versionRef.current, { keepalive: true }).catch(() => {
        setSaveStatus('failed');
      });
    };
    const onLeave = (event: BeforeUnloadEvent) => {
      if (statusRef.current === 'failed' || statusRef.current === 'conflict') {
        event.preventDefault();
      }
    };
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onLeave);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [readOnly, reportId, setSaveStatus]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (readOnly || currentLocation.pathname === nextLocation.pathname) {
      return false;
    }
    const current = statusRef.current;
    return (
      current === 'unsaved' ||
      current === 'saving' ||
      current === 'failed' ||
      current === 'conflict'
    );
  });

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      flushingLeave.current = false;
      return;
    }
    if (statusRef.current === 'failed' || statusRef.current === 'conflict') {
      return;
    }
    if (flushingLeave.current) {
      return;
    }
    flushingLeave.current = true;
    const finishLeave = async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (statusRef.current === 'failed' || statusRef.current === 'conflict') {
          flushingLeave.current = false;
          return;
        }
        if (
          !inFlight.current &&
          statusRef.current !== 'unsaved' &&
          statusRef.current !== 'saving'
        ) {
          break;
        }
        await flush();
        while (inFlight.current) {
          await wait(30);
        }
      }
      if (statusRef.current === 'failed' || statusRef.current === 'conflict') {
        flushingLeave.current = false;
        return;
      }
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    };
    void finishLeave();
  }, [blocker, flush]);

  return {
    status,
    label: statusLabel[status],
    message,
    conflict,
    flush,
    settle,
    version,
    adopt,
    noteConflict,
    replaceDocument,
    schedule,
    loadLatest,
    overwrite,
    blocker
  };
};
