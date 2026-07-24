/**
 * GeneToken SDK mirror — shared.neural.gene_token_index.gen1
 */

export enum TokenKind {
  TAG = 'tag',
  TAG_FULL = 'tag_full',
  PATH = 'path',
  ENTITY = 'entity',
  SCOPE = 'scope',
  ROUTE = 'route',
}

export interface GeneToken {
  kind: TokenKind;
  value: string;
}

export function tokenKey(tok: GeneToken): string {
  return `${tok.kind}:${tok.value.toLowerCase()}`;
}

export function parseToken(raw: string): GeneToken {
  const text = raw.trim().toLowerCase();
  const idx = text.indexOf(':');
  if (idx > 0) {
    const kind = text.slice(0, idx) as TokenKind;
    const value = text.slice(idx + 1);
    if (!Object.values(TokenKind).includes(kind)) {
      throw new Error(`unknown token kind: ${kind}`);
    }
    return { kind, value };
  }
  return { kind: TokenKind.TAG, value: text };
}

function pathTokens(paths: string[]): GeneToken[] {
  const seen = new Set<string>();
  const out: GeneToken[] = [];
  for (const raw of paths) {
    for (const seg of raw.replace(/,/g, '.').split('.')) {
      const s = seg.trim().toLowerCase();
      if (s && !seen.has(s)) {
        seen.add(s);
        out.push({ kind: TokenKind.PATH, value: s });
      }
    }
  }
  return out;
}

export function tokenizeQueryString(query: string): GeneToken[] {
  const parts = query.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.map((p) => (p.includes(':') ? parseToken(p) : parseToken(`tag:${p}`)));
}

export function tokenizeAddress(input: {
  genetic_tag?: string;
  domain_path?: string;
  entity_key?: string;
  project_id?: number;
  user_id?: number;
  extra_paths?: string[];
}): GeneToken[] {
  const out: GeneToken[] = [];
  if (input.genetic_tag) {
    const t = input.genetic_tag.trim().toLowerCase();
    out.push({ kind: TokenKind.TAG_FULL, value: t });
    for (const seg of t.split('.')) {
      if (seg) out.push({ kind: TokenKind.TAG, value: seg });
    }
  }
  if (input.project_id != null) {
    out.push({ kind: TokenKind.SCOPE, value: `pid${input.project_id}` });
  }
  if (input.user_id != null) {
    out.push({ kind: TokenKind.SCOPE, value: `uid${input.user_id}` });
  }
  if (input.domain_path) {
    out.push(...pathTokens([input.domain_path]));
  }
  if (input.extra_paths?.length) {
    out.push(...pathTokens(input.extra_paths));
  }
  const dedup = new Map<string, GeneToken>();
  for (const tok of out) dedup.set(tokenKey(tok), tok);
  return [...dedup.values()];
}
