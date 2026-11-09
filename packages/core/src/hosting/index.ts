/**
 * Hosting SDK atoms — genetic: sdk.hosting.gen2
 */
export {
  effectiveBucketName,
  normalizeBucketName,
  validateBucketName,
} from './hostingBucketResolver';
export type { HostingSiteBucketInput } from './hostingBucketResolver';
export {
  hostingQuickStartResponseSchema,
  type HostingQuickStartResponse,
} from './hostingQuickStartSchema';
export {
  HOSTING_SYNC_COMMIT_ACTION,
  HOSTING_SYNC_PLAN_ACTION,
  type HostingSyncCommitParams,
  type HostingSyncPlanParams,
} from './hostingSyncMcp';
export { buildSyncDiff, type LocalManifestRow, type ServerManifestRow, type SyncDiffResult } from './buildSyncDiff';
export {
  initWorkspace,
  getWorkspaceMeta,
  listWorkspaceFiles,
  getWorkspaceFile,
  putWorkspaceFile,
  deleteWorkspaceFile,
  type WorkspaceInitParams,
  type WorkspaceFilePutParams,
} from './workspace';
export {
  buildSiteAsync,
  HostingBuildError,
  type BuildSiteAsyncParams,
  type BuildSiteAsyncOptions,
} from './buildSiteAsync';
export {
  deploySyncPlan,
  fetchHostingSyncPlan,
  diffHostingSyncPlan,
  commitHostingSync,
  type HostingSyncPlanResult,
} from './deploySyncPlan';
export {
  deployHostingFilesSession,
  type DeployHostingFileRow,
} from './deployHostingFilesSession';
export {
  hostingDeployReceiptSchema,
  hostingDeployStateSchema,
  type HostingDeployReceipt,
} from './hostingDeployReceipt';
export { workspacePathsToPush } from './workspacePathsToPush';
export {
  routeDeploySurface,
  DEPLOY_RECIPES,
  type DeploySurfaceResolveResult,
} from './deploySurface';
