/**
 * StackScript MCP client. Wire JSON may coerce export `0`/`1` to booleans only when
 * `export_return_kinds[name]==='bool'` (bare comparisons). Ternary int arms stay numbers.
 */
import type { HTTPClient } from '../client/http-client';
import { normalizeMcpToolEnvelope } from '../agents/planGraph';
import { executeHostedMcpStepsWithRetry } from '../commerce/hosted/executeHostedMcpSteps';
import { mcpBatchStep, unwrapFirstMcpBatchStepData } from '../mcp/batchStepData';
import type { RequestConfig } from '../types';
import { resolveHostedMcpUrl } from '../mcp/urls';

/** MCP self-desc ladder row (`core.mcp.self_description.gen1`). */
export type StackscriptMcpNextActionRow = {
  action?: string;
  hint?: string;
  params?: Record<string, unknown>;
  kind?: string;
  paths?: unknown;
};

export type StackscriptSourceFile = { path: string; content: string };

/** Merge editor main file into a multi-file list (ephemeral dry_run / script.test). */
export function mergeStackscriptEphemeralFiles(
  entry: string,
  mainContent: string,
  files: StackscriptSourceFile[] = [],
): StackscriptSourceFile[] {
  const normalizedEntry = entry.trim() || 'main.ts';
  if (!files.length) {
    return [{ path: normalizedEntry, content: mainContent }];
  }
  return files.map((f) =>
    f.path === normalizedEntry ? { path: f.path, content: mainContent } : f,
  );
}

export interface ScriptPutParams {
  script_id: string;
  files: Array<{ path: string; content: string }>;
  /** S-11 entry file when files.length > 1; default main.ts for single-file puts */
  entry?: string;
  validate_only?: boolean;
  publish?: 'none' | 'staging' | 'live';
  base_version?: number;
  approve_caps?: boolean;
}

export interface ScriptPutReceipt {
  ok: boolean;
  version?: number;
  code_hash?: string;
  diagnostics?: Array<{ code?: string; message_en?: string }>;
  exports?: unknown[];
  export_names?: string[];
  next_actions?: StackscriptMcpNextActionRow[];
  base_version_for_next_put?: number;
  cost?: { fuel?: number; usd_est?: number };
  suggested_read_paths?: Record<string, string[]>;
  error?: string;
}

export interface ScriptListItem {
  script_id: string;
  live_version?: number;
  staging_version?: number;
  updated_at?: string;
}

export interface ScriptDryRunReceipt {
  ok?: boolean;
  error?: string;
  hint?: string;
  export_names?: string[];
  next_actions?: StackscriptMcpNextActionRow[];
  fuel_used?: number;
  dry_run?: boolean;
  write_set?: Array<{ path?: string[]; value?: unknown }>;
  events?: Array<Record<string, unknown>>;
  data?: { value?: unknown };
  cost?: { fuel?: number; usd_est?: number };
  timings?: {
    fuel_ms?: number;
    vm_ms?: number;
    bundle_ms?: number;
    commit_ms?: number;
  };
}

/** MCP `script.room.tick` success payload (presence smoke + optional host VM). */
export interface ScriptRoomTickReceipt {
  ok?: boolean;
  error?: string;
  hint?: string;
  next_actions?: StackscriptMcpNextActionRow[];
  fuel_used?: number;
  idempotency_key?: string;
  idempotent_replay?: boolean;
  room_host_bound?: boolean;
  tick?: number;
  skipped?: boolean;
  reason?: string;
  write_set?: Array<{ path?: string[]; value?: unknown }>;
  room_host_value?: unknown;
  vm_ms?: number;
  dna_committed?: boolean;
  write_set_applied?: number;
  dna_repair_path?: string;
  cost?: { fuel?: number; usd_est?: number };
  timings?: ScriptDryRunReceipt['timings'];
}

export interface ScriptArchiveReceipt {
  ok?: boolean;
  error?: string;
  script_id?: string;
}

export interface ScriptDeleteReceipt {
  ok?: boolean;
  error?: string;
  script_id?: string;
  deleted?: boolean;
}

export interface ScriptRoomLeaveReceipt {
  ok?: boolean;
  error?: string;
  room_name?: string;
}

