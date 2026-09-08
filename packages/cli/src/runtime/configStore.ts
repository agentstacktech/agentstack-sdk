/**
 * Config store — AGENTSTACK_HOME or ~/.agentstack (Windows: %USERPROFILE%\.agentstack).
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export interface CliProfile {
  apiKey?: string;
  projectId?: number;
}

export interface CliConfig {
  apiBase: string;
  mcpUrl?: string;
  defaultProjectId?: number;
  activeProfile: string;
  profiles: Record<string, CliProfile>;
  output?: 'human' | 'json' | 'quiet';
}

const DEFAULTS: CliConfig = {
  apiBase: 'https://agentstack.tech/api',
  activeProfile: 'default',
  profiles: { default: {} },
  output: 'human',
};

export function resolveAgentStackHome(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = env.AGENTSTACK_HOME?.trim();
  if (fromEnv) return fromEnv;
  return join(homedir(), '.agentstack');
}

export function configPath(home = resolveAgentStackHome()): string {
  return join(home, 'config.json');
}

export async function loadConfig(
  home = resolveAgentStackHome(),
): Promise<CliConfig> {
  try {
    const raw = await readFile(configPath(home), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    return {
      ...DEFAULTS,
      ...parsed,
      profiles: { ...DEFAULTS.profiles, ...(parsed.profiles || {}) },
    };
  } catch {
    return { ...DEFAULTS, profiles: { default: {} } };
  }
}

export async function saveConfig(
  cfg: CliConfig,
  home = resolveAgentStackHome(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (env.AGENTSTACK_CONFIG_READONLY === '1') {
    throw new Error(
      'config is read-only (AGENTSTACK_CONFIG_READONLY=1) — unset to write secrets',
    );
  }
  await mkdir(home, { recursive: true });
  const target = configPath(home);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
  await rename(tmp, target);
  if (platform() !== 'win32') {
    try {
      await chmod(target, 0o600);
    } catch {
      /* best-effort */
    }
  }
}

export function mergeEnvOverrides(
  cfg: CliConfig,
  env: NodeJS.ProcessEnv = process.env,
): {
  apiBase: string;
  mcpUrl: string | undefined;
  apiKey: string | undefined;
  projectId: number | undefined;
  profile: string;
} {
  const profileName =
    env.AGENTSTACK_PROFILE?.trim() || cfg.activeProfile || 'default';
  const profile = cfg.profiles[profileName] || {};
  const apiKey =
    env.AGENTSTACK_API_KEY?.trim() ||
    env.AGENTSTACK_ACCESS_TOKEN?.trim() ||
    env.AGENTSTACK_TOKEN?.trim() ||
    profile.apiKey;
  const projectRaw =
    env.AGENTSTACK_PROJECT_ID?.trim() ||
    (profile.projectId != null ? String(profile.projectId) : undefined) ||
    (cfg.defaultProjectId != null ? String(cfg.defaultProjectId) : undefined);
  const projectId = projectRaw ? Number(projectRaw) : undefined;
  return {
    apiBase: env.AGENTSTACK_API_BASE?.trim() || cfg.apiBase || DEFAULTS.apiBase,
    mcpUrl: env.AGENTSTACK_MCP_URL?.trim() || cfg.mcpUrl,
    apiKey,
    projectId:
      projectId != null && Number.isFinite(projectId) ? projectId : undefined,
    profile: profileName,
  };
}
