/**
 * Fowler Money pattern — integer minor units (shared.commerce.money.gen1).
 */
export interface Money {
  readonly amount: number;
  readonly currency: string;
  readonly decimals: number;
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

/** Create Money from integer minor units (e.g. cents). */
export function money(amount: number, currency = 'USDT', decimals = 2): Money {
  return { amount: Math.round(amount), currency, decimals };
}

/** Create Money from major units (e.g. 9.99 USD). */
export function moneyFromMajor(major: number, currency = 'USDT', decimals = 2): Money {
  const factor = 10 ** decimals;
  return money(Math.round(major * factor), currency, decimals);
}

export function toMajor(m: Money): number {
  return m.amount / 10 ** m.decimals;
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { ...a, amount: a.amount + b.amount };
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { ...a, amount: a.amount - b.amount };
}

export function mulMoney(a: Money, quantity: number): Money {
  return { ...a, amount: Math.round(a.amount * quantity) };
}

export function compareMoney(a: Money, b: Money): number {
  assertSameCurrency(a, b);
  return a.amount - b.amount;
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

export function isNegative(m: Money): boolean {
  return m.amount < 0;
}

export function clampMoney(m: Money, min = 0): Money {
  return m.amount < min ? { ...m, amount: min } : m;
}

export function sumMoney(values: Money[]): Money {
  if (values.length === 0) return money(0);
  return values.reduce((acc, v) => addMoney(acc, v));
}

export function formatMoney(m: Money, locale = 'en-US'): string {
  const v = toMajor(m);
  if (m.currency === 'USDT' || m.currency === 'AGNT') {
    return `${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: m.decimals })} ${m.currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: m.currency,
      minimumFractionDigits: m.decimals,
      maximumFractionDigits: m.decimals,
    }).format(v);
  } catch {
    return `${v.toFixed(m.decimals)} ${m.currency}`;
  }
}

export function parseMoneyMinor(raw: unknown, currency = 'USDT', decimals = 2): Money {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? 0));
  if (!Number.isFinite(n)) return money(0, currency, decimals);
  return money(Math.round(n), currency, decimals);
}
