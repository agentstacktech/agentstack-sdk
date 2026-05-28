export {
  parseTaskManifest,
  taskCapabilityManifestSchema,
  type TaskCapabilityManifestJson,
} from './taskManifestSchema';
export { taskManifestToMcpHints, type TaskMcpHint, type TaskManifestLike } from './taskManifestToMcpHints';
export type {
  ITaskCapabilityPort,
  TaskCapabilityContext,
  TaskCapabilityResult,
  TaskCapabilityAudience,
} from './ITaskCapabilityPort';
export {
  registerTaskCapabilityPort,
  clearTaskCapabilityPorts,
  runTaskCapability,
  listRegisteredTaskPorts,
} from './runTaskCapability';
export { TASK_CATALOG_METADATA, type TaskCatalogEntry } from './taskCatalogMetadata';
