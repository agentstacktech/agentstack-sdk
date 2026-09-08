/** SDK RAG module types (`sdk.rag.gen1`). */
import { describe, expect, it } from 'vitest';

import type { RagCollection, RagHealthSnapshot } from '../types';
import { AgentRag } from '../../modules/AgentRag';

describe('sdk.rag types', () => {
  it('accepts health snapshot shape', () => {
    const snap: RagHealthSnapshot = {
      persistence_mode: 'cell_sqlite',
      cell_sqlite: true,
      collections_count: 2,
    };
    expect(snap.persistence_mode).toBe('cell_sqlite');
  });

  it('accepts collection with user scope', () => {
    const col: RagCollection = {
      uuid: '00000000-0000-4000-8000-000000000001',
      project_id: 1,
      dna_user_id: 7,
      name: 'personal',
      scope: 'user',
    };
    expect(col.scope).toBe('user');
  });
});

describe('AgentRag', () => {
  it('calls /rag/health with home project', async () => {
    const calls: string[] = [];
    const client = {
      get: async (path: string, query?: Record<string, unknown>) => {
        calls.push(path);
        expect(query?.home_project_id).toBe('42');
        return { data: { success: true } };
      },
      post: async () => ({ data: {} }),
      delete: async () => ({ data: {} }),
    };
    const rag = new AgentRag(client as never);
    await rag.health({ homeProjectId: 42 });
    expect(calls[0]).toBe('/rag/health');
  });

  it('calls memory endpoints', async () => {
    const paths: string[] = [];
    const client = {
      get: async (path: string) => {
        paths.push(path);
        return { data: { turns: [] } };
      },
      post: async (path: string) => {
        paths.push(path);
        return { data: { success: true } };
      },
      delete: async () => ({ data: {} }),
    };
    const rag = new AgentRag(client as never);
    await rag.memoryGet('sess-1', 10);
    await rag.memoryAdd('sess-1', { role: 'user', content: 'hi' });
    expect(paths[0]).toBe('/rag/memory/sess-1');
    expect(paths[1]).toBe('/rag/memory/sess-1/add');
  });

  it('passes homeProjectId on search params', async () => {
    let params: Record<string, unknown> | undefined;
    const client = {
      get: async () => ({ data: {} }),
      post: async (
        _path: string,
        _body: unknown,
        config?: { params?: Record<string, unknown> },
      ) => {
        params = config?.params;
        return { data: { results: [] } };
      },
      delete: async () => ({ data: {} }),
    };
    const rag = new AgentRag(client as never);
    await rag.search('col-1', { query: 'hello' }, { homeProjectId: 99 });
    expect(params?.home_project_id).toBe('99');
  });

  it('passes homeProjectId on memory get/add/search', async () => {
    let getQuery: Record<string, unknown> | undefined;
    let postParams: Record<string, unknown> | undefined;
    const client = {
      get: async (_path: string, query?: Record<string, unknown>) => {
        getQuery = query;
        return { data: { turns: [] } };
      },
      post: async (
        _path: string,
        _body: unknown,
        config?: { params?: Record<string, unknown> },
      ) => {
        postParams = config?.params;
        return { data: { success: true, results: [] } };
      },
      delete: async () => ({ data: {} }),
    };
    const rag = new AgentRag(client as never);
    await rag.memoryGet('sess-1', 10, { homeProjectId: 42 });
    expect(getQuery?.home_project_id).toBe('42');
    expect(getQuery?.limit).toBe('10');

    await rag.memoryAdd('sess-1', { role: 'user', content: 'hi' }, { homeProjectId: 42 });
    expect(postParams?.home_project_id).toBe('42');

    await rag.memorySearch('sess-1', { query: 'x' }, { homeProjectId: 42 });
    expect(postParams?.home_project_id).toBe('42');
  });
});
