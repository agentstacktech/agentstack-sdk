import { describe, expect, it } from 'vitest';
import { cleanName, localName } from '../src/ui/index.js';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };

describe('localName (ui)', () => {
  it('a stable per-tab id, a display name remembered across visits, both kept apart', () => {
    const local = mem(), tab1 = mem(), tab2 = mem();
    const a = localName('tribute', { local, session: tab1 });
    expect(a.id).toMatch(/^P-[A-Z0-9]{4}$/);
    expect(a.name).toBe(a.id); // no name yet → the id
    expect(localName('tribute', { local, session: tab1 }).id).toBe(a.id); // same tab, same id (a reload keeps the seat)
    a.name = '  Саша \u0007 ';
    expect(a.name).toBe('Саша');
    const b = localName('tribute', { local, session: tab2 }); // another tab of the same browser: another player
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe('Саша'); // …but the remembered name
    a.name = '';
    expect(a.name).toBe(a.id);
    expect(local.m.get('netplay:name')).toBe('');
  });
  it('?user= (QA links) wins and is not saved; no storage at all still works', () => {
    const local = mem();
    const q = localName('wt', { params: new URLSearchParams('user=alice'), local, session: mem() });
    expect([q.id, q.name]).toEqual(['alice', 'alice']);
    q.name = 'Alice B';
    expect(local.m.size).toBe(0);
    const bare = localName('x', { local: undefined, session: undefined });
    expect(bare.id).toMatch(/^P-/);
    expect(cleanName('x'.repeat(40), 'id')).toHaveLength(24);
    expect(cleanName('\n\t', 'id')).toBe('id');
  });
  it('works when every storage call throws (private mode / blocked cookies)', () => {
    const bad = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const me = localName('g', { local: bad, session: bad });
    expect(me.id).toMatch(/^P-[0-9A-Z]{1,4}$/);
    me.name = '  Саша\u0007  ';
    expect(me.name).toBe('Саша');
  });
});
