/**
 * Shared MCP one-shot helper — DRY for curated commands.
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import type { McpExecuteOptions, McpStep } from '@agentstack/sdk';
import type { CliRuntime } from './createRuntime.js';

export async function mcpAction(
  rt: CliRuntime,
  action: string,
  params: Record<string, unknown> = {},
  opts?: Partial<McpExecuteOptions> & { label?: string },
): Promise<unknown> {
  const steps: McpStep[] = [{ action, params }];
  const out = await rt.mcp(steps, {
    idempotencyKey: opts?.idempotencyKey,
    stopOnError: opts?.stopOnError,
  });
  if (rt.trace) {
    process.stderr.write(
      `[trace] mcp ${action} ok=${out.ok} status=${out.status ?? ''} err=${out.error ?? ''}\n`,
    );
  }
  if (!out.ok) {
    throw new Error(out.error || `${opts?.label || action} failed`);
  }
  return out.results[0]?.result ?? out.raw;
}
