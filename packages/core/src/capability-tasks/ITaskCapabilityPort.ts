/**
 * Headless task port interface (`sdk.capability_tasks.gen1`).
 */

export type TaskCapabilityAudience = 'user' | 'developer' | 'platform';

export interface TaskCapabilityContext {
  projectId: number;
  audience: TaskCapabilityAudience;
  resourceId?: string;
  payload?: Record<string, unknown>;
}

export interface TaskCapabilityResult {
  artifact?: Record<string, unknown>;
  stepsDone?: number;
  /** When false, path/automation must not auto-advance (IPE-G17). */
  verified?: boolean;
}

export interface ITaskCapabilityPort {
  taskId: string;
  run(ctx: TaskCapabilityContext): Promise<TaskCapabilityResult>;
}
