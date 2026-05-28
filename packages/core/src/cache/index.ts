export {
  SNAPSHOT_NS_PROJECT_DATA,
  SNAPSHOT_NS_FIELD_ACCESS_POLICY,
  SNAPSHOT_NS_BLOB,
  SNAPSHOT_NS_PROTEIN_DATA,
  proteinDataQueryFingerprint,
  snapshotKeyProjectData,
  snapshotKeyFieldAccessPolicy,
  snapshotKeyBlob,
  snapshotKeyProteinData,
  snapshotKeyPrefixProjectData,
  snapshotKeyPrefixFieldAccessPolicy,
  snapshotKeyPrefixBlob,
  snapshotKeyPrefixProteinDataForProject,
  snapshotKeyPrefixProteinDataAll,
} from './snapshot-key-contract';

export {
  getValueAtPath,
  flattenProjectData,
  buildFlatDataPathSuggestions,
  buildFlatPathMap,
  FLATTEN_PROJECT_DATA_MAX_DEPTH,
  FLATTEN_PROJECT_DATA_MAX_ROWS,
} from './data-paths';
export type { FlatRow, FlatDataPathSuggestion, BuildFlatPathMapOptions } from './data-paths';

export {
  EntitySnapshotRepository,
  createEntitySnapshotRepository,
} from './entity-snapshot-repository';
export type {
  SnapshotMeta,
  SnapshotEnvelope,
  MergeStrategy,
  EntitySnapshotRepositoryOptions,
} from './entity-snapshot-repository';

export {
  persistSnapshotEnvelope,
  loadPersistedSnapshotEnvelope,
} from './snapshot-persistence';
export type { SnapshotPersistencePolicy } from './snapshot-persistence';
