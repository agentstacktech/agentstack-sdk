export {
  AgentProtocol,
  createAgentProtocol,
  type AgentProtocolDeps,
  type AgentProtocolOptions,
  type SearchSnapshotsOptions,
  type SnapshotSearchHit,
} from './AgentProtocol';
export {
  DiscoveryProtocol,
  type DescribeManyResult,
  type DiscoveryDescribeManyParams,
} from './discovery';
export { SerialMutationQueue } from './command-queue';
export {
  parsePath,
  getPath,
  projectPaths,
  setPath,
  type PathSegment,
  type PathSegKind,
} from './pathAtom';
export {
  ProteinDraftJournal,
  newProteinOpId,
  buildProteinDeltaExecuteBody,
  type ProteinCommitMode,
  type ProteinDraftDomain,
  type ProteinDraftOp,
  type ProteinDeltaRequest,
} from './proteinDraft';
