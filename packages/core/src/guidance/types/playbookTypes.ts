import { z } from 'zod';
import { GoalVerifySpecSchema, PathStepHelpBlockSchema } from './pathStepHelp';
import type { StepStatus } from './pathStepStatus';

export const PlaybookIdSchema = z.enum([
  'sell-digital-content',
  'host-static-site',
  'first-integration',
  'support-channel',
  'agents-first',
  'messenger-dm',
  'storage-upload',
  'webhook-ops',
  'api-keys',
  'logic-first',
  'scheduler-job',
  'wallet-payments',
  'micropath-synthetic',
  'project-safe-exit',
]);

export type PlaybookId = z.infer<typeof PlaybookIdSchema>;

const QuestionOptionSchema = z.object({
  id: z.string(),
  labelKey: z.string().optional(),
  labelDefault: z.string(),
  next: z.string(),
  set: z.record(z.unknown()).optional(),
});

const PlaybookNodeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('question'),
    id: z.string(),
    promptKey: z.string().optional(),
    promptDefault: z.string(),
    input: z.enum(['single_choice', 'chips', 'project_picker', 'text']),
    options: z.array(QuestionOptionSchema),
    capabilityHideOptionIds: z.array(z.string()).optional(),
    help: z.array(PathStepHelpBlockSchema).optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('task'),
    id: z.string(),
    titleKey: z.string().optional(),
    titleDefault: z.string(),
    mscTaskId: z.string(),
    /** Maps to ResourceSurfaceManifest action id (`frontend.platform.resource_surface.gen1`). */
    resourceActionId: z.string().optional(),
    help: z.array(PathStepHelpBlockSchema).optional(),
    verify: GoalVerifySpecSchema.optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('capability'),
    id: z.string(),
    titleKey: z.string().optional(),
    titleDefault: z.string(),
    taskId: z.string(),
    surface: z.enum(['inline', 'card', 'drawer', 'modal', 'page']).optional(),
    help: z.array(PathStepHelpBlockSchema).optional(),
    verify: GoalVerifySpecSchema.optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('verify'),
    id: z.string(),
    titleDefault: z.string(),
    verify: GoalVerifySpecSchema,
    help: z.array(PathStepHelpBlockSchema).optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('action'),
    id: z.string(),
    portId: z.string(),
    titleKey: z.string().optional(),
    titleDefault: z.string(),
    when: z.string().optional(),
    help: z.array(PathStepHelpBlockSchema).optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('recipe'),
    id: z.string(),
    recipeId: z.string(),
    narrativeId: z.string(),
    titleDefault: z.string().optional(),
    help: z.array(PathStepHelpBlockSchema).optional(),
    estimatedMin: z.number().optional(),
  }),
  z.object({
    kind: z.literal('outcome'),
    id: z.string(),
    messageKey: z.string().optional(),
    messageDefault: z.string(),
    help: z.array(PathStepHelpBlockSchema).optional(),
  }),
]);

export const ExecutionStepRuleSchema = z.object({
  when: z.record(z.unknown()),
  steps: z.array(z.string()),
});

export const PlaybookSchema = z.object({
  id: PlaybookIdSchema,
  version: z.number(),
  titleKey: z.string().optional(),
  titleDefault: z.string(),
  intentPatterns: z.array(z.string()),
  intentKeywords: z.array(z.string()),
  audienceMask: z.object({
    dev: z.boolean().optional(),
    user: z.boolean().optional(),
  }),
  entryNodeId: z.string(),
  nodes: z.record(z.string(), PlaybookNodeSchema),
  executionRules: z.array(ExecutionStepRuleSchema).optional(),
  defaultExecutionSteps: z.array(z.string()).optional(),
});

export type Playbook = z.infer<typeof PlaybookSchema>;
export type PlaybookNode = z.infer<typeof PlaybookNodeSchema>;
export type ExecutionStepRule = z.infer<typeof ExecutionStepRuleSchema>;

export type StepProgressEntry = {
  status: StepStatus;
  completedAt?: string;
  lastOpenedAt?: string;
  artifact?: { url?: string; count?: number; traceId?: string };
};

export type PlaybookStateV2 = {
  schemaVersion: 2;
  playbookId: PlaybookId;
  answers: Record<string, unknown>;
  currentNodeId: string;
  completedNodeIds: string[];
  projectId: number | null;
  stepProgress: Record<string, StepProgressEntry>;
  startedAt: string;
  updatedAt: string;
};

/** Legacy v1 shape (no schemaVersion). */
export type PlaybookStateV1 = {
  playbookId: PlaybookId;
  answers: Record<string, unknown>;
  currentNodeId: string;
  completedNodeIds: string[];
  projectId: number | null;
};

export type PlaybookState = PlaybookStateV2;

export type PathSessionIndex = {
  activePlaybookId: PlaybookId | null;
  sessions: Array<{
    playbookId: PlaybookId;
    percent: number;
    currentStepId: string;
    title: string;
    updatedAt: string;
  }>;
};

export type PlaybookEvent =
  | { type: 'ANSWER'; nodeId: string; optionId: string; patch?: Record<string, unknown> }
  | { type: 'SET_PROJECT'; projectId: number }
  | { type: 'ADVANCE' }
  | { type: 'ACTION_DONE'; nodeId: string }
  | { type: 'TASK_COMPLETE'; nodeId: string }
  | { type: 'STEP_FOCUS'; nodeId: string }
  | { type: 'STEP_OPEN'; nodeId: string }
  | { type: 'VERIFY_OK'; nodeId: string; artifact?: StepProgressEntry['artifact'] }
  | { type: 'SKIP'; nodeId: string }
  | { type: 'RESET' };

export type PathStepKind =
  | 'question'
  | 'task'
  | 'capability'
  | 'action'
  | 'recipe'
  | 'verify'
  | 'outcome';

export type PathStepPlan = {
  nodeId: string;
  kind: PathStepKind;
  phase: 'discover' | 'execute' | 'verify' | 'outcome';
  title: string;
  subtitle?: string;
  status: StepStatus;
  help: import('./pathStepHelp').PathStepHelpBlock[];
  mscTaskId?: string;
  /** PTC task id (`frontend.platform.capability_tasks.gen1`) */
  taskId?: string;
  capabilitySurface?: 'inline' | 'card' | 'drawer' | 'modal' | 'page';
  /** ResourceSurfaceManifest action id for `?action=` deep links */
  resourceActionId?: string;
  portId?: string;
  verifySpec?: import('./pathStepHelp').GoalVerifySpec;
  recipeId?: string;
  narrativeId?: string;
  estimatedMin?: number;
};

export type PathPlanResult = {
  steps: PathStepPlan[];
  currentIndex: number;
  percent: number;
  etaMin: number;
  focusedStepId: string | null;
};
