import { readMonorepoFixture } from '../../../__tests__/helpers/monorepoFixture';

import { parseCapabilityDescriptorFixture, parseMcpCapabilityDescriptorSlim, parseMcpCatalogActionRow } from '../capabilityDescriptor';
import {
  extractAsyncProjection,
  extractBlockingProjection,
  isBlockingProjectionState,
  isProjectionSettled,
  pollMcpVerificationAction,
  pollRagCollectionUntilReady,
  pollRagIngestUntilDone,
  readIngestJobDone,
  readProjectionState,
  readInformationalProjectionPending,
  batchStepPollFields,
  isCommittedPartial,
  MCC_PARTIAL_STATES,
} from '../capabilityResult';
import { resolveMcpProjectScope } from '../principalContext';

const descriptorFixture = readMonorepoFixture(__dirname, 'capability_descriptor_v1.json') as {
  version: number;
  descriptors: Array<{ id: string }>;
} | null;

describe('capabilityDescriptorSchema', () => {
  (descriptorFixture ? it : it.skip)(
    'parses shared fixture (core.fabric.capability_descriptor.gen1)',
    () => {
    const raw = descriptorFixture!;
    const parsed = parseCapabilityDescriptorFixture(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.descriptors.length).toBeGreaterThanOrEqual(2);
    expect(parsed.descriptors.some((d) => d.id === 'data_access.set_policy')).toBe(true);
    expect(parsed.descriptors.some((d) => d.id === 'context.get')).toBe(true);
  });

  it('parses MCP catalog slim enrichment (core.mcp.self_description.gen1)', () => {
    const slim = parseMcpCapabilityDescriptorSlim({
      id: 'crm.list_contacts',
      domain: 'crm',
      complexity: 'simple',
      source: 'overlay',
      genetic_tags: ['core.crm.hub.gen1'],
      when_to_use: 'List contacts before upsert.',
      related_tools: ['crm.upsert_contact'],
    });
    expect(slim.source).toBe('overlay');
    expect(slim.related_tools).toContain('crm.upsert_contact');
  });

  it('parses MCP catalog action row', () => {
    const row = parseMcpCatalogActionRow({
      action: 'crm.list_contacts',
      safe_action: 'crm_list_contacts',
      capability_descriptor: {
        id: 'crm.list_contacts',
        domain: 'crm',
        complexity: 'simple',
        source: 'overlay',
      },
    });
    expect(row.action).toBe('crm.list_contacts');
    expect(row.capability_descriptor?.source).toBe('overlay');
  });
});

const projectionParityFixture = readMonorepoFixture(
  __dirname,
  'mcp_projection_parity_v1.json',
) as {
  cases: Array<{
    payload: Record<string, unknown>;
    state: string;
    settled?: boolean;
    blocking?: boolean;
    batch_poll_fields?: Record<string, unknown>;
  }>;
} | null;

describe('readProjectionState golden parity (shared.mcp.helpers.gen1)', () => {
  (projectionParityFixture ? it : it.skip)('matches Python golden fixture cases', () => {
    const raw = projectionParityFixture!;
    for (const caseRow of raw.cases) {
      const got = readProjectionState(caseRow.payload);
      if (caseRow.state == null) {
        expect(got).toBeUndefined();
        continue;
      }
      expect(got).toBe(caseRow.state);
      if (caseRow.settled) {
        expect(isProjectionSettled(caseRow.state)).toBe(true);
      }
      if (caseRow.blocking === false) {
        expect(extractBlockingProjection(caseRow.payload)).toBeUndefined();
      }
      if (caseRow.batch_poll_fields) {
        const fields = batchStepPollFields(caseRow.payload);
        expect(fields.retryable).toBe(caseRow.batch_poll_fields.retryable);
        expect(fields.projection).toEqual(caseRow.batch_poll_fields.projection);
        expect(fields.next_actions).toEqual(caseRow.batch_poll_fields.next_actions);
        continue;
      }
      if (!caseRow.settled) {
        const proj = extractAsyncProjection(caseRow.payload);
        expect(proj).toBeDefined();
        expect(proj?.state).toBe(caseRow.state);
      }
    }
  });
});

describe('blocking vs informational projection (v3 parity)', () => {
  it('treats stale as informational — not batch-blocking', () => {
    expect(isBlockingProjectionState('stale')).toBe(false);
    expect(
      extractBlockingProjection({
        projection: { state: 'stale', verification_action: 'generation.list' },
      }),
    ).toBeUndefined();
    expect(isBlockingProjectionState('creating')).toBe(true);
  });
});

describe('readProjectionState', () => {
  it('reads projection.state from MCP poll hints', () => {
    expect(readProjectionState({ projection: { state: 'pending' } })).toBe('pending');
    expect(readProjectionState({ data: { projection_state: 'creating' } })).toBe('creating');
  });

  it('reads top-level projection_state and nested data.projection', () => {
    expect(readProjectionState({ projection_state: 'ready' })).toBe('ready');
    expect(
      readProjectionState({
        success: true,
        data: { projection: { state: 'deleting' } },
      }),
    ).toBe('deleting');
  });

  it('reads capability_result.data.projection (compact MCP envelope)', () => {
    expect(
      readProjectionState({
        capability_result: {
          ok: true,
          data: { projection: { state: 'creating', verification_action: 'rag.collection_get' } },
        },
      }),
    ).toBe('creating');
  });

  it('returns undefined for non-objects', () => {
    expect(readProjectionState(null)).toBeUndefined();
    expect(readProjectionState('pending')).toBeUndefined();
  });
});

