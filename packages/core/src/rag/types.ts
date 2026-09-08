/**
 * RAG platform types — mirrors `shared/atoms/rag_manifest.py` + REST `/api/rag/*`.
 * Genetic: `sdk.rag.gen1`
 */

export type RagScope = 'project' | 'user';

export type RagCollectionStats = {
  doc_count?: number;
  chunk_count?: number;
  last_indexed_at?: string | null;
};

export type RagCollectionConfig = {
  embedding_provider?: string;
  tq_bits?: number;
};

export type RagStorageRef = {
  format?: 'rag_sqlite_v1';
  folder_key?: string;
  index_file?: string;
  file_id?: string | null;
  bytes?: number;
  sha256?: string;
  relative_path?: string;
};

/** Thin collection row from list/create endpoints. */
export type RagCollection = {
  uuid: string;
  id?: string;
  collection_uuid?: string;
  project_id: number;
  dna_user_id?: number;
  name: string;
  description?: string;
  scope?: RagScope;
  config?: RagCollectionConfig;
  stats?: RagCollectionStats;
  storage_ref?: RagStorageRef;
  created_at?: string;
};

export type RagCellManifest = {
  schema_version?: 1;
  collections?: Record<string, RagCollectionManifest>;
  memory_ref?: RagStorageRef | null;
};

export type RagCollectionManifest = {
  id: string;
  name: string;
  scope?: RagScope;
  description?: string;
  storage_ref: RagStorageRef;
  stats?: RagCollectionStats;
  config?: RagCollectionConfig;
  created_at?: string | null;
};

export type RagErrorCode =
  | 'rag_embed_quota'
  | 'rag_embed_rate_limit'
  | 'rag_embed_auth'
  | 'rag_embed_failed'
  | 'rag_batch_all_failed'
  | 'rate_limit_exceeded';

export type RagHealthSnapshot = {
  success?: boolean;
  persistence_mode?: string;
  cell_sqlite?: boolean;
  backup_fallback?: boolean;
  project_id?: number;
  collections_count?: number;
  total_chunks?: number;
  integrity_issues?: number;
  embedding_credentials_ready?: boolean | null;
  embedding_quota_ok?: boolean | null;
  embedding_provider?: string | null;
  embed_circuit_state?: string | null;
  embed_last_error_code?: string | null;
  embed_last_probe_at?: string | null;
  index_integrity?: Array<{
    collection_id?: string;
    name?: string;
    chunk_count?: number;
    manifest_sha256?: string | null;
    sha256_ok?: boolean | null;
  }>;
  ingest_queue?: Record<string, number>;
};

export type RagIngestJobStatus = {
  success?: boolean;
  job_id?: string;
  status?: 'pending' | 'reserved' | 'done' | 'failed' | 'deduped' | string;
  queue?: string;
  project_id?: number;
  collection_id?: string;
  attempts?: number;
  max_attempts?: number;
  last_error?: string | null;
  done?: boolean;
};

export type RagSearchHit = {
  doc_id?: string;
  text?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  source_doc_id?: string;
  chunk_index?: number;
};

export type RagChunk = {
  uuid?: string;
  doc_id: string;
  text: string;
  chunk_index: number;
  source_doc_id?: string;
  metadata?: Record<string, unknown>;
  content_hash?: string;
  vector_compressed?: string;
};

export type RagMemoryTurn = {
  role?: string;
  content?: string;
  turn_index?: number;
  session_id?: string;
  [key: string]: unknown;
};

export type RagBatchIngestResult = {
  success?: boolean;
  queued?: boolean;
  job_ids?: string[];
  ingested?: number;
  errors?: unknown[];
};

export type RagRequestOpts = {
  homeProjectId?: number;
  signal?: AbortSignal;
};
