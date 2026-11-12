import { describe, expect, it } from 'vitest';
import { cleanName, localName, type IdChannel } from '../src/ui/index.js';

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
  it('a duplicated tab (copied sessionStorage) gets its own id; a reload or a restored tab keeps its id', () => {
    // a BroadcastChannel stand-in: every message reaches every other open channel, synchronously
    const open = new Set<IdChannel>();
    const channel = (): IdChannel => {
      const c: IdChannel = { onmessage: null, postMessage: (m) => { for (const o of open) if (o !== c) o.onmessage?.({ data: m }); }, close: () => void open.delete(c) };
      open.add(c);
      return c;
    };
    const copy = (s: ReturnType<typeof mem>) => { const n = mem(); for (const [k, v] of s.m) n.m.set(k, v); return n; };
    const local = mem(), tab1 = mem();
    const a = localName('stones', { local, session: tab1, channel });
    a.name = 'Аня';
    const original = a.id; // the game reads the id (joins a room)
    const dup = copy(tab1); // «Duplicate tab»: same sessionStorage
    const b = localName('stones', { local, session: dup, channel });
    expect(b.id).not.toBe(original);
    expect(dup.m.get('netplay:id:stones')).toBe(b.id); // the copy keeps its new id on its own reloads
    expect(b.name).toBe('Аня');
    expect(a.id).toBe(original); // the original never changes
    // reload of the original: the old page is gone (its channel closed), nobody answers → same id, same seat
    open.clear();
    expect(localName('stones', { local, session: tab1, channel }).id).toBe(original);
    // another game in the same tab is a separate id space
    expect(localName('wt', { local, session: tab1, channel }).id).not.toBe(original);
  });
  it('a real BroadcastChannel answers async: `await me.ready` before joining (invite link / ?join=)', async () => {
    const open = new Set<IdChannel>();
    const channel = (): IdChannel => {
      const c: IdChannel = { onmessage: null, postMessage: (m) => { for (const o of open) if (o !== c) setTimeout(() => o.onmessage?.({ data: m }), 2); }, close: () => void open.delete(c) };
      open.add(c);
      return c;
    };
    const tab1 = mem(), local = mem();
    const a = localName('g', { local, session: tab1, channel });
    await a.ready; const original = a.id;
    const dup = mem(); for (const [k, v] of tab1.m) dup.m.set(k, v);
    const b = localName('g', { local, session: dup, channel, waitMs: 50 });
    await b.ready; // resolved by the original's «mine», not by the timeout
    expect(b.id).not.toBe(original);
    open.clear(); // reload: nobody left to answer → ready after waitMs, id kept
    const t0 = Date.now(), r = localName('g', { local, session: tab1, channel, waitMs: 30 });
    await r.ready;
    expect([r.id, Date.now() - t0 >= 25]).toEqual([original, true]);
  });

  it('two localName() calls in one page (the real BroadcastChannel) keep one id', async () => {
    if (typeof BroadcastChannel !== 'function') return;
    const tab = mem(), local = mem();
    const a = localName('same-page', { local, session: tab }); await a.ready;
    const b = localName('same-page', { local, session: tab, waitMs: 40 }); await b.ready; // e.g. the lobby opened again
    expect(b.id).toBe(a.id);
  });

  it('an id the game already used is never swapped, and ?user= never asks', () => {
    const sent: unknown[] = [];
    const ch = (): IdChannel => ({ onmessage: null, postMessage: (m) => void sent.push(m), close: () => {} });
    const s = mem(); s.m.set('netplay:id:g', 'P-AAAA');
    let c!: IdChannel;
    const me = localName('g', { local: mem(), session: s, channel: () => (c = ch()) });
    expect(me.id).toBe('P-AAAA'); // read → locked
    c.onmessage?.({ data: { k: 'mine', game: 'g', id: 'P-AAAA', tab: 'other' } });
    expect(me.id).toBe('P-AAAA');
    c.onmessage?.({ data: { k: 'who', game: 'g', id: 'P-AAAA', tab: 'other' } });
    expect(sent.at(-1)).toMatchObject({ k: 'mine', id: 'P-AAAA' }); // and it answers for its id
    sent.length = 0;
    localName('g', { params: new URLSearchParams('user=bob'), local: mem(), session: mem(), channel: ch });
    expect(sent).toEqual([]);
  });
});

