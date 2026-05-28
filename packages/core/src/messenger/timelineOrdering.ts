/**
 * Client/SDK mirror of messenger timeline ordering (HLC + author + id).
 * Genetic tag: ``sdk.messenger.ordering.gen1``
 */

export type MessengerWireMessage = Record<string, unknown>;

function parseHlcBase36(s: string | null | undefined): bigint {
  if (s == null || s === '') return 0n;
  const lower = s.toLowerCase();
  let out = 0n;
  const base = 36n;
  for (let i = 0; i < lower.length; i += 1) {
    const ch = lower.charCodeAt(i);
    let digit: number;
    if (ch >= 48 && ch <= 57) digit = ch - 48;
    else if (ch >= 97 && ch <= 122) digit = ch - 97 + 10;
    else return 0n;
    out = out * base + BigInt(digit);
  }
  return out;
}

function timelineKeyOfCompat(m: MessengerWireMessage): readonly [bigint, number, string] {
  const rawHlc = m.hlc;
  const hlc =
    typeof rawHlc === 'string' && rawHlc.trim() ? parseHlcBase36(rawHlc.trim()) : 0n;
  const authorRaw = m.author_user_id;
  const author =
    typeof authorRaw === 'number' && Number.isFinite(authorRaw) ? Math.trunc(authorRaw as number) : -1;
  const id = typeof m.id === 'string' ? m.id : '';
  if (hlc !== 0n) return [hlc, author, id];
  const seqRaw = m.seq;
  const seq =
    typeof seqRaw === 'number' && Number.isFinite(seqRaw) ? BigInt(Math.trunc(seqRaw as number)) << 16n : 0n;
  return [seq, author, id];
}

function compareTimelineKey(
  a: readonly [bigint, number, string],
  b: readonly [bigint, number, string]
): number {
  if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
  if (a[1] !== b[1]) return a[1] - b[1];
  if (a[2] < b[2]) return -1;
  if (a[2] > b[2]) return 1;
  return 0;
}

/** Stable ascending sort for ``messages.live`` / REST-poll batches. */
export function sortMessengerMessagesForLive(msgs: MessengerWireMessage[]): MessengerWireMessage[] {
  return msgs
    .map((m, i) => ({ m, i, k: timelineKeyOfCompat(m) }))
    .sort((a, b) => {
      const c = compareTimelineKey(a.k, b.k);
      return c !== 0 ? c : a.i - b.i;
    })
    .map((x) => x.m);
}
