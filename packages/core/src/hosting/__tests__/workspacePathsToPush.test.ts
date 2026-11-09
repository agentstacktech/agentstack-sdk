import { workspacePathsToPush } from '../workspacePathsToPush';

describe('workspacePathsToPush', () => {
  it('includes new workspace paths and diff.upload paths', () => {
    const plan = {
      files: [{ path: 'index.html', bytes: 10 }],
      file_count: 1,
    };
    const diff = { upload: ['index.html'], skip: [] };
    const paths = workspacePathsToPush(['index.html', 'new.css'], plan, diff);
    expect(paths.sort()).toEqual(['index.html', 'new.css'].sort());
  });

  it('skips unchanged server paths', () => {
    const plan = {
      files: [{ path: 'ok.html', bytes: 5 }],
      file_count: 1,
    };
    const diff = { upload: [], skip: ['ok.html'] };
    expect(workspacePathsToPush(['ok.html'], plan, diff)).toEqual([]);
  });
});
