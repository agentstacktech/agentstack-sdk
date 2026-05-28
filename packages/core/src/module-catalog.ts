/**
 * Self-declarative SDK modules: docs, access paths, AI hints, examples.
 * Convention: each capability id may register metadata here; runtime merges with
 * `getCapabilityMatrix()` gates (`SDKConfig.modules`).
 *
 * @see docs/SDK_MODULE_CATALOG.md
 */

import {
  buildCapabilityMatrix,
  type SDKCapabilityEntry,
  type SDKCapabilityMatrix,
} from './platform-surface';
import { TASK_CATALOG_METADATA } from './capability-tasks/taskCatalogMetadata';

/** Repo-root relative doc paths (monorepo) or stable URLs. */
export type SDKDocRef = string;

export interface SDKModuleExample {
  label: string;
  code: string;
}

/**
 * One installable surface: same ids as capability matrix, plus discoverability.
 */
export interface SDKModuleSurface extends SDKCapabilityEntry {
  /** Typical code paths (canonical first). */
  accessPaths: string[];
  /** Where humans/AI read next. */
  docRefs: SDKDocRef[];
  /** Short bullets for prompts and tooling. */
  aiHints: string[];
  /** Copy-paste starters; keep tiny. */
  examples: SDKModuleExample[];
}

export interface SDKTaskCatalogEntry {
  taskId: string;
  domain: string;
  comfortBudget: number;
  shells: Array<'dev' | 'user'>;
}

export interface SDKModuleCatalog {
  /** Aligned with AgentStack product line (frontend + Core + SDK). */
  productVersion: string;
  generation: string;
  /** Platform then domain, each entry fully populated. */
  modules: SDKModuleSurface[];
  /** Comfort tasks (`sdk.capability_tasks.gen1`) — metadata only. */
  tasks: SDKTaskCatalogEntry[];
}

const DEFAULT_DOCS: SDKDocRef[] = ['docs/SDK_AI_SURFACE.md', 'docs/SDK_MODULE_CATALOG.md'];

const ACCESS_OVERRIDES: Partial<Record<string, string[]>> = {
  http: ['sdk.httpClient', 'sdk.platform.http'],
  snapshots: ['sdk.entitySnapshotRepository', 'sdk.platform.snapshots'],
  social: [
    'sdk.social',
    'sdk.platform.social',
    'sdk.platform.protocol.socialChatHistory',
    'sdk.platform.protocol.socialPublicIndex',
  ],
  support: ['sdk.support', 'sdk.platform.support'],
  webPush: ['sdk.webPush', 'sdk.platform.webPush', 'sdk.notifications.webPush'],
  activity: ['sdk.activity', 'sdk.platform.activity'],
  messengerEmbed: [
    'sdk.createMessengerEmbed',
    'sdk.platform.createMessengerEmbed',
    'sdk.platform.fetchMessengerThreadHistory',
    'sdk.platform.fetchMessengerSocialDelta',
    'sdk.platform.getMessengerChannelInvitesInbox',
    'sdk.platform.postMessengerChannelInvitesLinkToken',
    'sdk.platform.postMessengerChannelInvitesAccept',
    'sdk.platform.postMessengerChannelInvitesDecline',
    'sdk.platform.postMessengerChannelInvitesRedeem',
    'sdk.platform.postMessengerPublicPublish',
    'sdk.platform.postMessengerPublicUnpublish',
    'sdk.platform.getMessengerSettingsPrivacy',
    'sdk.platform.putMessengerSettingsPrivacy',
    'sdk.platform.postMessengerChatMessageComment',
    'sdk.platform.postMessengerChatMessageReact',
    'sdk.platform.postMessengerPushSurface',
    'sdk.platform.postMessengerChatReadSet',
    'sdk.platform.getMessengerPrefs',
    'sdk.platform.putMessengerPrefs',
    'sdk.platform.getMessengerChatReadMap',
    'sdk.platform.getMessengerChatIndex',
    'sdk.platform.putMessengerChatIndex',
    'sdk.platform.postMessengerChatIndexRemove',
    'sdk.platform.getMessengerFriendsRequestsOut',
    'sdk.platform.getMessengerFriendsUserIds',
    'sdk.platform.getMessengerFriendsCards',
    'sdk.platform.getMessengerChannel',
    'sdk.platform.getMessengerPublicQuota',
    'sdk.platform.getMessengerPublicMine',
    'sdk.platform.getMessengerPublicIndex',
    'sdk.platform.getMessengerPresenceOnline',
    'sdk.platform.postMessengerUsersPublicCards',
    'sdk.platform.postMessengerChannelCreate',
    'sdk.platform.postMessengerChannelsRegister',
    'sdk.platform.postMessengerChannelsUpdate',
    'sdk.platform.postMessengerDmEnsure',
    'sdk.platform.postMessengerChannelsDelete',
    'sdk.platform.getMessengerChannelHistory',
    'sdk.platform.postMessengerChannelMessagesResolve',
    'sdk.platform.postMessengerFriendRequest',
    'sdk.platform.postMessengerFriendsRemove',
    'sdk.platform.postMessengerFriendsBlock',
    'makeMessenger',
    'messengerFetchThreadHistory',
    'messengerFetchSocialDelta',
    'messengerChannelInvitesLinkToken',
    'messengerPublicPublish',
    'buildMessengerClientConfigFromHttpClientConfig',
    'MESSENGER_HOST_CONTRACT_VERSION',
  ],
};

