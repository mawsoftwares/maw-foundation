import { useCallback, useEffect, useRef, useState } from 'react';
import { formatBytes, putWithProgress, type StorageApi, type StorageFile } from './api';

export type UploadStatus = 'queued' | 'uploading' | 'completing' | 'done' | 'error';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  /** 0..1 */
  progress: number;
  error?: string;
  result?: StorageFile;
}

export interface UploadQueueOptions {
  api: StorageApi;
  folderId: string | null;
  /** Reject larger files before any network call. */
  maxSizeBytes?: number;
  /** Same syntax as `<input accept>`: `image/*,.pdf,application/pdf`. */
  accept?: string;
  /** Parallel uploads. Default 2 (kind to mobile connections). */
  concurrency?: number;
  onUploaded?: (file: StorageFile) => void;
}

export interface UploadQueue {
  items: UploadItem[];
  busy: boolean;
  add(files: File[]): void;
  retry(id: string): void;
  cancel(id: string): void;
  remove(id: string): void;
  clearFinished(): void;
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true;
  const rules = accept.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) =>
    rule.startsWith('.') ? name.endsWith(rule) : rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule,
  );
}

let counter = 0;

/** Upload state machine: validate → request signed URL → PUT with progress → complete. */
export function useUploadQueue(options: UploadQueueOptions): UploadQueue {
  const [items, setItems] = useState<UploadItem[]>([]);
  const opts = useRef(options);
  opts.current = options;
  const controllers = useRef(new Map<string, AbortController>());
  const waiting = useRef<string[]>([]);
  const active = useRef(0);
  const files = useRef(new Map<string, File>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const live = controllers.current;
    return () => {
      mounted.current = false;
      live.forEach((c) => c.abort());
    };
  }, []);

  const patch = useCallback((id: string, change: Partial<UploadItem>): void => {
    if (mounted.current) setItems((list) => list.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }, []);

  const run = useCallback(
    async (id: string): Promise<void> => {
      const file = files.current.get(id);
      if (!file) return;
      const { api, folderId, onUploaded } = opts.current;
      const controller = new AbortController();
      controllers.current.set(id, controller);
      try {
        patch(id, { status: 'uploading', progress: 0, error: undefined });
        const ticket = await api.requestUpload({ name: file.name, type: file.type, size: file.size }, folderId);
        await putWithProgress(ticket, file, (p) => patch(id, { progress: p }), controller.signal);
        patch(id, { status: 'completing', progress: 1 });
        const result = await api.completeUpload(ticket.fileId);
        patch(id, { status: 'done', result });
        onUploaded?.(result);
      } catch (e) {
        const cancelled = e instanceof DOMException && e.name === 'AbortError';
        patch(id, { status: 'error', error: cancelled ? 'Cancelled' : (e as Error).message || 'Upload failed' });
      } finally {
        controllers.current.delete(id);
      }
    },
    [patch],
  );

  const pump = useCallback((): void => {
    const limit = opts.current.concurrency ?? 2;
    while (active.current < limit && waiting.current.length > 0) {
      const id = waiting.current.shift()!;
      active.current++;
      void run(id).finally(() => {
        active.current--;
        pump();
      });
    }
  }, [run]);

  const enqueue = useCallback(
    (id: string): void => {
      waiting.current.push(id);
      pump();
    },
    [pump],
  );

  const add = useCallback(
    (picked: File[]): void => {
      const { maxSizeBytes, accept } = opts.current;
      const created: UploadItem[] = picked.map((file) => {
        const id = `u${++counter}`;
        files.current.set(id, file);
        let error: string | undefined;
        if (file.size === 0) error = 'File is empty';
        else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) error = `Too large (max ${formatBytes(maxSizeBytes)})`;
        else if (!matchesAccept(file, accept)) error = 'This file type is not allowed';
        return { id, file, status: error ? 'error' : 'queued', progress: 0, ...(error ? { error } : {}) };
      });
      setItems((list) => [...list, ...created]);
      created.filter((i) => i.status === 'queued').forEach((i) => enqueue(i.id));
    },
    [enqueue],
  );

  const retry = useCallback(
    (id: string): void => {
      patch(id, { status: 'queued', progress: 0, error: undefined });
      enqueue(id);
    },
    [enqueue, patch],
  );

  const cancel = useCallback(
    (id: string): void => {
      waiting.current = waiting.current.filter((w) => w !== id);
      const c = controllers.current.get(id);
      if (c) c.abort();
      else patch(id, { status: 'error', error: 'Cancelled' });
    },
    [patch],
  );

  const remove = useCallback((id: string): void => {
    waiting.current = waiting.current.filter((w) => w !== id);
    controllers.current.get(id)?.abort();
    files.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const clearFinished = useCallback((): void => {
    setItems((list) => {
      list.filter((i) => i.status === 'done').forEach((i) => files.current.delete(i.id));
      return list.filter((i) => i.status !== 'done');
    });
  }, []);

  return {
    items,
    busy: items.some((i) => i.status === 'queued' || i.status === 'uploading' || i.status === 'completing'),
    add,
    retry,
    cancel,
    remove,
    clearFinished,
  };
}
