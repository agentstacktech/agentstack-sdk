/**
 * Optional worker offload for {@link compressPhoto} (P1).
 *
 * When ``preferWorker`` is true, runs compression in ``dist/photoCompress.worker.js``
 * (sibling of the ESM bundle). Falls back to main-thread {@link compressPhoto} on any error.
 *
 * Gene: ``sdk.media.photo.gen1``
 */

import type { PhotoCompressOptions, PhotoCompressResult } from './compress';
import { compressPhoto } from './compress';

type PhotoCompressWorkerRequest = { id: string; blob: Blob; opts: PhotoCompressOptions };
type PhotoCompressWorkerResponse =
  | { id: string; ok: true; result: PhotoCompressResult }
  | { id: string; ok: false; error: string };

let workerSingleton: Worker | null = null;
let workerFailed = false;

function getPhotoCompressWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null;
  if (workerSingleton) return workerSingleton;
  try {
    const href = new URL('./photoCompress.worker.js', import.meta.url).href;
    workerSingleton = new Worker(href, { type: 'module' });
    workerSingleton.addEventListener('error', () => {
      workerFailed = true;
      try {
        workerSingleton?.terminate();
      } catch {
        /* ignore */
      }
      workerSingleton = null;
    });
    return workerSingleton;
  } catch {
    workerFailed = true;
    return null;
  }
}

function compressPhotoViaWorker(
  source: Blob | File,
  opts: PhotoCompressOptions
): Promise<PhotoCompressResult> {
  const w = getPhotoCompressWorker();
  if (!w) return compressPhoto(source, opts);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const onMsg = (ev: MessageEvent<PhotoCompressWorkerResponse>) => {
      const d = ev.data;
      if (!d || d.id !== id) return;
      w.removeEventListener('message', onMsg);
      if (d.ok) resolve(d.result);
      else reject(new Error(d.error));
    };
    w.addEventListener('message', onMsg);
    const req: PhotoCompressWorkerRequest = { id, blob: source, opts };
    try {
      w.postMessage(req);
    } catch (e) {
      w.removeEventListener('message', onMsg);
      void compressPhoto(source, opts).then(resolve, reject);
    }
  });
}

export async function compressPhotoPreferWorker(
  source: Blob | File,
  opts: PhotoCompressOptions & { preferWorker?: boolean }
): Promise<PhotoCompressResult> {
  const { preferWorker, ...rest } = opts;
  if (!preferWorker) {
    return compressPhoto(source, rest);
  }
  try {
    return await compressPhotoViaWorker(source, rest);
  } catch {
    return compressPhoto(source, rest);
  }
}
