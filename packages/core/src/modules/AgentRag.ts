/**
 * RAG platform REST client — `/api/rag/*`.
 * Genetic: `sdk.rag.gen1`
 */

import { HTTPClient } from '../client/http-client';
import type {
  RagBatchIngestResult,
  RagChunk,
  RagCollection,
  RagHealthSnapshot,
  RagIngestJobStatus,
  RagMemoryTurn,
  RagRequestOpts,
  RagScope,
  RagSearchHit,
} from '../rag/types';

function scopedQuery(
  opts?: RagRequestOpts,
  extra?: Record<string, string | AbortSignal>,
): Record<string, string | AbortSignal> | undefined {
  const q: Record<string, string | AbortSignal> = { ...(extra ?? {}) };
  if (opts?.homeProjectId) {
    q.home_project_id = String(opts.homeProjectId);
  }
  if (opts?.signal) {
    q.signal = opts.signal;
  }
  return Object.keys(q).length ? q : undefined;
}

export class AgentRag {
  constructor(private client: HTTPClient) {}

  health(opts?: RagRequestOpts) {
    return this.client.get<RagHealthSnapshot>('/rag/health', scopedQuery(opts));
  }

  listCollections(opts?: RagRequestOpts) {
    return this.client.get<{ success?: boolean; collections?: RagCollection[] }>(
      '/rag/collections',
      scopedQuery(opts),
    );
  }

  createCollection(body: {
    name: string;
    description?: string;
    embedding_provider?: string;
    scope?: RagScope;
    home_project_id?: number;
  }) {
    return this.client.post<{ success?: boolean; collection?: RagCollection }>(
      '/rag/collections',
      body,
    );
  }

  deleteCollection(collectionId: string, opts?: RagRequestOpts) {
    return this.client.delete<{ success?: boolean }>(
      `/rag/collections/${encodeURIComponent(collectionId)}`,
      scopedQuery(opts),
    );
  }

  listChunks(collectionId: string, limit = 100, opts?: RagRequestOpts) {
    return this.client.get<{ success?: boolean; chunks?: RagChunk[] }>(
      `/rag/collections/${encodeURIComponent(collectionId)}/documents`,
      scopedQuery(opts, { limit: String(limit) }),
    );
  }

  ingestDocument(
    collectionId: string,
    body: { content: string; source_doc_id?: string; metadata?: Record<string, unknown> },
    opts?: RagRequestOpts,
  ) {
    return this.client.post<{ success?: boolean; chunks_added?: number }>(
      `/rag/collections/${encodeURIComponent(collectionId)}/documents`,
      body,
      { params: scopedQuery(opts) },
    );
  }

  ingestDocumentBatch(
    collectionId: string,
    documents: Array<{ content: string; source_doc_id?: string; metadata?: Record<string, unknown> }>,
    opts?: RagRequestOpts,
  ) {
    return this.client.post<RagBatchIngestResult>(
      `/rag/collections/${encodeURIComponent(collectionId)}/documents/batch`,
      { documents },
      { params: scopedQuery(opts) },
    );
  }

  ingestFromStorage(
    collectionId: string,
    body: { file_id: string; source_doc_id?: string },
    opts?: RagRequestOpts,
  ) {
    return this.client.post<Record<string, unknown>>(
      `/rag/collections/${encodeURIComponent(collectionId)}/ingest-from-storage`,
      body,
      { params: scopedQuery(opts) },
    );
  }

  deleteDocument(collectionId: string, docId: string, opts?: RagRequestOpts) {
    return this.client.delete<{ success?: boolean }>(
      `/rag/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(docId)}`,
      scopedQuery(opts),
    );
  }

  exportCollection(collectionId: string, opts?: RagRequestOpts) {
    return this.client.get<{ success?: boolean; documents?: unknown[] }>(
      `/rag/collections/${encodeURIComponent(collectionId)}/export`,
      scopedQuery(opts),
    );
  }

  search(
    collectionId: string,
    body: {
      query: string;
      top_k?: number;
      hybrid?: boolean;
      mmr?: boolean;
      filters?: Record<string, unknown>;
    },
    opts?: RagRequestOpts,
  ) {
    return this.client.post<{ success?: boolean; results?: RagSearchHit[] }>(
      `/rag/collections/${encodeURIComponent(collectionId)}/search`,
      body,
      { params: scopedQuery(opts) },
    );
  }

  warmCollection(collectionId: string, opts?: RagRequestOpts) {
    return this.client.post<Record<string, unknown>>(
      `/rag/collections/${encodeURIComponent(collectionId)}/warm`,
      {},
      { params: scopedQuery(opts) },
    );
  }

  getIngestJobStatus(jobId: string, opts?: RagRequestOpts) {
    return this.client.get<RagIngestJobStatus>(
      `/rag/ingest-jobs/${encodeURIComponent(jobId)}`,
      scopedQuery(opts),
    );
  }

  memoryGet(sessionId: string, limit = 30, opts?: RagRequestOpts) {
    return this.client.get<{ success?: boolean; turns?: RagMemoryTurn[] }>(
      `/rag/memory/${encodeURIComponent(sessionId)}`,
      scopedQuery(opts, { limit: String(limit) }),
    );
  }

  memoryAdd(
    sessionId: string,
    body: { role: string; content: string },
    opts?: RagRequestOpts,
  ) {
    return this.client.post<Record<string, unknown>>(
      `/rag/memory/${encodeURIComponent(sessionId)}/add`,
      body,
      { params: scopedQuery(opts) },
    );
  }

  memorySearch(
    sessionId: string,
    body: { query: string; top_k?: number },
    opts?: RagRequestOpts,
  ) {
    return this.client.post<{ success?: boolean; results?: RagSearchHit[] }>(
      `/rag/memory/${encodeURIComponent(sessionId)}/search`,
      body,
      { params: scopedQuery(opts) },
    );
  }
}
