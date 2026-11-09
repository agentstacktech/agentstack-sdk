/**
 * String edit helpers (subset port of shared/atoms/text_edit.py).
 * Gene: shared.atoms.directed_edit.gen1
 */

export type TextEditErr = string | null;

const MAX_UNIFIED_DIFF_BYTES = 512_000;

export function insertBeforeAnchor(base: string, find: string, insert: string): [string, TextEditErr] {
  if (!find) return [base, 'replacement_not_found'];
  const idx = base.indexOf(find);
  if (idx < 0) return [base, 'replacement_not_found'];
  return [base.slice(0, idx) + insert + base.slice(idx), null];
}

export function insertAfterAnchor(base: string, find: string, insert: string): [string, TextEditErr] {
  if (!find) return [base, 'replacement_not_found'];
  const idx = base.indexOf(find);
  if (idx < 0) return [base, 'replacement_not_found'];
  const end = idx + find.length;
  return [base.slice(0, end) + insert + base.slice(end), null];
}

/** Single-line fuzzy: exact substring first, else line-window match (simplified). */
export function fuzzySingleReplace(
  base: string,
  replacements: Array<{ find?: string; replace?: string; search?: string; old?: string }>,
): [string, TextEditErr] {
  const item = replacements[0];
  if (!item) return [base, 'plan_ops_text_mode'];
  const find = String(item.find ?? item.search ?? '');
  const repl = String(item.replace ?? item.old ?? '');
  if (!find) return [base, 'plan_ops_text_mode'];
  if (!find.includes('\n')) {
    const idx = base.indexOf(find);
    if (idx < 0) return [base, 'replacement_not_found'];
    if (base.indexOf(find, idx + 1) >= 0) return [base, 'ambiguous_anchor'];
    return [base.slice(0, idx) + repl + base.slice(idx + find.length), null];
  }
  const lines = base.split('\n');
  const ctx = find.split('\n');
  const span = ctx.length;
  let best = -1;
  let bestScore = 0;
  let second = -1;
  let secondScore = 0;
  const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
  const normCtx = ctx.map(norm);
  for (let i = 0; i <= lines.length - span; i++) {
    const window = lines.slice(i, i + span).map(norm);
    let score = 0;
    for (let j = 0; j < span; j++) {
      const a = normCtx[j]!;
      const b = window[j]!;
      if (a === b) score += 1;
      else if (a && b && (a.includes(b) || b.includes(a))) score += 0.5;
    }
    score /= span;
    if (score >= 0.72) {
      if (score > bestScore) {
        secondScore = bestScore;
        second = best;
        bestScore = score;
        best = i;
      } else if (score > secondScore) {
        secondScore = score;
        second = i;
      }
    }
  }
  if (best < 0) return [base, 'text_anchor_miss'];
  if (second >= 0 && bestScore - secondScore < 0.08) return [base, 'ambiguous_anchor'];
  const outLines = [...lines];
  outLines.splice(best, span, repl);
  return [outLines.join('\n'), null];
}

/**
 * Strict unified diff on a single string (client preview). Fuzzy diff is server-only — use dry_run.
 */
export function applyUnifiedDiff(
  base: string,
  diffText: string,
  opts?: { strict?: boolean },
): [string, TextEditErr] {
  const strict = Boolean(opts?.strict);
  const diff = diffText.trim();
  if (!diff) return [base, 'patch_apply_failed'];
  if (new TextEncoder().encode(diff).length > MAX_UNIFIED_DIFF_BYTES) {
    return [base, 'patch_too_large'];
  }
  if (!strict) {
    return [base, 'patch_apply_failed'];
  }
  const lines = base.split('\n');
  const diffLines = diff.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  const out: string[] = [];
  let lineNo = 0;

  while (i < diffLines.length) {
    const row = diffLines[i]!;
    if (row.startsWith('@@')) {
      const m = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(row);
      if (!m) return [base, 'patch_apply_failed'];
      const oldStart = Math.max(0, Number(m[1]) - 1);
      while (lineNo < oldStart) {
        if (lineNo >= lines.length) return [base, 'patch_apply_failed'];
        out.push(lines[lineNo]!);
        lineNo += 1;
      }
      i += 1;
      while (i < diffLines.length && !diffLines[i]!.startsWith('@@')) {
        const h = diffLines[i]!;
        if (h.startsWith('---') || h.startsWith('+++') || h === '\\ No newline at end of file') {
          i += 1;
          continue;
        }
        const tag = h[0];
        const payload = h.slice(1);
        if (tag === ' ') {
          if (lineNo >= lines.length || lines[lineNo] !== payload) {
            return [base, 'patch_apply_failed'];
          }
          out.push(payload);
          lineNo += 1;
        } else if (tag === '-') {
          if (lineNo >= lines.length || lines[lineNo] !== payload) {
            return [base, 'patch_apply_failed'];
          }
          lineNo += 1;
        } else if (tag === '+') {
          out.push(payload);
        } else if (h === '') {
          i += 1;
          continue;
        } else {
          return [base, 'patch_apply_failed'];
        }
        i += 1;
      }
      continue;
    }
    if (row.startsWith('---') || row.startsWith('+++')) {
      i += 1;
      continue;
    }
    i += 1;
  }
  while (lineNo < lines.length) {
    out.push(lines[lineNo]!);
    lineNo += 1;
  }
  return [out.join('\n'), null];
}