/** MCP success=false still carries compiler/VM payload on `data`. */
export class StackscriptMcpError extends Error {
  readonly data: Record<string, unknown>;
  readonly errorKey: string;

  constructor(message: string, data: Record<string, unknown>) {
    super(message);
    this.name = 'StackscriptMcpError';
    this.data = data;
    const raw = String(data.error ?? message ?? '');
    this.errorKey = raw.includes(':') ? raw.split(':', 1)[0] : raw;
  }
}

export class StackscriptCapNotImplementedError extends StackscriptMcpError {
  readonly cap: string;

  constructor(cap: string, data: Record<string, unknown>) {
    super(`cap_not_implemented:${cap}`, { ...data, error: `cap_not_implemented:${cap}` });
    this.name = 'StackscriptCapNotImplementedError';
    this.cap = cap;
  }
}

export function stackscriptMcpErrorKey(err: string | undefined): string {
  const s = String(err ?? '').trim();
  if (!s) return '';
  const idx = s.indexOf(':');
  return idx > 0 ? s.slice(0, idx) : s;
}

/** Typed room-host tick failures (`script.room.tick` when_blocked). */
export const STACKSCRIPT_ROOM_TICK_ERROR_CODES = [
  'room_not_bound',
  'bytecode_stale',
  'stale_artifact',
  'revision_conflict',
  'revision_required',
] as const;

export type StackscriptRoomTickErrorCode =
  (typeof STACKSCRIPT_ROOM_TICK_ERROR_CODES)[number];

export type StackscriptRoomTickError = {
  code: StackscriptRoomTickErrorCode;
  message: string;
  hint?: string;
  nextActions?: StackscriptMcpNextActionRow[];
  data: Record<string, unknown>;
};

export function isStackscriptRoomTickErrorCode(
  code: string,
): code is StackscriptRoomTickErrorCode {
  return (STACKSCRIPT_ROOM_TICK_ERROR_CODES as readonly string[]).includes(code);
}

function roomTickErrorFromPayload(
  payload: Record<string, unknown>,
): StackscriptRoomTickError | null {
  const rawErr = String(payload.error ?? payload.error_code ?? '').trim();
  const key = stackscriptMcpErrorKey(rawErr) || rawErr;
  if (!isStackscriptRoomTickErrorCode(key)) return null;
  const hint =
    (typeof payload.hint === 'string' && payload.hint.trim()
      ? payload.hint.trim()
      : undefined) ??
    (typeof payload.instruction_hint === 'string' && payload.instruction_hint.trim()
      ? payload.instruction_hint.trim()
      : undefined);
  const nextActions = Array.isArray(payload.next_actions)
    ? (payload.next_actions as StackscriptMcpNextActionRow[])
    : undefined;
  return {
    code: key,
    message: hint || rawErr || key,
    hint,
    nextActions,
    data: payload,
  };
}

/** Map thrown MCP errors from script.room.tick to a narrow error shape. */
export function parseStackscriptRoomTickError(err: unknown): StackscriptRoomTickError | null {
  if (isStackscriptMcpError(err)) {
    return roomTickErrorFromPayload(err.data);
  }
  const payload = parseStackscriptMcpFailure(err);
  return payload ? roomTickErrorFromPayload(payload) : null;
}

/** Map ok:false script.room.tick envelopes (no throw). */
export function parseStackscriptRoomTickFailure(
  body: Record<string, unknown> | null | undefined,
): StackscriptRoomTickError | null {
  if (!body || body.ok !== false) return null;
  const merged = parseStackscriptMcpEnvelope(body) ?? body;
  const row = roomTickErrorFromPayload(merged);
  if (row && !row.hint) {
    const recovery = roomTickRecoveryHint(row.code);
    if (recovery) {
      return { ...row, hint: recovery, message: recovery };
    }
  }
  return row;
}

