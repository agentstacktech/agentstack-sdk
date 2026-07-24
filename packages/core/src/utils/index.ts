/**
 * SDK Utilities
 * Универсальные утилиты для работы SDK
 */

export { ParallelLoader } from './ParallelLoader';
export { DataCache, rolesCache, permissionsCache, projectsCache, usersCache } from './DataCache';
export {
  FileStorage,
  fileToJSON,
  jsonToFile,
  fileToFileInfo,
  fileInfoToFile
} from './FileStorage';
export { isProjectActive, getActiveProjectsCount, filterActiveProjects, syncProjectStatus } from './projectHelpers';
export { 
  isActive, 
  getIsActive, 
  setIsActive, 
  filterActive, 
  getActiveCount, 
  toFlatProteinEntity, 
  getFlatValue,
  getNestedValue
} from './activityHelpers';

// Cache System
export {
  CacheManager,
  FileCacheManager,
  LocalStorageCacheStorage
} from './CacheManager';

// Logger - Universal logging system
export { logger, LogLevel } from './logger';
export { DiagnosticLogger, diagnosticLogger } from './DiagnosticLogger';
export {
  maskSecretForLog,
  maskBearerAuthorizationForLog,
  maskHeaderValueForLog
} from './maskSecretForLog';
export type { LoggerConfig } from './logger';
export { AuthStateStore } from './auth-state';

export type { LoaderConfig, LoaderResult, LoaderResults } from './ParallelLoader';
export type { CacheOptions, CacheEntry } from './DataCache';
export type { FileInfo, FileStorageOptions } from './FileStorage';
export type {
  CacheEntry as CacheManagerEntry,
  CacheOptions as CacheManagerOptions,
  CacheStats,
  CacheStorage
} from './CacheManager';

// Schema Helpers - JSON Schema utilities for processor schemas
export {
  getFieldType,
  getEnumValues,
  isEnumField,
  extractSchemaProperties,
  enrichPropertiesWithFallback,
  getProcessorProperties,
  PROCESSOR_FALLBACK_SCHEMAS,
  getUnaryOperations,
  getBinaryOperations,
  isUnaryOperation,
  isBinaryOperation,
  getOperationType
} from './schemaHelpers';
export type {
  FieldType,
  SchemaProperty
} from './schemaHelpers';

/** Unified HTTP + push health probe — @see docs/sdk/SDK_UNIFIED_CONNECTION_OFFLINE_FIRST_DECOMPOSITION.md */
export {
  probeAgentStackConnection,
  type AgentStackConnectionProbeResult
} from './connectionProbe';

/** Social public-card avatar paths (messenger, friends, ``usersPublicCards``). */
export {
  expandSocialAvatarPath,
  normalizeSocialPublicCardAvatar,
  type SocialPublicCardAvatar,
} from './socialPublicAvatar';

/** Auth transport / typed 503 classifier (DNA timeout cascade L3-01). */
export {
  classifyAuthFailure,
  extractAuthErrorFields,
  isNonRetryableAuthOrShed,
  isTypedDna503Code,
  TYPED_DNA_503_CODES,
  BATCH_TRANSPORT_SHED_CODES,
  type TransportKind,
  type TypedDna503Code,
} from './classifyAuthFailure';


