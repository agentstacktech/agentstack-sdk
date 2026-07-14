/**
 * Generic tus-lite resumable upload client — SDK primitive.
 *
 * Gene: `sdk.media.gen1` · replaces messenger-scoped implementation in
 *       `agentstack-frontend/src/lib/messenger/opfs/messengerResumableUpload.ts`.
 *
 * Wire protocol (matches `agentstack-core/endpoints/files_endpoints.py`):
 *   HEAD  /api/files/resumable/{op_id}   → Upload-Offset, Upload-Length
 *   PATCH /api/files/resumable/{op_id}   → append chunk, 204 with Upload-Offset
 *                                          or 200 + {url} when complete
 *
 * Target routing (gene: repo.engineering.client_side_computation.gen1):
 *   X-Upload-Target: storage       → finalize into 8DNA storage organelle
 *   X-Upload-Target: hosting       → import ZIP into hosting bucket (GA-16)
 *   X-Upload-Bucket-Id: {uuid}     → hosting bucket target
 *   X-Upload-Folder: docs__reports  → storage folder key (default "_")
 *   X-Upload-Scope:  user|project   → storage scope (default "user")
 *   X-Upload-Category: user         → storage category tag
 *   X-Upload-Project-Id: 123        → overrides X-Project-ID header
 *   (missing Target → legacy `uploads/` category on disk)
 *
 * Chunk size of 256 KB balances: small enough that radio drops don't waste
 * bandwidth, large enough to amortise TLS+HTTP overhead.
 *
 * Source interface (`ChunkSource`) abstracts OPFS-vs-memory-vs-stream: any
 * caller providing `size()` + `readChunk(offset, length)` can drive the loop.
 * The SDK ships two adapters: `blobChunkSource` (in-memory `Blob`/`File`) and
 * `opfsChunkSource` (OPFS-backed staging — resumes across page reloads).
 */

const DEFAULT_CHUNK_SIZE = 256 * 1024;
const MAX_UPLOAD_SIZE_BYTES = 512 * 1024 * 1024; // matches server cap

export class ResumableUploadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number
  ) {
    super(message);
    this.name = 'ResumableUploadError';
  }
}

export interface ChunkSource {
  size(): Promise<number> | number;
  readChunk(offset: number, length: number): Promise<Uint8Array>;
  /** Optional cleanup after successful upload. */
  dispose?(): Promise<void> | void;
}

export interface ResumableUploadTarget {
  /** `storage` → 8DNA row; `hosting` → bucket ZIP import; omit → legacy uploads/. */
  target?: 'storage' | 'legacy' | 'hosting';
  /** Required when ``target === 'hosting'``. */
  bucketId?: string;
  folder?: string;
  scope?: 'user' | 'project';
  category?: string;
  projectId?: number;
}

export interface ResumableUploadInput {
  opId: string;
  mime?: string;
  name?: string;
  source: ChunkSource;
  /** Routing + storage placement hints; sent as X-Upload-* headers. */
  target?: ResumableUploadTarget;
}

export interface ResumableUploadOptions {
  baseUrl?: string;
  authHeader?: string;
  /** Merged into PATCH headers (CSRF, X-API-Key, X-Project-ID, …). */
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  chunkSize?: number;
  /** Called with running bytes uploaded; useful for progress bars. */
  onProgress?: (uploaded: number, total: number) => void;
  /** Abort the in-flight upload. */
  signal?: AbortSignal;
}

export interface ResumableUploadResult {
  op_id: string;
  mime: string;
  size: number;
  name: string;
  /** Raw response JSON on finalize — contains `url`, `file`, etc. depending on target. */
  response: Record<string, unknown>;
  elapsedMs: number;
  recoveredBytes: number;
}

/** Chunk source over an in-memory Blob/File. */
export function blobChunkSource(blob: Blob): ChunkSource {
  return {
    size: () => blob.size,
    async readChunk(offset, length) {
      const slice = blob.slice(offset, offset + length);
      return new Uint8Array(await slice.arrayBuffer());
    },
  };
}

/**
 * Chunk source over an OPFS-staged file. Caller must have written the blob
 * into the given OPFS store under `key` first. On `dispose()` the entry is
 * removed from OPFS.
 */
export function opfsChunkSource(store: {
  get: (key: string) => Promise<Blob | null>;
  delete: (key: string) => Promise<void>;
}, key: string): ChunkSource {
  let cached: Blob | null = null;
  async function ensure(): Promise<Blob> {
    if (cached) return cached;
    const b = await store.get(key);
    if (!b) throw new ResumableUploadError('opfs_staged_missing', false);
    cached = b;
    return cached;
  }
  return {
    async size() {
      return (await ensure()).size;
    },
    async readChunk(offset, length) {
      const b = await ensure();
      const slice = b.slice(offset, offset + length);
      return new Uint8Array(await slice.arrayBuffer());
    },
    async dispose() {
      cached = null;
      await store.delete(key).catch(() => {
        /* best-effort */
      });
    },
  };
}