/** Fill Comfort recovery copy for hosted room ticks (distinct from turn `script.run`). */
export function roomTickRecoveryHint(code: StackscriptRoomTickErrorCode): string | undefined {
  switch (code) {
    case 'revision_conflict':
      return (
        'Server revision leaf changed — poll ecosystem.scripts.runtime.{room}.revision ' +
        'and retry script.room.tick with the same idempotency key room:{pid}:{room}:{tick}.'
      );
    case 'revision_required':
      return (
        'Pass expected_revision from ecosystem.scripts.runtime.{matchId}.revision on script.run ' +
        '(poll via createStackScriptMatchClient().pollMatchRevision).'
      );
    case 'bytecode_stale':
    case 'stale_artifact':
      return 'script.recompile_version then script.publish live before room ticks resume.';
    case 'room_not_bound':
      return 'script.put defineRoom + script.publish live; room_name must match export name.';
    default:
      return undefined;
  }
}

export function isStackscriptMcpError(err: unknown): err is StackscriptMcpError {
  return err instanceof StackscriptMcpError;
}

/** MCP failure payload for studio toasts — works with StackscriptMcpError or raw envelopes. */
/** VM return from script.run / dry_run / test MCP payloads. */
export function getStackscriptRunValue(payload: Record<string, unknown> | null | undefined): unknown {
  if (!payload) return undefined;
  if ('value' in payload) return payload.value;
  const data = payload.data;
  if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
    return (data as Record<string, unknown>).value;
  }
  return undefined;
}

export const STACKSCRIPT_INPUT_HELP =
  'P1 input: JSON array [2,3] (positional) or object {a:2,b:3}. __order lists field names ["a","b"], not values. Missing keys → input_missing_field; extra keys → unknown_input_field. Do not pass ctx (implicit VM local 0 for commands).';

const INSTRUCTION_SLICE_MERGE_KEYS = [
  'next_actions',
  'error_code',
  'hint',
  'instruction_hint',
  'diagnostics',
  'suggested_read_paths',
  'suggested_write_paths',
  'compile_code',
  'export_names',
  'wallet_repair_path',
  'dna_repair_path',
  'error_hints',
  'when_blocked',
] as const;

/** Lift self-desc fields from MCP instruction_slice (core.mcp.self_description.gen1). */
export function mergeStackscriptInstructionSlice(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const slice = payload.instruction_slice;
  if (!slice || typeof slice !== 'object') return payload;
  const s = slice as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...payload };
  for (const key of INSTRUCTION_SLICE_MERGE_KEYS) {
    if (merged[key] == null && s[key] != null) {
      merged[key] = s[key];
    }
  }
  return merged;
}

/** script.test expect_value — scalar or { value: ... } wrapper (MCP oneOf). */
export type StackscriptExpectValue =
  | number
  | boolean
  | null
  | { value: unknown };

export function parseStackscriptMcpFailure(err: unknown): Record<string, unknown> | null {
  let base: Record<string, unknown> | null = null;
  if (isStackscriptMcpError(err)) {
    base = err.data;
  } else if (err && typeof err === 'object') {
    const row = err as Record<string, unknown>;
    if (row.data && typeof row.data === 'object') {
      base = row.data as Record<string, unknown>;
    }
  }
  return base ? mergeStackscriptInstructionSlice(base) : null;
}

/** MCP envelope for run/dry_run — includes dry-run `write_set` when outer `ok` is true (E19). */
export function parseStackscriptMcpEnvelope(
  body: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const data = body.data;
  if (data && typeof data === 'object') {
    return mergeStackscriptInstructionSlice({
      ...body,
      ...(data as Record<string, unknown>),
    });
  }
  return mergeStackscriptInstructionSlice(body);
}

export function getStackscriptWriteSet(
  body: Record<string, unknown> | null | undefined,
): Array<{ path?: string[]; value?: unknown }> {
  const env = parseStackscriptMcpEnvelope(body);
  const raw = env?.write_set;
  return Array.isArray(raw) ? (raw as Array<{ path?: string[]; value?: unknown }>) : [];
}

export interface ScriptRunReceipt {
  ok?: boolean;
  error?: string;
  hint?: string;
  next_actions?: StackscriptMcpNextActionRow[];
  fuel_used?: number;
  data?: { value?: unknown };
  cost?: { fuel?: number; usd_est?: number };
  idempotent_replay?: boolean;
  invocation_id?: string;
  idempotency_key?: string;
  write_set_applied?: number;
  wallet_repair_path?: string;
  dna_repair_path?: string;
  recoverable?: boolean;
}

