import type { CliRuntime } from '../runtime/createRuntime.js';

export interface CommandSpec {
  name: string;
  description: string;
  /** MCP action when command uses agentstack.execute */
  mcpAction?: string;
  /** SDK facade path when command uses REST/SDK (shown in help) */
  sdkPath?: string;
  /** One-line usage after command name */
  usage?: string;
  examples?: string[];
  run: (rt: CliRuntime, args: string[]) => Promise<void>;
}

export function parseFlagValue(
  args: string[],
  name: string,
): string | undefined {
  const long = `--${name}`;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === long && args[i + 1]) return args[i + 1];
    if (args[i]?.startsWith(`${long}=`)) return args[i].slice(long.length + 1);
  }
  return undefined;
}

export function hasFlag(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

export function parseJsonFlag(args: string[], name: string): Record<string, unknown> {
  const raw = parseFlagValue(args, name);
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export function positional(args: string[]): string[] {
  return args.filter((a) => !a.startsWith('-'));
}