export function buildTargetHeaders(target?: ResumableUploadTarget): Record<string, string> {
  const out: Record<string, string> = {};
  if (!target) return out;
  if (target.target === 'storage') {
    out['X-Upload-Target'] = 'storage';
  }
  if (target.target === 'hosting') {
    out['X-Upload-Target'] = 'hosting';
    if (target.bucketId) out['X-Upload-Bucket-Id'] = target.bucketId;
  }
  if (target.folder) out['X-Upload-Folder'] = target.folder;
  if (target.scope) out['X-Upload-Scope'] = target.scope;
  if (target.category) out['X-Upload-Category'] = target.category;
  if (target.projectId != null) out['X-Upload-Project-Id'] = String(target.projectId);
  return out;
}

async function getServerOffset(
  baseUrl: string,
  opId: string,
  baseHeaders: HeadersInit,
  fetchImpl: typeof fetch,
  signal?: AbortSignal
): Promise<number> {
  const res = await fetchImpl(`${baseUrl}/api/files/resumable/${encodeURIComponent(opId)}`, {
    method: 'HEAD',
    headers: baseHeaders,
    signal,
  });
  if (res.status === 404) return 0;
  if (!res.ok) {
    throw new ResumableUploadError(`head_failed_${res.status}`, res.status >= 500, res.status);
  }
  const header = res.headers.get('Upload-Offset');
  const parsed = header ? parseInt(header, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/**
 * Run a resumable upload loop.
 *
 * The function probes the server for an existing offset (tus HEAD), then PATCHes
 * chunks from the caller-provided source until the server acks finalization.
 * On 409/416 the server's offset is re-read and the loop restarts at that
 * point — exactly the point of tus-lite.
 */
export async function runResumableUpload(
  input: ResumableUploadInput,
  opts: ResumableUploadOptions = {}
): Promise<ResumableUploadResult> {
  const fetchImpl = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!fetchImpl) {
    throw new ResumableUploadError('fetch_unavailable', false);
  }
  const baseUrl = (opts.baseUrl ?? '').replace(/\/+$/, '');
  const chunkSize = Math.max(16 * 1024, Math.min(4 * 1024 * 1024, opts.chunkSize ?? DEFAULT_CHUNK_SIZE));
  const mime = input.mime || 'application/octet-stream';
  const name = input.name || `upload-${input.opId}`;
  const baseHeaders: HeadersInit = {
    ...(opts.headers ?? {}),
    ...(opts.authHeader ? { Authorization: opts.authHeader } : {}),
  };

  const total = await input.source.size();
  if (total <= 0) {
    throw new ResumableUploadError('empty_upload', false);
  }
  if (total > MAX_UPLOAD_SIZE_BYTES) {
    throw new ResumableUploadError('upload_too_large', false);
  }

  const started = Date.now();
  let offset = 0;
  try {
    offset = await getServerOffset(baseUrl, input.opId, baseHeaders, fetchImpl, opts.signal);
  } catch (err) {
    if (err instanceof ResumableUploadError && !err.retryable) throw err;
    offset = 0;
  }
  const recoveredBytes = offset;

  while (offset < total) {
    if (opts.signal?.aborted) {
      throw new ResumableUploadError('aborted', false);
    }
    const end = Math.min(total, offset + chunkSize);
    const chunk = await input.source.readChunk(offset, end - offset);
    const targetHeaders = buildTargetHeaders(input.target);
    // Wrap as Blob so the body typing is unambiguous across TS lib versions
    // (Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer> differs between
    // TS 5.5+ and 5.7; a Blob accepts BlobPart regardless).
    const body = new Blob([chunk as unknown as ArrayBuffer]);

    const res = await fetchImpl(
      `${baseUrl}/api/files/resumable/${encodeURIComponent(input.opId)}`,
      {
        method: 'PATCH',
        headers: {
          ...baseHeaders,
          ...targetHeaders,
          'Content-Type': 'application/offset+octet-stream',
          'Content-Length': String(chunk.byteLength),
          'Upload-Offset': String(offset),
          'Upload-Length': String(total),
          'Content-Range': `bytes ${offset}-${end - 1}/${total}`,
          'X-Upload-Mime': mime,
          'X-Upload-Name': encodeURIComponent(name),
        },
        body,
        signal: opts.signal,
      }
    );

    if (res.status === 409 || res.status === 416) {
      const svr = parseInt(res.headers.get('Upload-Offset') ?? '0', 10);
      offset = Number.isFinite(svr) && svr >= 0 ? svr : 0;
      opts.onProgress?.(offset, total);
      continue;
    }
    if (!res.ok) {
      throw new ResumableUploadError(`chunk_failed_${res.status}`, res.status >= 500, res.status);
    }

    const newOffset = parseInt(res.headers.get('Upload-Offset') ?? String(end), 10);
    offset = Number.isFinite(newOffset) && newOffset > 0 ? newOffset : end;
    opts.onProgress?.(offset, total);

    if (offset >= total) {
      let responseBody: Record<string, unknown> = {};
      try {
        responseBody = (await res.json()) as Record<string, unknown>;
      } catch {
        /* 200 with empty body is still fine */
      }
      try {
        await input.source.dispose?.();
      } catch {
        /* best-effort */
      }
      return {
        op_id: input.opId,
        mime,
        name,
        size: total,
        response: responseBody,
        elapsedMs: Date.now() - started,
        recoveredBytes,
      };
    }
  }

  throw new ResumableUploadError('upload_incomplete_but_loop_exited', true);
}