export interface ScriptFuelQuotePayload {
  quote_id: string;
  fuel_units: number;
  amount_usd: string;
  currency: string;
  expires_at: number;
  quote_hash: string;
  status?: string;
  project_id?: number;
  buyer_user_id?: number;
}

export interface ScriptFuelQuoteResponse {
  quote: ScriptFuelQuotePayload | Record<string, unknown>;
  quote_hash: string;
}

export interface ScriptFuelPurchaseReceipt {
  ok?: boolean;
  error?: string;
  fuel_units_granted?: number;
  prepaid_balance?: number;
  idempotency_key?: string;
  idempotent_replay?: boolean;
}

export interface ScriptWalletReplayReceipt {
  ok?: boolean;
  error?: string;
  wallet_repair_path?: string;
  script_id?: string;
  export?: string;
  status?: string;
  wallet_ops_applied?: number;
  ledger_entries_applied?: number;
  idempotent_replay?: boolean;
}

export interface ScriptDnaReplayReceipt {
  ok?: boolean;
  error?: string;
  dna_repair_path?: string;
  script_id?: string;
  export?: string;
  status?: string;
  write_set_applied?: number;
  idempotent_replay?: boolean;
}

export type StackScriptClientOptions = {
  /** MCP context.generation_env_uuid — sandbox anchor for put/test/dry_run/get/list */
  generationEnvUuid?: string;
  /** Use hosted cookie MCP at /s/{projectId}/mcp (G6b). */
  hostedMcp?: boolean;
  hostedApiBase?: string;
};

