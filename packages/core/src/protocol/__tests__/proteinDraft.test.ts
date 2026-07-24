/**
 * PathAtom setPath + ProteinDraftJournal unit tests.
 */
import { describe, expect, it } from 'vitest';
import { getPath, setPath } from '../pathAtom';
import {
  ProteinDraftJournal,
  buildProteinDeltaExecuteBody,
  newProteinOpId,
} from '../proteinDraft';

describe('pathAtom setPath', () => {
  it('sets nested keys and list index', () => {
    const root = setPath({}, 'items[0].n', 3);
    expect(getPath(root, 'items[0].n')).toBe(3);
  });

  it('sets uid list member', () => {
    const root = setPath({}, 'items{u1}.n', 7);
    expect(getPath(root, 'items{u1}.n')).toBe(7);
  });
});

describe('ProteinDraftJournal', () => {
  it('coalesces same path and reports ratio', () => {
    const j = new ProteinDraftJournal('crm_draft');
    j.set('saved_views', [1]);
    j.set('saved_views', [1, 2]);
    j.set('saved_views', [1, 2, 3]);
    expect(j.size()).toBe(1);
    expect(j.dirtyAppend).toBe(3);
    expect(j.coalesced).toBe(2);
    const mat = j.materialize({});
    expect(mat.saved_views).toEqual([1, 2, 3]);
    j.markFlushed();
    expect(j.coalesceRatio()).toBe(3);
    expect(j.size()).toBe(0);
  });

  it('builds delta execute body', () => {
    const body = buildProteinDeltaExecuteBody({
      targetEntity: 'data_projects_8dna',
      entityUuid: 'abc',
      updates: { 'config.x': 1 },
      domain: 'agents_config',
      commitMode: 'dirty',
      opId: newProteinOpId('t'),
    });
    expect(body.command_name).toBe('delta');
    expect(body.payload.operation_type).toBe('delta');
    expect(body.payload.input_data.commit_mode).toBe('dirty');
    expect(body.payload.updates['config.x']).toBe(1);
  });

  it('R35: agents_config defaults commit_mode to dirty', () => {
    const body = buildProteinDeltaExecuteBody({
      targetEntity: 'data_projects_8dna',
      updates: { name: 'n' },
      domain: 'agents_config',
    });
    expect(body.payload.input_data.commit_mode).toBe('dirty');
  });

  it('R35: crm_draft defaults commit_mode to working_set', () => {
    const body = buildProteinDeltaExecuteBody({
      targetEntity: 'data_projects_8dna',
      updates: { saved_views: [] },
      domain: 'crm_draft',
    });
    expect(body.payload.input_data.commit_mode).toBe('working_set');
  });
});
