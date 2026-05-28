import { AGENTNET_NATIVE } from '../agentnetIdentity';

const DECIMALS = AGENTNET_NATIVE.decimals;

/** Format atomic AGNT (18 decimals) for display without float precision loss on integers. */
export function formatAtomicAgnt(atomic: bigint | number): string {
  const bi = typeof atomic === 'bigint' ? atomic : BigInt(Math.trunc(atomic));
  const neg = bi < 0n;
  const abs = neg ? -bi : bi;
  const base = 10n ** BigInt(DECIMALS);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(DECIMALS, '0').replace(/0+$/, '');
  const sign = neg ? '-' : '';
  return fracStr ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

/** Parse human AGNT string to atomic units. */
export function parseAgntToAtomic(display: string): bigint {
  const s = display.trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) {
    throw new Error(`invalid AGNT amount: ${JSON.stringify(display)}`);
  }
  const neg = s.startsWith('-');
  const raw = neg ? s.slice(1) : s;
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > DECIMALS) {
    throw new Error(`too many decimal places (max ${DECIMALS})`);
  }
  const fracPadded = frac.padEnd(DECIMALS, '0');
  const atomic = BigInt(whole) * 10n ** BigInt(DECIMALS) + BigInt(fracPadded || '0');
  return neg ? -atomic : atomic;
}