describe('pollMcpVerificationAction', () => {
  it('treats done as settled without extra poll', async () => {
    const calls: string[] = [];
    const result = await pollMcpVerificationAction({
      verificationAction: 'rag.ingest_job_status',
      retryAfterMs: 0,
      maxAttempts: 3,
      execute: async (action) => {
        calls.push(action);
        return { projection: { state: 'done' } };
      },
    });
    expect(calls).toEqual(['rag.ingest_job_status']);
    expect(readProjectionState(result)).toBe('done');
  });

  it('polls until projection state is ready', async () => {
    const calls: string[] = [];
    let n = 0;
    const result = await pollMcpVerificationAction({
      verificationAction: 'rag.collection_get',
      retryAfterMs: 0,
      maxAttempts: 3,
      execute: async (action) => {
        calls.push(action);
        n += 1;
        return n < 2 ? { projection: { state: 'creating' } } : { projection: { state: 'ready' } };
      },
    });
    expect(calls).toEqual(['rag.collection_get', 'rag.collection_get']);
    expect(readProjectionState(result)).toBe('ready');
  });
});

describe('readInformationalProjectionPending', () => {
  it('reads CRM contact360 projection_pending without blocking semantics on success', () => {
    const pending = readInformationalProjectionPending({
      success: true,
      projection: {
        stale: false,
        state: 'ready',
        projection_pending: ['deals'],
      },
    });
    expect(pending).toEqual(['deals']);
    expect(isBlockingProjectionState('ready')).toBe(false);
  });
});

describe('extractBlockingProjection', () => {
  it('reads blocking projection from failed capability_result error details', () => {
    const proj = extractBlockingProjection({
      capability_result: {
        ok: false,
        error: {
          code: 'projection_pending',
          message: 'projection_not_ready',
          details: {
            projection: { state: 'pending', retryable: true },
          },
        },
      },
    });
    expect(proj?.state).toBe('pending');
  });
});

describe('pollRagCollectionUntilReady', () => {
  it('polls rag.collection_get until ready (v7 lifecycle)', async () => {
    const calls: string[] = [];
    let n = 0;
    const result = await pollRagCollectionUntilReady({
      projectId: 2,
      homeProjectId: 1444,
      collectionId: 'c-new',
      retryAfterMs: 0,
      maxAttempts: 4,
      execute: async (action, params) => {
        calls.push(action);
        expect(params).toEqual({
          home_project_id: 1444,
          project_id: 1444,
          collection_id: 'c-new',
        });
        n += 1;
        return n < 2 ? { projection: { state: 'creating' } } : { projection: { state: 'ready' } };
      },
    });
    expect(calls).toEqual(['rag.collection_get', 'rag.collection_get']);
    expect(readProjectionState(result)).toBe('ready');
  });

  it('keeps polling through not_ready then creating (v12 read model)', async () => {
    let n = 0;
    const result = await pollRagCollectionUntilReady({
      projectId: 2,
      collectionId: 'c-pending',
      retryAfterMs: 0,
      maxAttempts: 5,
      execute: async () => {
        n += 1;
        if (n === 1) {
          return { state: 'not_ready', error_code: 'not_ready', retryable: true };
        }
        if (n === 2) {
          return { projection: { state: 'creating' } };
        }
        return { projection: { state: 'ready' } };
      },
    });
    expect(n).toBe(3);
    expect(readProjectionState(result)).toBe('ready');
  });
});

describe('pollRagIngestUntilDone', () => {
  it('reads terminal ingest job from done flag', () => {
    expect(readIngestJobDone({ done: true, status: 'done' })).toBe(true);
    expect(readIngestJobDone({ done: false, status: 'pending' })).toBe(false);
  });

  it('polls rag.ingest_job_status until done', async () => {
    const calls: string[] = [];
    let n = 0;
    const result = await pollRagIngestUntilDone({
      projectId: 2,
      jobId: 'job-1',
      retryAfterMs: 0,
      maxAttempts: 4,
      execute: async (action, params) => {
        calls.push(action);
        expect(params).toEqual({
          home_project_id: 2,
          project_id: 2,
          job_id: 'job-1',
        });
        n += 1;
        return n < 2 ? { done: false, status: 'pending' } : { done: true, status: 'done' };
      },
    });
    expect(calls).toEqual(['rag.ingest_job_status', 'rag.ingest_job_status']);
    expect(readIngestJobDone(result)).toBe(true);
  });

  it('prefers homeProjectId over projectId for RAG scope', async () => {
    const calls: string[] = [];
    await pollRagIngestUntilDone({
      projectId: 2,
      homeProjectId: 1444,
      jobId: 'job-1',
      retryAfterMs: 0,
      maxAttempts: 1,
      execute: async (_action, params) => {
        calls.push(JSON.stringify(params));
        return { done: true, status: 'done' };
      },
    });
    expect(calls[0]).toContain('"home_project_id":1444');
  });
});

describe('isCommittedPartial (MCC v6)', () => {
  it('detects partial committed realign payloads', () => {
    expect(
      isCommittedPartial({
        committed: true,
        state: 'partial',
        applied_deletes: 18,
      }),
    ).toBe(true);
    expect(MCC_PARTIAL_STATES.has('partial')).toBe(true);
    expect(isCommittedPartial({ committed: true, state: 'done' })).toBe(false);
  });
});

describe('resolveMcpProjectScope', () => {
  it('prefers home_project_id from params', () => {
    expect(
      resolveMcpProjectScope({ home_project_id: 1444, project_id: 2 }, { project_id: 1 }),
    ).toBe(1444);
  });
});
