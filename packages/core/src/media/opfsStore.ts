/**
 * OPFS-backed byte store with LRU eviction — generic SDK primitive.
 *
 * Gene: `sdk.media.gen1` · sibling of `frontend.social.messenger.opfs.gen1`.
 *
 * Why this lives in the SDK (not per-app):
 *   The messenger already proved OPFS + LRU as durable cytoplasmic storage for
 *   large attachments. Every other surface (storage explorer, dashboard file
 *   preview, widget sandbox) wants the same thing. Lifting the primitive into
 *   the SDK removes duplication and lets third-party integrators reuse it.
 *
 * Design invariants:
 *   - **Tenant-isolated**: every call takes a `namespace` (e.g. `'messenger'`,
 *     `'storage-thumbs'`) so one surface can't starve another's cache.
 *   - **LRU per namespace**: each namespace owns its own `.lru.json`.
 *   - **Browser-only**: feature-detects `navigator.storage.getDirectory` and
 *     throws a named `OpfsUnavailableError` on non-browser / older Safari.
 *   - **Zero deps**: raw `FileSystemDirectoryHandle` API.
 *
 * Typical usage:
 *
 *   const cache = createOpfsStore({
 *     namespace: 'storage-thumbs',
 *     capBytes: 256 * 1024 * 1024,
 *   });
 *   let blob = await cache.get(keyHash);
 *   if (!blob) {
 *     blob = await generateThumbnail(source);
 *     await cache.put(keyHash, blob);
 *   }
 *
 * Keys are treated as opaque strings but we normalize to a safe filename —
 * callers usually pass a SHA-256 of the source bytes.
 */

const SAFE_KEY_RE = /[^A-Za-z0-9._-]+/g;
const LRU_FILENAME = '.lru.json';

export class OpfsUnavailableError extends Error {
  constructor(msg = 'OPFS is unavailable in this runtime') {
    super(msg);
    this.name = 'OpfsUnavailableError';
  }
}

export interface OpfsStoreOptions {
  /** Directory name under OPFS root. Must be filesystem-safe. */
  namespace: string;
  /** Hard byte cap for this namespace; oldest entries evicted first. Default 128 MB. */
  capBytes?: number;
  /** Override for tests. */
  root?: () => Promise<FileSystemDirectoryHandle>;
}

export interface OpfsStore {
  readonly namespace: string;
  has(key: string): Promise<boolean>;
  get(key: string): Promise<Blob | null>;
  /** Insert/overwrite, updates LRU, may trigger eviction. */
  put(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  usageBytes(): Promise<number>;
}

interface LruRecord {
  key: string;
  size: number;
  lastAt: number;
}

async function defaultRoot(): Promise<FileSystemDirectoryHandle> {
  const nav =
    typeof navigator !== 'undefined' ? navigator : (undefined as Navigator | undefined);
  const getDir = nav?.storage?.getDirectory?.bind(nav.storage);
  if (!getDir) {
    throw new OpfsUnavailableError();
  }
  return getDir();
}

function safeKey(key: string): string {
  const s = String(key ?? '').trim();
  if (!s) throw new Error('opfs_empty_key');
  return s.replace(SAFE_KEY_RE, '_').slice(0, 200);
}

async function ensureDir(
  root: FileSystemDirectoryHandle,
  name: string
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create: true });
}

export function isOpfsAvailable(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.storage &&
      typeof navigator.storage.getDirectory === 'function'
    );
  } catch {
    return false;
  }
}

export function createOpfsStore(opts: OpfsStoreOptions): OpfsStore {
  const namespace = String(opts.namespace || '').replace(SAFE_KEY_RE, '_');
  if (!namespace) throw new Error('opfs_namespace_required');
  const cap = Math.max(1, opts.capBytes ?? 128 * 1024 * 1024);
  const rootFn = opts.root ?? defaultRoot;

  async function dir(): Promise<FileSystemDirectoryHandle> {
    const root = await rootFn();
    return ensureDir(root, namespace);
  }

  async function readLru(): Promise<LruRecord[]> {
    try {
      const d = await dir();
      const fh = await d.getFileHandle(LRU_FILENAME, { create: false });
      const file = await fh.getFile();
      const parsed = JSON.parse(await file.text()) as unknown;
      return Array.isArray(parsed) ? (parsed as LruRecord[]) : [];
    } catch {
      return [];
    }
  }

  async function writeLru(records: LruRecord[]): Promise<void> {
    const d = await dir();
    const fh = await d.getFileHandle(LRU_FILENAME, { create: true });
    const w = await fh.createWritable({ keepExistingData: false });
    await w.write(new Blob([JSON.stringify(records)]));
    await w.close();
  }

  async function evictIfOverCap(): Promise<void> {
    const records = await readLru();
    let total = records.reduce((s, r) => s + r.size, 0);
    if (total <= cap) return;
    records.sort((a, b) => a.lastAt - b.lastAt);
    const d = await dir();
    while (total > cap && records.length > 0) {
      const rec = records.shift()!;
      try {
        await d.removeEntry(rec.key);
      } catch {
        /* already gone */
      }
      total -= rec.size;
    }
    await writeLru(records);
  }

  return {
    namespace,

    async has(key) {
      try {
        const d = await dir();
        await d.getFileHandle(safeKey(key), { create: false });
        return true;
      } catch {
        return false;
      }
    },

    async get(key) {
      try {
        const d = await dir();
        const fh = await d.getFileHandle(safeKey(key), { create: false });
        const file = await fh.getFile();
        // touch LRU without blocking the read
        void (async () => {
          const records = await readLru();
          const rec = records.find((r) => r.key === safeKey(key));
          if (rec) {
            rec.lastAt = Date.now();
            await writeLru(records).catch(() => {
              /* best-effort */
            });
          }
        })();
        return file;
      } catch {
        return null;
      }
    },

    async put(key, blob) {
      const sk = safeKey(key);
      const d = await dir();
      const fh = await d.getFileHandle(sk, { create: true });
      const w = await fh.createWritable({ keepExistingData: false });
      try {
        await blob.stream().pipeTo(w as unknown as WritableStream);
      } catch (err) {
        try {
          await (w as unknown as { abort?: (reason?: unknown) => Promise<void> }).abort?.(
            String(err)
          );
        } catch {
          /* best-effort */
        }
        throw err;
      }
      const records = (await readLru()).filter((r) => r.key !== sk);
      records.push({ key: sk, size: blob.size, lastAt: Date.now() });
      await writeLru(records);
      await evictIfOverCap();
    },

    async delete(key) {
      const sk = safeKey(key);
      try {
        const d = await dir();
        await d.removeEntry(sk);
      } catch {
        /* already gone */
      }
      const records = (await readLru()).filter((r) => r.key !== sk);
      await writeLru(records).catch(() => {
        /* best-effort */
      });
    },

    async clear() {
      try {
        const root = await rootFn();
        await root.removeEntry(namespace, { recursive: true });
      } catch {
        /* already gone */
      }
    },

    async usageBytes() {
      const records = await readLru();
      return records.reduce((s, r) => s + r.size, 0);
    },
  };
}
