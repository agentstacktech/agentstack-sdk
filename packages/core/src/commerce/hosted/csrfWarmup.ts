/**
 * Dedupe CSRF cookie warmup for hosted auth POSTs.
 * Gene: sdk.commerce.hosted.gen1
 */

let inFlight: Promise<void> | null = null;

export async function warmHostedCsrfCookie(): Promise<void> {
  if (inFlight) {
    await inFlight;
    return;
  }
  inFlight = (async () => {
    try {
      await fetch('/api/commerce/storefront/health', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch {
      /* best-effort */
    }
  })();
  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}
