/**
 * Canonical AgentNet ledger account_key helpers (TS mirror of Python atoms).
 *
 * Gene: `shared.atoms.agentcoin.gen1` / `core.economy.agentnet.gen1`
 */

import { AGENTNET_NATIVE, AGENTNET_STABLE } from '../economy/agentnetIdentity';

export type AccountKeyScope =
  | 'treasury'
  | 'user'
  | 'bridge'
  | 'pool'
  | 'fee'
  | 'reserve'
  | 'compute_liability'
  | 'bridge_escrow';

export type AssetKind = 'native' | 'stable';

export interface AccountKey {
  scope: AccountKeyScope;
  projectLogicalId: number;
  subjectId?: string;
  assetKind?: AssetKind;
}

const SCOPE =
  'treasury|user|bridge|pool|fee|reserve|compute_liability|bridge_escrow';
const KEY_RE_NATIVE = new RegExp(`^agnt:(${SCOPE}):(\\d+)(?::([^:\\s]+))?$`);
const KEY_RE_STABLE = new RegExp(`^agusd:(${SCOPE}):(\\d+)(?::([^:\\s]+))?$`);

export class AccountKeyFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountKeyFormatError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function prefixFor(asset: AssetKind): string {
  return asset === 'stable' ? AGENTNET_STABLE.prefix : AGENTNET_NATIVE.prefix;
}

/** `agnt:user:{projectId}:{userId}` */
export function buildUserAgntKey(projectId: number, userId: number): string {
  return buildAccountKey({
    scope: 'user',
    projectLogicalId: projectId,
    subjectId: String(userId),
  });
}

export function buildAccountKey(ak: AccountKey, asset: AssetKind = ak.assetKind ?? 'native'): string {
  const base = `${prefixFor(asset)}:${ak.scope}:${ak.projectLogicalId}`;
  if (ak.subjectId) {
    if (ak.subjectId.includes(':')) {
      throw new AccountKeyFormatError("subjectId must not contain ':'");
    }
    return `${base}:${ak.subjectId}`;
  }
  return base;
}

export function parseAccountKey(s: string): AccountKey & { assetKind: AssetKind } {
  const raw = (s ?? '').trim();
  let m: RegExpExecArray | null;
  let assetKind: AssetKind;
  if (raw.startsWith('agnt:')) {
    m = KEY_RE_NATIVE.exec(raw);
    assetKind = 'native';
  } else if (raw.startsWith('agusd:')) {
    m = KEY_RE_STABLE.exec(raw);
    assetKind = 'stable';
  } else {
    throw new AccountKeyFormatError(`invalid account_key: ${JSON.stringify(s)}`);
  }
  if (!m) {
    throw new AccountKeyFormatError(`invalid account_key: ${JSON.stringify(s)}`);
  }
  const scope = m[1] as AccountKeyScope;
  const projectLogicalId = Number(m[2]);
  const subjectId = m[3];
  return {
    scope,
    projectLogicalId,
    assetKind,
    ...(subjectId != null ? { subjectId } : {}),
  };
}

export type AccountKeyClassification = AccountKeyScope | 'legacy' | 'unknown';

export function classifyAccountKey(accountKey: string): AccountKeyClassification {
  const raw = (accountKey ?? '').trim();
  if (raw.startsWith('agnt:') || raw.startsWith('agusd:')) {
    try {
      return parseAccountKey(raw).scope;
    } catch {
      return 'unknown';
    }
  }
  if (raw.startsWith('user:') || raw.startsWith('project:') || raw.startsWith('ecosystem:')) {
    return 'legacy';
  }
  return 'unknown';
}

export interface LedgerLineInput {
  account_key: string;
  asset_code?: string;
  side: string;
  amount_atomic: number;
}

/** Client-side mirror of double-entry validation (per asset_code). */
export function validateDoubleEntry(lines: LedgerLineInput[]): void {
  if (!lines.length || lines.length < 2) {
    throw new Error('batch must contain at least two legs');
  }
  const byAsset = new Map<string, { d: number; c: number }>();
  for (const ln of lines) {
    const asset = (ln.asset_code ?? AGENTNET_NATIVE.code).toUpperCase();
    const side = String(ln.side).trim().toUpperCase();
    let ch: 'D' | 'C';
    if (side === 'D' || side === 'DEBIT' || side === 'DEB') {
      ch = 'D';
    } else if (side === 'C' || side === 'CREDIT' || side === 'CRE') {
      ch = 'C';
    } else {
      throw new Error(`invalid side ${side}`);
    }
    const amt = Number(ln.amount_atomic);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error('amount_atomic must be a positive number');
    }
    const cur = byAsset.get(asset) ?? { d: 0, c: 0 };
    if (ch === 'D') {
      cur.d += amt;
    } else {
      cur.c += amt;
    }
    byAsset.set(asset, cur);
  }
  for (const [asset, { d, c }] of byAsset) {
    if (d !== c) {
      throw new Error(`unbalanced ledger for ${asset}: debits=${d} credits=${c}`);
    }
  }
}
