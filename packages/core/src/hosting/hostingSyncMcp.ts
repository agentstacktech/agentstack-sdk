/**
 * MCP hosting.sync.* action names for integrators (sdk.protocol / execute).
 * Genetic tag: sdk.commerce.assets.gen1 · core.hosting.bucket.gen1
 */

/** Server manifest includes sha256 (≤4MiB) + stat_fingerprint for large files when listing with hash mode. */
export const HOSTING_SYNC_PLAN_ACTION = 'hosting.sync.plan';
export const HOSTING_SYNC_COMMIT_ACTION = 'hosting.sync.commit';

export type HostingSyncPlanParams = {
  project_id: number;
  bucket_id?: string;
  bucket_name?: string;
  prefix?: string;
  /** When true, server includes sha256 for files ≤4MiB (heavy). */
  include_hashes?: boolean;
};

export type HostingSyncCommitParams = {
  project_id: number;
  upload_session_id: string;
  bucket_id?: string;
  publish?: boolean;
};