function accessPathsFor(entry: SDKCapabilityEntry): string[] {
  const o = ACCESS_OVERRIDES[entry.id];
  if (o) return o;
  if (entry.layer === 'platform') {
    return [`sdk.platform.${entry.id}`];
  }
  return [`sdk.${entry.id}`];
}

/** Extra metadata keyed by capability id (omit id → defaults from matrix row). */
const MODULE_DOC_REFS: Partial<Record<string, SDKDocRef[]>> = {
  protocol: [
    'docs/AGENT_PROTOCOL.md',
    'docs/AGENT_PROTOCOL_QUICKSTART.md',
    'docs/SDK_AI_SURFACE.md',
  ],
  proteinCommandChannel: [
    'docs/AGENT_PROTOCOL.md',
    'agentstack-unified-sdk/packages/core/README.md',
  ],
  command: ['docs/AGENT_PROTOCOL.md'],
  api: ['docs/api/AI_INDEX.md', 'docs/SDK_AI_SURFACE.md'],
  auth: ['docs/USER_GUIDE_PROJECT_INTERACTION.md', 'docs/SDK_AI_SURFACE.md'],
  dna: ['shared/dna/AI_INDEX.md', 'docs/SDK_AI_SURFACE.md'],
  projects: ['docs/SDK_AI_SURFACE.md'],
  users: ['docs/SDK_AI_SURFACE.md'],
  rbac: ['docs/SDK_AI_SURFACE.md'],
  ecosystem: ['docs/ECOSYSTEM_INTERACTION_AND_NETWORKS.md'],
  social: ['docs/AGENTSOCIAL_MESSENGER_VISION_AND_ARCHITECTURE.md', 'docs/AGENT_PROTOCOL.md'],
  support: ['docs/AGENT_PROTOCOL.md', 'agentstack-core/endpoints/support_endpoints.py'],
  messengerEmbed: [
    'docs/SDK_AI_SURFACE.md',
    'docs/plans/MESSENGER_ACCELERATION_DECOMPOSITION.md',
    'agentstack-messenger/README.md',
  ],
  webPush: ['docs/AGENT_PROTOCOL.md'],
  neural: ['agentstack-core/shared/AI_INDEX.md', 'docs/MANAGED_ORGANISM_INTEGRATION_MAP.md'],
  payments: ['agentstack-unified-sdk/packages/core/README.md'],
  economy: [
    'docs/adr/AGENTCOIN_LEDGER_L0_AND_PUBLIC_ANCHORING.md',
    'docs/MCP_ECONOMY_AND_COMMERCE_MAP.md',
    'docs/sdk/AGENTNET_ECONOMY_INTEGRATOR_COOKBOOK.md',
    'agentstack-unified-sdk/packages/core/src/economy/AI_INDEX.md',
  ],
  admin: [
    'agentstack-unified-sdk/packages/core/src/modules/AgentAdmin.ts',
    'docs/operations/AGENTNET_ADMIN_RUNBOOK.md',
    'agentstack-frontend/src/modules/admin/pages/economy/AI_INDEX.md',
  ],
  docs: ['agentstack-unified-sdk/packages/core/README.md'],
  gameData: ['agentstack-unified-sdk/packages/core/README.md'],
  pageComposition: ['agentstack-unified-sdk/packages/core/README.md'],
  protein: ['agentstack-unified-sdk/packages/core/README.md'],
  logic: ['agentstack-frontend/src/components/logic/AI_INDEX.md'],
};

