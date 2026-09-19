/**
 * Diagnostics primitives shared with Neural Visualizer Gen2.
 * Genetic tags: shared.diagnostics.gene_heat.gen1, shared.neural.gene_token_index.gen1
 */

export {
  tagDomainPrefix,
  geneAddressCanonicalKey,
  geneAddressWithoutPii,
} from './geneAddress';
export type { GeneAddress } from './geneAddress';
export {
  TokenKind,
  tokenKey,
  parseToken,
  tokenizeQueryString,
  tokenizeAddress,
} from './geneToken';
export type { GeneToken } from './geneToken';
export type {
  NeuralGraphBffSlice,
  NeuralGraphCompositionEdge,
  NeuralGraphData,
  NeuralGraphExecutionLogsSlice,
  NeuralGraphGeneHeatSample,
  NeuralGraphHeatMeta,
  NeuralGraphHeatPayload,
  NeuralGraphHeatSample,
  NeuralGraphHostSlice,
  NeuralGraphInclude,
  NeuralGraphL1CacheNsStats,
  NeuralGraphOrganIndex,
  NeuralGraphOrganismCell,
  NeuralGraphRouterInfo,
} from './neuralGraph';
