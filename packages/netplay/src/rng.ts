/**
 * Seeded deterministic RNG (sfc32). Same seed → same sequence on every JS engine.
 * Use `ctx.rng` inside `setup` / `step` / `apply`; store `rng.save()` in state only if you need
 * a stream that survives across ticks (most games can just use the per-tick ctx.rng).
 */
export interface Rng {
  /** Uniform uint32. */
  u32(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  /** Uniform float in [0, 1). Avoid in hashed state if other engines may round differently. */
  float(): number;
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates in place; returns the same array. */
  shuffle<T>(items: T[]): T[];
  /** Serializable cursor: `createRng(saved)` continues the same stream. */
  save(): RngState;
}

export type RngState = readonly [number, number, number, number];

/** 32-bit integer mix (lowbias32). Useful for deriving seeds. */
export function mix32(x: number): number {
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** Derive a child seed from a seed and any number of integers (tick, seat, match…). */
export function deriveSeed(seed: number, ...parts: number[]): number {
  let h = mix32(seed >>> 0);
  for (const p of parts) h = mix32((h ^ mix32((p | 0) >>> 0)) + 0x9e3779b9);
  return h >>> 0;
}

/** Seed from a string (room id + match number…). */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return mix32(h);
}

export function createRng(seed: number | RngState): Rng {
  let a: number, b: number, c: number, d: number;
  if (typeof seed === 'number') {
    a = 0x9e3779b9; b = 0x243f6a88; c = 0xb7e15162; d = seed >>> 0;
    for (let i = 0; i < 12; i++) next();
  } else {
    [a, b, c, d] = seed;
  }
  function next(): number {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return r >>> 0;
  }
  const rng: Rng = {
    u32: next,
    int(n) {
      if (!(n > 0)) throw new RangeError('rng.int(n): n must be > 0');
      return Math.floor((next() * n) / 4294967296);
    },
    float: () => next() / 4294967296,
    pick(items) {
      if (!items.length) throw new RangeError('rng.pick: empty');
      return items[rng.int(items.length)]!;
    },
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        const t = items[i]!;
        items[i] = items[j]!;
        items[j] = t;
      }
      return items;
    },
    save: () => [a >>> 0, b >>> 0, c >>> 0, d >>> 0] as const,
  };
  return rng;
}
