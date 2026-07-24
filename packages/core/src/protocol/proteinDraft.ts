/**
 * Client ProteinDraftJournal — L1 last-write-wins coalesce before SoT flush.
 * Genetic tag: shared.neural.protein_store.gen1 / repo.platform.sdk.agent_protocol.gen1
 *
 * Mirrors server DirtyDiffJournal ergonomics without a second mutator bus.
 * Tier F domains must never use dirty commit_mode (fail-closed on server).
 */

import { setPath } from './pathAtom';

export type ProteinCommitMode = 'immediate' | 'dirty' | 'working_set';

export type ProteinDraftDomain =
  | 'crm_draft'
  | 'integration_draft'
  | 'agents_config'
  | 'logic_rules'
  | 'config';

export interface ProteinDraftOp {
  path: string;
  value: unknown;
  opId: string;
  at: number;
}

export function newProteinOpId(prefix = 'op'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class ProteinDraftJournal {
  private byPath = new Map<string, ProteinDraftOp>();
  private _dirtyAppend = 0;
  private _flushCount = 0;
  private _coalesced = 0;

  constructor(
    readonly domain: ProteinDraftDomain,
    readonly defaultCommitMode: ProteinCommitMode = 'working_set',
  ) {}

  /** Append path set; same path replaces prior op (coalesce). */
  set(path: string, value: unknown, opId?: string): ProteinDraftOp {
    const existing = this.byPath.get(path);
    this._dirtyAppend += 1;
    if (existing) this._coalesced += 1;
    const op: ProteinDraftOp = {
      path,
      value,
      opId: opId || newProteinOpId(this.domain),
      at: Date.now(),
    };
    this.byPath.set(path, op);
    return op;
  }

  size(): number {
    return this.byPath.size;
  }

  ops(): ProteinDraftOp[] {
    return [...this.byPath.values()].sort((a, b) => a.at - b.at);
  }

  /** Materialize coalesced ops onto base via PathAtom setPath. */
  materialize(base: Record<string, unknown> = {}): Record<string, unknown> {
    let out = { ...base };
    for (const op of this.ops()) {
      out = setPath(out, op.path, op.value, { copyRoot: true });
    }
    return out;
  }

  /** Flat updates map for protein DELTA ``updates``. */
  toUpdates(): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    for (const op of this.ops()) updates[op.path] = op.value;
    return updates;
  }

  /** Last op_id (for idempotency header / meta). */
  lastOpId(): string | undefined {
    const ops = this.ops();
    return ops.length ? ops[ops.length - 1]!.opId : undefined;
  }

  clear(): void {
    this.byPath.clear();
  }

  /** Call after successful SoT writer (REST or protein flush). */
  markFlushed(): void {
    this._flushCount += 1;
    this.clear();
  }

  get dirtyAppend(): number {
    return this._dirtyAppend;
  }

  get flushCount(): number {
    return this._flushCount;
  }

  get coalesced(): number {
    return this._coalesced;
  }

  /** dirty_append / flush — target ≥5 under chatty editors. */
  coalesceRatio(): number {
    return this._dirtyAppend / Math.max(this._flushCount, 1);
  }
}

export interface ProteinDeltaRequest {
  targetEntity: string;
  entityUuid?: string;
  entityId?: string | number;
  projectId?: number;
  userId?: number;
  updates: Record<string, unknown>;
  domain: ProteinDraftDomain | string;
  commitMode?: ProteinCommitMode;
  opId?: string;
}

/** Shape for POST /commands/execute DNA DELTA. */
export function buildProteinDeltaExecuteBody(req: ProteinDeltaRequest) {
  // R35: agents/logic/config prefer dirty (durable Save); drafts keep working_set.
  const domain = String(req.domain || 'config');
  const defaultMode: ProteinCommitMode =
    domain === 'crm_draft' || domain === 'integration_draft'
      ? 'working_set'
      : domain === 'agents_config' || domain === 'logic_rules' || domain === 'config'
        ? 'dirty'
        : 'working_set';
  const input_data: Record<string, unknown> = {
    domain: req.domain,
    commit_mode: req.commitMode ?? defaultMode,
  };
  if (req.opId) input_data.op_id = req.opId;
  if (req.entityUuid) input_data.uuid = req.entityUuid;
  if (req.entityId != null) input_data.id = req.entityId;
  if (req.projectId != null) input_data.project_id = req.projectId;
  if (req.userId != null) input_data.user_id = req.userId;

  return {
    command_type: 'dna',
    command_name: 'delta',
    payload: {
      target_entity: req.targetEntity,
      operation_type: 'delta',
      input_data,
      updates: req.updates,
    },
  };
}
