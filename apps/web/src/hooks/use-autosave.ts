import { reportSchema, type ReportResponse } from '@repo/contracts';
import type { Editor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router';

import { useMutation } from '@/hooks/use-mutation.ts';
import { readSaveError, type ReportConflict } from '@/lib/reports.ts';

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
  const saveError = readSaveError(error);
  if (!saveError) {
    return true;
  }
  return saveError.status === 500 || saveError.status === 503;
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
  const inflightSerialized = useRef<string | null>(null);
  const queued = useRef(false);
  const conflictLock = useRef<ReportConflict | null>(null);
  const attempt = useRef(0);
  const disposed = useRef(false);
  const timer = useRef<number | null>(null);
  const suppress = useRef(false);
  const flushingLeave = useRef(false);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [message, setMessageState] = useState('');
  const messageRef = useRef('');
  const setMessage = useCallback((next: string) => {
    messageRef.current = next;
    if (!disposed.current) {
      setMessageState(next);
    }
  }, []);
  const [conflict, setConflict] = useState<ReportConflict | null>(null);
  const { mutate } = useMutation<ReportResponse>();
  const save = useCallback(
    (content: unknown, keepalive?: boolean) =>
      mutate({
        endpoint: `/api/reports/${reportId}`,
        method: 'PUT',
        body: { content, expectedVersion: versionRef.current },
        keepalive,
        parse: (body) => reportSchema.parse(body),
        fallback: 'The report could not be saved.'
      }),
    [mutate, reportId]
  );

  const setSaveStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    if (!disposed.current) {
      setStatus(next);
    }
  }, []);
  const readStatus = () => statusRef.current;

  const lockConflict = useCallback(
    (next: ReportConflict, nextMessage: string) => {
      conflictLock.current = next;
      queued.current = false;
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      if (!disposed.current) {
        setConflict(next);
      }
      setSaveStatus('conflict');
      setMessage(nextMessage);
    },
    [setMessage, setSaveStatus]
  );

  const unlockConflict = useCallback(() => {
    conflictLock.current = null;
  }, []);

  // baseline is a stable ref shared with the editor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const flush = useCallback(async () => {
    if (disposed.current || conflictLock.current) {
      return;
    }
    const current = editorRef.current;
    if (!current || readOnly || readStatus() === 'conflict') {
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
      if (serialized !== inflightSerialized.current) {
        queued.current = true;
      }
      return;
    }

    const mine = attempt.current + 1;
    attempt.current = mine;
    inFlight.current = true;
    inflightSerialized.current = serialized;
    setSaveStatus('saving');
    setMessage('');
    try {
      let saved: ReportResponse | null = null;
      let lastError: unknown;
      for (let tryNumber = 0; tryNumber < 2; tryNumber += 1) {
        try {
          saved = await save(content);
          break;
        } catch (error) {
          lastError = error;
          if (!disposed.current && tryNumber === 0 && retryable(error)) {
            await wait(retryDelayMs);
            continue;
          }
          throw error;
        }
      }
      if (!saved) {
        throw lastError;
      }
      if (
        disposed.current ||
        conflictLock.current ||
        mine !== attempt.current ||
        readStatus() === 'conflict'
      ) {
        return;
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
      if (disposed.current || mine !== attempt.current) {
        return;
      }
      const saveError = readSaveError(error);
      if (saveError?.status === 409 && saveError.conflict) {
        lockConflict(saveError.conflict, saveError.message);
      } else {
        setSaveStatus('failed');
        setMessage(
          saveError?.message ??
            (error instanceof Error ? error.message : 'The report could not be saved.')
        );
      }
    } finally {
      if (inflightSerialized.current === serialized) {
        inFlight.current = false;
        inflightSerialized.current = null;
        const followUp =
          !disposed.current &&
          mine === attempt.current &&
          queued.current &&
          !conflictLock.current &&
          readStatus() !== 'conflict';
        queued.current = false;
        if (followUp) {
          void flush();
        }
      }
    }
  }, [lockConflict, readOnly, save, setMessage, setSaveStatus]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  const schedule = useCallback(() => {
    const current = editorRef.current;
    if (
      disposed.current ||
      conflictLock.current ||
      !current ||
      readOnly ||
      suppress.current ||
      statusRef.current === 'conflict'
    ) {
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
    unlockConflict();
    suppress.current = true;
    current.commands.setContent(conflict.content);
    baseline.current = JSON.stringify(current.getJSON());
    versionRef.current = conflict.version;
    suppress.current = false;
    setConflict(null);
    setMessage('');
    setSaveStatus('saved');
  }, [conflict, setMessage, setSaveStatus, unlockConflict]);

  const overwrite = useCallback(() => {
    if (disposed.current || !conflict) {
      return;
    }
    unlockConflict();
    versionRef.current = conflict.version;
    setConflict(null);
    setMessage('');
    setSaveStatus('unsaved');
    void flush();
  }, [conflict, flush, setMessage, setSaveStatus, unlockConflict]);

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
      unlockConflict();
      versionRef.current = nextVersion;
      baseline.current = serialized;
      setConflict(null);
      setMessage('');
      setSaveStatus('saved');
    },
    [setSaveStatus, unlockConflict]
  );

  const noteConflict = useCallback(
    (next: ReportConflict) => {
      lockConflict(next, 'This report was updated somewhere else.');
    },
    [lockConflict]
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
      unlockConflict();
      suppress.current = true;
      current.commands.setContent(content);
      baseline.current = JSON.stringify(current.getJSON());
      versionRef.current = nextVersion;
      suppress.current = false;
      setConflict(null);
      setMessage('');
      setSaveStatus('saved');
    },
    [setMessage, setSaveStatus, unlockConflict]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: baseline is a stable ref
  useEffect(() => {
    disposed.current = false;
    const onHide = () => {
      const current = editorRef.current;
      if (!current || readOnly || conflictLock.current || statusRef.current === 'conflict') {
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
      void save(content, true).catch(() => {
        if (disposed.current || statusRef.current === 'conflict') {
          return;
        }
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
      disposed.current = true;
      attempt.current += 1;
      inFlight.current = false;
      inflightSerialized.current = null;
      queued.current = false;
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onLeave);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [readOnly, save, setSaveStatus]);

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
      for (let pass = 0; pass < 8; pass += 1) {
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
