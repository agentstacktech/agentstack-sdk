/**
 * Background tab → `session.away(true)`, back → `session.away(false)`. One line instead of every game wiring
 * `visibilitychange` by hand: `const off = bindVisibility(session);` … `off()`.
 */
import type { Session } from '../session.js';

export function bindVisibility<S, I, V>(session: Pick<Session<S, I, V>, 'away'>, doc: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'> = document): () => void {
  const on = () => session.away(doc.hidden);
  doc.addEventListener('visibilitychange', on);
  if (doc.hidden) on();
  return () => doc.removeEventListener('visibilitychange', on);
}
