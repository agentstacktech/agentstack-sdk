/**
 * Dedicated worker entry for {@link compressPhoto} (P1).
 * Built as ``dist/photoCompress.worker.js`` next to the SDK ESM bundle.
 */

/// <reference lib="webworker" />

import type { PhotoCompressOptions } from './compress';
import { compressPhoto } from './compress';

export type PhotoCompressWorkerRequest = {
  id: string;
  blob: Blob;
  opts: PhotoCompressOptions;
};

export type PhotoCompressWorkerResponse =
  | { id: string; ok: true; result: Awaited<ReturnType<typeof compressPhoto>> }
  | { id: string; ok: false; error: string };

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (ev: MessageEvent<PhotoCompressWorkerRequest>) => {
  const { id, blob, opts } = ev.data;
  void (async () => {
    try {
      const result = await compressPhoto(blob as File, opts);
      const out: PhotoCompressWorkerResponse = { id, ok: true, result };
      self.postMessage(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const out: PhotoCompressWorkerResponse = { id, ok: false, error: msg };
      self.postMessage(out);
    }
  })();
};