const MODULE_AI_HINTS: Partial<Record<string, string[]>> = {
  activity: [
    'Use sdk.activity.isActive to skip work in background tabs; call sdk.activity.registerRelaySession(session) to auto-poke on foreground restore.',
  ],
  protocol: [
    'Prefer sdk.platform.protocol for REST + 8DNA commands + snapshot helpers in one facade.',
    'Hot path: executeCommand, executeCommandsBatch, DNA list/get via protocol helpers.',
  ],
  proteinCommandChannel: [
    'Low-level POST /commands/* bus; prefer sdk.platform.protocol when possible.',
  ],
  api: ['REST projects/users/settings; pair with X-Project-ID when configured.'],
  auth: ['Login, refresh, profile; tokens flow through HTTPClient.'],
  dna: ['Table CRUD by 8DNA name; use sdk.projects / sdk.users for fixed tables.'],
  command: ['Rules Engine POST /command — see AGENT_PROTOCOL.md.'],
  snapshots: [
    'In-memory JSON snapshots; frontend bridges to React Query — invalidateAfterWrite.',
  ],
  neural: ['Client neural helpers; server organism lives in agentstack-core/shared.'],
  gameData: ['Game/protein data system on SDK root; gate via SDKConfig.modules.gameData.'],
  messengerEmbed: [
    'Prefer sdk.platform.createMessengerEmbed() over hand-rolled MessengerClientConfig when you already have AgentStackSDK.',
    'Thread snapshot: sdk.platform.fetchMessengerThreadHistory({ contour: dm|shared, … }) — no duplicate REST path assembly.',
  ],
  support: [
    'Use sdk.support.getMyThread / getStaffThread for typed `/api/support/*`; invalidate TanStack keys prefixed support.* after writes.',
  ],
};

const MODULE_EXAMPLES: Partial<Record<string, SDKModuleExample[]>> = {
  protocol: [
    {
      label: 'DNA command',
      code: "await sdk.platform.protocol.executeCommand({ /* ProteinCommandExecuteRequest */ })",
    },
    {
      label: 'REST projects',
      code: 'await sdk.platform.api.getProjects()',
    },
  ],
  api: [
    {
      label: 'List projects',
      code: 'await sdk.platform.api.getProjects()',
    },
  ],
  auth: [
    {
      label: 'Login',
      code: 'await sdk.platform.auth.login({ email, password })',
    },
  ],
  dna: [
    {
      label: 'List rows',
      code: "await sdk.platform.dna.list('data_projects_8dna', { unified_8dna_role: 'project', project_id: 1 })",
    },
  ],
  messengerEmbed: [
    {
      label: 'Long-poll channel',
      code: 'const m = sdk.platform.createMessengerEmbed(); m.channel({ homeProjectId, channelId }).messages.live(cb)',
    },
    {
      label: 'Thread history (dm vs shared)',
      code: "await sdk.platform.fetchMessengerThreadHistory({ homeProjectId, channelId, contour: 'dm', limit: 50 })",
    },
  ],
};

function docRefsFor(entry: SDKCapabilityEntry): SDKDocRef[] {
  return MODULE_DOC_REFS[entry.id] ?? DEFAULT_DOCS;
}

function aiHintsFor(entry: SDKCapabilityEntry): string[] {
  const extra = MODULE_AI_HINTS[entry.id];
  if (extra?.length) return extra;
  return [entry.description];
}

function examplesFor(entry: SDKCapabilityEntry): SDKModuleExample[] {
  return MODULE_EXAMPLES[entry.id] ?? [];
}

function surfaceFromEntry(entry: SDKCapabilityEntry): SDKModuleSurface {
  return {
    ...entry,
    accessPaths: accessPathsFor(entry),
    docRefs: docRefsFor(entry),
    aiHints: aiHintsFor(entry),
    examples: examplesFor(entry),
  };
}

/**
 * Full self-describing module list for tooling, docs generators, and agents.
 */
export function buildModuleCatalog(
  semantic: string,
  generation: string,
  domainGates?: Partial<Record<string, boolean>>
): SDKModuleCatalog {
  const matrix: SDKCapabilityMatrix = buildCapabilityMatrix(
    semantic,
    generation,
    domainGates
  );
  const modules: SDKModuleSurface[] = [
    ...matrix.platform.map(surfaceFromEntry),
    ...matrix.domain.map(surfaceFromEntry),
  ];
  return {
    productVersion: semantic,
    generation: matrix.generation,
    modules,
    tasks: [...TASK_CATALOG_METADATA],
  };
}
