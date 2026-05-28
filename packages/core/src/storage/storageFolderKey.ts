/** Mirrors ``shared.atoms.storage_ops`` (ROOT_FOLDER_KEY, SEGMENT_SEP). */

export const STORAGE_ROOT_FOLDER_KEY = '_';
export const STORAGE_SEGMENT_SEP = '__';

export function folderSegmentsFromKey(folderKey: string): string[] {
  const fk = (folderKey || '').trim();
  if (!fk || fk === STORAGE_ROOT_FOLDER_KEY) {
    return [];
  }
  return fk.split(STORAGE_SEGMENT_SEP).filter(Boolean);
}

export function folderKeyFromSegments(segments: string[]): string {
  if (!segments.length) {
    return STORAGE_ROOT_FOLDER_KEY;
  }
  return segments.join(STORAGE_SEGMENT_SEP);
}

/** Direct child folder keys under ``currentKey`` from the organelle ``folder_index`` list. */
export function childFolderKeysFromIndex(folderIndex: string[] | undefined, currentKey: string): string[] {
  if (!Array.isArray(folderIndex) || folderIndex.length === 0) {
    return [];
  }
  const cur = folderSegmentsFromKey(currentKey);
  const out: string[] = [];
  for (const fk of folderIndex) {
    if (typeof fk !== 'string' || !fk.trim()) {
      continue;
    }
    const segs = folderSegmentsFromKey(fk);
    if (segs.length !== cur.length + 1) {
      continue;
    }
    let prefixOk = true;
    for (let i = 0; i < cur.length; i += 1) {
      if (segs[i] !== cur[i]) {
        prefixOk = false;
        break;
      }
    }
    if (prefixOk) {
      out.push(fk);
    }
  }
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}
