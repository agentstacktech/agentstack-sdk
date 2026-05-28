import { buildFlatPathMap, getValueAtPath } from '../../src/cache/data-paths';

describe('data-paths', () => {
  it('getValueAtPath', () => {
    expect(getValueAtPath({ a: { b: 2 } }, 'a.b')).toBe(2);
    expect(getValueAtPath(null, 'a')).toBeUndefined();
  });

  it('buildFlatPathMap', () => {
    const m = buildFlatPathMap({ x: { y: 1 } });
    expect(m['x.y']).toBe(1);
  });
});