export function createStackScriptClient(
  http: HTTPClient,
  projectId: number,
  options?: StackScriptClientOptions,
) {
  const context: Record<string, unknown> = { project_id: projectId };
  if (options?.generationEnvUuid) {
    context.generation_env_uuid = options.generationEnvUuid;
  }

  const mcpRequestConfig = (): Partial<RequestConfig> | undefined => {
    const env = String(options?.generationEnvUuid ?? '').trim();
    return env ? { headers: { 'X-AgentStack-Env': env } } : undefined;
  };

  const postStep = async <T>(
    action: string,
    params: object,
    stepOptions?: { prodDnaCommit?: boolean },
  ): Promise<T> => {
    const prodCommit = Boolean(stepOptions?.prodDnaCommit);
    const batchContext = prodCommit
      ? { project_id: projectId }
      : context;
    const mcpPath = options?.hostedMcp
      ? resolveHostedMcpUrl(projectId, options?.hostedApiBase)
      : '/mcp';
    const extraConfig: Partial<RequestConfig> | undefined = options?.hostedMcp
      ? { skipAuthStateCheck: true, skipCache: true, cookieSessionMcp: true }
      : undefined;
    let res: unknown;
    let hostedStepPayload: Record<string, unknown> | undefined;
    if (options?.hostedMcp) {
      hostedStepPayload = (await executeHostedMcpStepsWithRetry(
        http,
        projectId,
        [
          {
            id: 'step_0',
            action,
            params: params as Record<string, unknown>,
          },
        ],
        {
          pickStepId: 'step_0',
          hostedApiBase: options?.hostedApiBase,
          mintCookieIfBearer: true,
        },
      )) as Record<string, unknown>;
      res = {
        steps: [{ id: 'step_0', data: hostedStepPayload }],
        ok: hostedStepPayload.ok !== false,
      };
    } else {
      res = await http.post(
        mcpPath,
        { action, params, context: batchContext },
        prodCommit ? extraConfig : { ...mcpRequestConfig(), ...extraConfig },
      );
    }
    const { success, data: envelopeData } = normalizeMcpToolEnvelope(res);
    const stepPayload = options?.hostedMcp
      ? (hostedStepPayload ?? unwrapFirstMcpBatchStepData(res))
      : envelopeData;
    const rawRow =
      res && typeof res === 'object' ? (res as Record<string, unknown>) : {};
    const row = {
      ...(stepPayload as Record<string, unknown>),
      ...(typeof rawRow.capability_result === 'object' && rawRow.capability_result
        ? { capability_result: rawRow.capability_result }
        : {}),
    } as Record<string, unknown>;
    let transportErr: string | undefined;
    if (res && typeof res === 'object') {
      const raw = (res as unknown as Record<string, unknown>).error;
      if (typeof raw === 'string' && raw) {
        transportErr = raw;
      }
    }
    const err =
      (typeof row.error === 'string' && row.error) || transportErr;
    if (!success) {
      const payload =
        (row.data && typeof row.data === 'object'
          ? (row.data as Record<string, unknown>)
          : row) as Record<string, unknown>;
      const hint =
        (typeof row.hint === 'string' && row.hint) ||
        (typeof payload.hint === 'string' ? payload.hint : undefined);
      const merged = {
        ...payload,
        error: err ?? payload.error,
        ...(typeof row.capability_result === 'object' && row.capability_result
          ? { capability_result: row.capability_result }
          : typeof payload.capability_result === 'object' && payload.capability_result
            ? { capability_result: payload.capability_result }
            : {}),
      };
      const key = stackscriptMcpErrorKey(typeof err === 'string' ? err : undefined);
      if (key === 'cap_not_implemented' && typeof err === 'string') {
        const cap = err.split(':', 2)[1]?.trim() || 'unknown';
        throw new StackscriptCapNotImplementedError(cap, merged);
      }
      throw new StackscriptMcpError(
        hint || err || `${action}_failed`,
        merged,
      );
    }
    const merged = parseStackscriptMcpEnvelope(row) ?? row;
    return merged as T;
  };

  return {
    put: (params: ScriptPutParams) => postStep<ScriptPutReceipt>('script.put', params),
    list: (limit = 100) =>
      postStep<{ items: ScriptListItem[] }>('script.list', { limit }),
    get: (
      script_id: string,
      version?: string,
      options?: { include_sources?: boolean },
    ) =>
      postStep('script.get', {
        script_id,
        version,
        ...(options?.include_sources ? { include_sources: true } : {}),
      }),
    studioBundle: (
      script_id: string,
      version?: string,
      options?: { include_sources?: boolean; max_versions?: number },
    ) =>
      postStep('script.studio_bundle', {
        script_id,
        version,
        include_sources: options?.include_sources === true,
        ...(options?.max_versions != null ? { max_versions: options.max_versions } : {}),
      }),
    versions: (
      script_id: string,
      options?: { include_sources?: boolean },
    ) =>
      postStep('script.versions', {
        script_id,
        ...(options?.include_sources ? { include_sources: true } : {}),
      }),
    recompileVersion: (params: {
      script_id: string;
      version: number;
    }) =>
      postStep('script.recompile_version', {
        script_id: params.script_id,
        version: params.version,
      }),
    publish: (params: {
      script_id: string;
      version: number;
      alias: string;
      approve_caps?: boolean;
    }) => postStep('script.publish', params),
    rollback: (params: {
      script_id: string;
      to_version: number;
      reason?: string;
      approve_caps?: boolean;
    }) =>
      postStep('script.rollback', {
        script_id: params.script_id,
        to_version: params.to_version,
        reason: params.reason ?? '',
        ...(params.approve_caps !== undefined ? { approve_caps: params.approve_caps } : {}),
      }),
    test: (
      script_id: string,
      version = 'latest',
      options?: {
        test_input?: Record<string, unknown> | unknown[];
        export?: string;
        expect_value?: StackscriptExpectValue;
        /** Ephemeral compile — omit script_id when files[] only. */
        files?: StackscriptSourceFile[];
        entry?: string;
      },
    ) =>
      postStep('script.test', {
        ...(script_id.trim() ? { script_id } : {}),
        version,
        ...(options?.test_input !== undefined ? { test_input: options.test_input } : {}),
        ...(options?.export ? { export: options.export } : {}),
        ...(options?.expect_value !== undefined
          ? { expect_value: options.expect_value }
          : {}),
        ...(options?.files?.length ? { files: options.files } : {}),
        ...(options?.entry ? { entry: options.entry } : {}),
      }),
    profile: (script_id: string) => postStep('script.profile', { script_id }),
    dryRun: (params: {
      script_id?: string;
      export: string;
      input?: Record<string, unknown> | unknown[];
      version?: string;
      files?: StackscriptSourceFile[];
      entry?: string;
    }) =>
      postStep<ScriptDryRunReceipt>('script.dry_run', {
        export: params.export,
        ...(params.script_id?.trim() ? { script_id: params.script_id } : {}),
        ...(params.input !== undefined ? { input: params.input } : {}),
        ...(params.version ? { version: params.version } : {}),
        ...(params.files?.length ? { files: params.files } : {}),
        ...(params.entry ? { entry: params.entry } : {}),
      }),
    /** Ephemeral multi-file dry_run without script.put (same wire as dryRun). */
    dryRunEphemeral: (params: {
      export: string;
      entry: string;
      files: StackscriptSourceFile[];
      input?: Record<string, unknown> | unknown[];
      script_id?: string;
      version?: string;
    }) =>
      postStep<ScriptDryRunReceipt>('script.dry_run', {
        export: params.export,
        entry: params.entry,
        files: params.files,
        ...(params.script_id?.trim() ? { script_id: params.script_id } : { script_id: 'ephemeral' }),
        ...(params.input !== undefined ? { input: params.input } : {}),
        ...(params.version ? { version: params.version } : {}),
      }),
    run: (params: {
      script_id: string;
      export: string;
      input?: Record<string, unknown> | unknown[];
      idempotency_key?: string;
      version?: string;
    }) => postStep<ScriptRunReceipt>('script.run', params, { prodDnaCommit: true }),
    docs: (topic = 'overview') => postStep('script.docs', { topic }),
    roomCreate: (params: { room_name: string; tick_hz?: number }) =>
      postStep('script.room.create', {
        room_name: params.room_name,
        ...(params.tick_hz != null ? { tick_hz: params.tick_hz } : {}),
      }),
    roomJoin: (params: { room_name: string }) =>
      postStep('script.room.join', { room_name: params.room_name }),
    roomLeave: (params: { room_name: string }) =>
      postStep<ScriptRoomLeaveReceipt>('script.room.leave', {
        room_name: params.room_name,
      }),
    roomTick: (params: { room_name: string }) =>
      postStep<ScriptRoomTickReceipt>('script.room.tick', { room_name: params.room_name }),
    archive: (script_id: string) =>
      postStep<ScriptArchiveReceipt>('script.archive', { script_id }),
    delete: (script_id: string, options?: { hard?: boolean }) =>
      postStep<ScriptDeleteReceipt>('script.delete', {
        script_id,
        ...(options?.hard != null ? { hard: options.hard } : {}),
      }),
    roomStatus: (params: { room_name: string }) =>
      postStep<Record<string, unknown>>('script.room.status', {
        room_name: params.room_name,
      }),
    fuelQuote: (params: { buyer_user_id: number; fuel_units: number }) =>
      postStep<ScriptFuelQuoteResponse>('stackscript.fuel.quote', {
        project_id: projectId,
        ...params,
      }),
    fuelPurchase: (params: {
      buyer_user_id: number;
      fuel_units: number;
      quote_id: string;
      quote_hash: string;
      idempotency_key: string;
    }) =>
      postStep<ScriptFuelPurchaseReceipt>('stackscript.fuel.purchase', {
        project_id: projectId,
        ...params,
      }),
    walletReplay: (wallet_repair_path: string) =>
      postStep<ScriptWalletReplayReceipt>('stackscript.wallet.replay', {
        project_id: projectId,
        wallet_repair_path,
      }),
    dnaReplay: (dna_repair_path: string) =>
      postStep<ScriptDnaReplayReceipt>('stackscript.dna.replay', {
        project_id: projectId,
        dna_repair_path,
      }),
    /** Logic shell: tpl_stackscript_trigger_shell (same MCP context / generation_env_uuid). */
    attachLogicShell: (params: {
      script_id: string;
      export_name: string;
      command?: string;
    }) =>
      postStep<{ logic_id?: string }>('logic.attach_template', {
        project_id: projectId,
        template_id: 'tpl_stackscript_trigger_shell',
        field_values: {
          script_id: params.script_id,
          export_name: params.export_name,
          command: params.command?.trim() || 'game.action',
        },
      }),
  };
}

/** Hosted /s/{pid}/mcp transport — cookie session, no operator Bearer (G6b). */
export function createHostedStackScriptClient(
  http: HTTPClient,
  projectId: number,
  options?: Omit<StackScriptClientOptions, 'hostedMcp'>,
) {
  return createStackScriptClient(http, projectId, { ...options, hostedMcp: true });
}
