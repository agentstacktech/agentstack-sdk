import { isWalletCreditOk } from './walletCredit';

export type WalletCreditPollOptions = {
  intervalMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll until ledger sets wallet_credit=ok or payment hits a failure terminal. */
export async function pollUntilWalletCredit(
  read: () => Promise<string | undefined | { wallet_credit?: unknown; status?: string }>,
  options?: WalletCreditPollOptions,
): Promise<boolean> {
  const interval = options?.intervalMs ?? 1500;
  const timeout = options?.timeoutMs;
  const maxAttempts = options?.maxAttempts ?? (timeout ? undefined : 8);
  const sleep = options?.sleep ?? defaultSleep;
  const start = Date.now();
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const raw = await read();
      const credit =
        typeof raw === 'object' && raw !== null
          ? raw.wallet_credit
          : raw;
      const status =
        typeof raw === 'object' && raw !== null ? String(raw.status ?? '') : '';
      if (isWalletCreditOk(credit)) return true;
      if (
        status === 'failed' ||
        status === 'refunded' ||
        status === 'cancelled' ||
        status === 'expired'
      ) {
        return false;
      }
    } catch {
      /* read can race webhook */
    }
    if (maxAttempts !== undefined && attempt >= maxAttempts) return false;
    if (timeout !== undefined && Date.now() - start >= timeout) return false;
    await sleep(interval);
  }
}
