import {
  STORAGE_ROOT_FOLDER_KEY,
  childFolderKeysFromIndex,
  folderKeyFromSegments,
  folderSegmentsFromKey,
} from '../../src/storage/storageFolderKey';

describe('storageFolderKey', () => {
  it('parses root and segments', () => {
    expect(folderSegmentsFromKey('')).toEqual([]);
    expect(folderSegmentsFromKey(STORAGE_ROOT_FOLDER_KEY)).toEqual([]);
    expect(folderSegmentsFromKey('ecosystem')).toEqual(['ecosystem']);
    expect(folderSegmentsFromKey('ecosystem__docs')).toEqual(['ecosystem', 'docs']);
  });

  it('builds keys from segments', () => {
    expect(folderKeyFromSegments([])).toBe(STORAGE_ROOT_FOLDER_KEY);
    expect(folderKeyFromSegments(['a', 'b'])).toBe('a__b');
  });

  it('lists direct children from folder_index', () => {
    const idx = ['_', 'ecosystem', 'ecosystem__docs', 'other'];
    expect(childFolderKeysFromIndex(idx, STORAGE_ROOT_FOLDER_KEY).sort()).toEqual(['ecosystem', 'other'].sort());
    expect(childFolderKeysFromIndex(idx, 'ecosystem')).toEqual(['ecosystem__docs']);
  });
});
