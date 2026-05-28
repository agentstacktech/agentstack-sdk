import { folderSegmentsFromKey } from './storageFolderKey';

/**
 * Same-origin path to a user file under `/uploaded_files/storage/...`
 * (mirrors messenger attachment URL layout). Pure function — no `import.meta`;
 * callers supply `ecosystemProjectId` from host env.
 */
export function buildStorageUploadedPublicPath(args: {
  ecosystemProjectId: number;
  dnaUserId: number;
  folderKey: string;
  filename: string;
}): string {
  const pid = Math.max(0, Math.floor(Number(args.ecosystemProjectId) || 0));
  const uid = Math.max(0, Math.floor(Number(args.dnaUserId) || 0));
  const segs = folderSegmentsFromKey(args.folderKey);
  const tail = encodeURIComponent(String(args.filename ?? '').trim());
  const prefix = `/uploaded_files/storage/${pid}/${uid}`;
  if (!segs.length) {
    return `${prefix}/${tail}`;
  }
  return `${prefix}/${segs.join('/')}/${tail}`;
}
