import {
  createReadThroughCache,
  entityCacheKey,
} from '../../src/cache';

describe('ReadThroughCache', () => {
  it('get / set / has', () => {
    const c = createReadThroughCache<{ id: number }>();
    const key = entityCacheKey('agent', 'a1');
    expect(c.has(key)).toBe(false);
    c.set(key, { id: 1 });
    expect(c.has(key)).toBe(true);
    expect(c.get(key)).toEqual({ id: 1 });
  });

  it('getOrLoad caches loader result', async () => {
    const c = createReadThroughCache<string>();
    const key = 'user:42';
    let loads = 0;
    const loader = async () => {
      loads++;
      return 'loaded';
    };
    expect(await c.getOrLoad(key, loader)).toBe('loaded');
    expect(loads).toBe(1);
    expect(await c.getOrLoad(key, loader)).toBe('loaded');
    expect(loads).toBe(1);
  });

  it('getOrLoad skips cache on null/undefined', async () => {
    const c = createReadThroughCache<string>();
    const key = 'missing:1';
    expect(await c.getOrLoad(key, async () => null)).toBeUndefined();
    expect(c.has(key)).toBe(false);
    expect(await c.getOrLoad(key, async () => undefined)).toBeUndefined();
    expect(c.has(key)).toBe(false);
  });

  it('invalidate and invalidatePrefix', () => {
    const c = createReadThroughCache();
    c.set('agent:1', { v: 1 });
    c.set('agent:2', { v: 2 });
    c.set('logic:1', { v: 3 });
    expect(c.invalidate('agent:1')).toBe(true);
    expect(c.get('agent:1')).toBeUndefined();
    expect(c.invalidatePrefix('agent:')).toBe(1);
    expect(c.get('agent:2')).toBeUndefined();
    expect(c.get('logic:1')).toEqual({ v: 3 });
  });
});
