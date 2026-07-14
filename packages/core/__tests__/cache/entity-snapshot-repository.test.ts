import {
  createEntitySnapshotRepository,
  snapshotKeyProjectData,
} from '../../src/cache';

describe('EntitySnapshotRepository', () => {
  it('setSnapshot / getSnapshot / has', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(1);
    expect(r.has(key)).toBe(false);
    r.setSnapshot(key, { a: 1 }, { fetchedAt: 1, revision: 'v1' });
    expect(r.has(key)).toBe(true);
    const snap = r.getSnapshot(key);
    expect(snap?.data).toEqual({ a: 1 });
    expect(snap?.meta.revision).toBe('v1');
  });

  it('getAtPath walks data', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(2);
    r.setSnapshot(key, { x: { y: 3 } }, { fetchedAt: 1 });
    expect(r.getAtPath(key, 'x.y')).toBe(3);
    expect(r.getAtPath(key, 'missing')).toBeUndefined();
  });

  it('invalidate and invalidatePrefix', () => {
    const r = createEntitySnapshotRepository();
    r.setSnapshot('project-data:1', {}, { fetchedAt: 1 });
    r.setSnapshot('project-data:2', {}, { fetchedAt: 1 });
    r.setSnapshot('other:1', {}, { fetchedAt: 1 });
    expect(r.invalidate('project-data:1')).toBe(true);
    expect(r.has('project-data:1')).toBe(false);
    const n = r.invalidatePrefix('project-data:');
    expect(n).toBe(1);
    expect(r.has('project-data:2')).toBe(false);
    expect(r.has('other:1')).toBe(true);
  });

  it('isFresh respects maxAgeMs from meta.fetchedAt', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(11);
    const now = Date.now();
    r.setSnapshot(key, { v: 1 }, { fetchedAt: now - 120_000 });
    expect(r.isFresh(key, 60_000)).toBe(false);
    expect(r.isFresh(key, 180_000)).toBe(true);
    r.setSnapshot(key, { v: 2 }, { fetchedAt: now });
    expect(r.isFresh(key, 60_000)).toBe(true);
    expect(r.invalidate(key)).toBe(true);
    expect(r.isFresh(key, 60_000)).toBe(false);
  });

  it('mergeSnapshot shallowMerge and deepMerge', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(9);
    r.setSnapshot(key, { a: 1, b: { c: 2 } }, { fetchedAt: 1 });
    r.mergeSnapshot(key, { b: { d: 3 } }, 'shallowMerge');
    expect(r.getSnapshot(key)?.data).toEqual({ a: 1, b: { d: 3 } });
    r.setSnapshot(key, { a: 1, b: { c: 2 } }, { fetchedAt: 2 });
    r.mergeSnapshot(key, { b: { d: 3 } }, 'deepMerge');
    expect(r.getSnapshot(key)?.data).toEqual({ a: 1, b: { c: 2, d: 3 } });
  });

  it('mergeSnapshot replace', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(10);
    r.setSnapshot(key, { a: 1 }, { fetchedAt: 1 });
    r.mergeSnapshot(key, { b: 2 }, 'replace');
    expect(r.getSnapshot(key)?.data).toEqual({ b: 2 });
  });

  it('getOrBuildPathIndex invalidates on revision change', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(3);
    r.setSnapshot(key, { p: 1 }, { fetchedAt: 1, revision: 'a' });
    const idx1 = r.getOrBuildPathIndex(key);
    expect(idx1?.p).toBe(1);
    r.setSnapshot(key, { p: 2 }, { fetchedAt: 2, revision: 'b' });
    const idx2 = r.getOrBuildPathIndex(key);
    expect(idx2?.p).toBe(2);
  });

  it('subscribe fires on set', () => {
    const r = createEntitySnapshotRepository();
    const key = snapshotKeyProjectData(4);
    let n = 0;
    const unsub = r.subscribe(key, () => {
      n++;
    });
    r.setSnapshot(key, {}, { fetchedAt: 1 });
    expect(n).toBe(1);
    unsub();
    r.setSnapshot(key, { a: 1 }, { fetchedAt: 2 });
    expect(n).toBe(1);
  });

  it('clear removes all', () => {
    const r = createEntitySnapshotRepository();
    r.setSnapshot('a:1', {}, { fetchedAt: 1 });
    r.setSnapshot('b:1', {}, { fetchedAt: 1 });
    r.clear();
    expect(r.has('a:1')).toBe(false);
    expect(r.has('b:1')).toBe(false);
  });
});
