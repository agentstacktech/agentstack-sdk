/**
 * Headless task runner — host registers ports (`sdk.capability_tasks.gen1`).
 */
import type { ITaskCapabilityPort, TaskCapabilityContext, TaskCapabilityResult } from './ITaskCapabilityPort';

const globalPorts = new Map<string, ITaskCapabilityPort>();

export function registerTaskCapabilityPort(port: ITaskCapabilityPort): void {
  globalPorts.set(port.taskId, port);
}

export function clearTaskCapabilityPorts(): void {
  globalPorts.clear();
}

/** Registered task ids (for agents and tests). */
export function listRegisteredTaskPorts(): string[] {
  return [...globalPorts.keys()];
}

export async function runTaskCapability(
  taskId: string,
  ctx: TaskCapabilityContext,
): Promise<TaskCapabilityResult> {
  const port = globalPorts.get(taskId);
  if (!port) {
    throw new Error(`unknown_task_capability_port:${taskId}`);
  }
  return port.run(ctx);
}
