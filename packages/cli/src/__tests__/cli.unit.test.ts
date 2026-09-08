import { describe, expect, it, vi } from 'vitest';
import { mergeEnvOverrides, type CliConfig } from '../runtime/configStore.js';
import { mapErrorToExit, EXIT } from '../runtime/errors.js';
import { findCommand } from '../commands/registry.js';
import { mcpAction } from '../runtime/mcpAction.js';
import { DOCTOR_SCHEMA, doctorCommand } from '../commands/doctor.js';
import type { CliRuntime } from '../runtime/createRuntime.js';

describe('configStore paths', () => {
  it('resolveAgentStackHome prefers AGENTSTACK_HOME', async () => {
    const { resolveAgentStackHome } = await import('../runtime/configStore.js');
    expect(resolveAgentStackHome({ AGENTSTACK_HOME: 'C:\\tmp\\as-home' })).toBe(
      'C:\\tmp\\as-home',
    );
    expect(resolveAgentStackHome({ AGENTSTACK_HOME: '  ' }).endsWith('.agentstack')).toBe(
      true,
    );
  });
});

describe('config merge', () => {
  it('prefers env over profile', () => {
    const cfg: CliConfig = {
      apiBase: 'https://agentstack.tech/api',
      activeProfile: 'default',
      profiles: { default: { apiKey: 'from-file', projectId: 9 } },
    };
    const m = mergeEnvOverrides(cfg, {
      AGENTSTACK_API_KEY: 'from-env',
      AGENTSTACK_PROJECT_ID: '42',
    });
    expect(m.apiKey).toBe('from-env');
    expect(m.projectId).toBe(42);
  });

  it('honors AGENTSTACK_TOKEN alias', () => {
    const cfg: CliConfig = {
      apiBase: 'https://agentstack.tech/api',
      activeProfile: 'default',
      profiles: { default: {} },
    };
    const m = mergeEnvOverrides(cfg, { AGENTSTACK_TOKEN: 'tok-alias' });
    expect(m.apiKey).toBe('tok-alias');
  });

  it('saveConfig refuses when AGENTSTACK_CONFIG_READONLY=1', async () => {
    const { saveConfig } = await import('../runtime/configStore.js');
    await expect(
      saveConfig(
        {
          apiBase: 'https://agentstack.tech/api',
          activeProfile: 'default',
          profiles: { default: {} },
        },
        undefined,
        { AGENTSTACK_CONFIG_READONLY: '1' },
      ),
    ).rejects.toThrow(/read-only/);
  });
});

describe('errors', () => {
  it('maps auth and caps without over-matching usage strings', () => {
    expect(mapErrorToExit(new Error('missing token'))).toBe(EXIT.AUTH);
    expect(mapErrorToExit(new Error('service_cap_denied'))).toBe(EXIT.CAPS);
    expect(mapErrorToExit(new Error('usage: auth use-project <id>'))).toBe(EXIT.USAGE);
    expect(mapErrorToExit(new Error('auth.get_profile failed'))).toBe(EXIT.API);
    expect(mapErrorToExit(new Error('HTTP 401'))).toBe(EXIT.AUTH);
  });
});

describe('registry', () => {
  it('matches multi-word commands', () => {
    const { cmd, rest } = findCommand(['auth', 'use-project', '1444']);
    expect(cmd?.name).toBe('auth use-project');
    expect(rest).toEqual(['1444']);
  });

  it('matches generation gates (MCP name generation.gates)', () => {
    const { cmd } = findCommand(['generation', 'gates']);
    expect(cmd?.mcpAction).toBe('generation.gates');
  });

  it('matches projects get via SDK (not MCP get_stats)', () => {
    const { cmd } = findCommand(['projects', 'get']);
    expect(cmd?.sdkPath).toBe('platform.api.getProjectStats');
    expect(cmd?.mcpAction).toBeUndefined();
  });

  it('auth whoami uses SDK getProfile', () => {
    const { cmd } = findCommand(['auth', 'whoami']);
    expect(cmd?.sdkPath).toBe('platform.auth.getProfile');
  });

  it('lists auth profiles command', () => {
    const { cmd } = findCommand(['auth', 'profiles']);
    expect(cmd?.name).toBe('auth profiles');
  });

  it('matches bots list and crm contacts aliases', () => {
    expect(findCommand(['bots', 'list']).cmd?.name).toBe('bots list');
    expect(findCommand(['crm', 'contacts']).cmd?.name).toBe('crm contacts');
  });

  it('lists help and completion in registry SoT', () => {
    expect(findCommand(['help']).cmd?.name).toBe('help');
    expect(findCommand(['completion']).cmd?.name).toBe('completion');
  });
});

describe('help + completion', () => {
  it('commandHelp for hosting quick-start includes examples', async () => {
    const { commandHelp } = await import('../commands/help.js');
    const text = commandHelp(['hosting', 'quick-start']);
    expect(text).toContain('hosting quick-start');
    expect(text).toContain('Examples:');
    expect(text).toContain('SDK: hosting.quickStart');
  });

  it('completionScript bash is generated from ALL_COMMANDS including bots/crm', async () => {
    const { completionScript } = await import('../commands/completion.js');
    const sh = completionScript('bash');
    expect(sh).toContain('complete -F _agentstack agentstack');
    expect(sh).toMatch(/bots\)/);
    expect(sh).toContain('list');
    expect(sh).toMatch(/crm\)/);
    expect(sh).toContain('contacts');
    expect(sh).toMatch(/help/);
    expect(sh).toMatch(/completion\)/);
  });
});

describe('mcpAction', () => {
  it('passes idempotencyKey and throws on !ok', async () => {
    const mcp = vi.fn().mockResolvedValue({
      ok: false,
      error: 'boom',
      results: [],
      raw: {},
    });
    const rt = {
      mcp,
      trace: false,
    } as unknown as CliRuntime;
    await expect(mcpAction(rt, 'discovery.list', {}, { idempotencyKey: 'k1' })).rejects.toThrow(
      /boom/,
    );
    expect(mcp).toHaveBeenCalledWith(
      [{ action: 'discovery.list', params: {} }],
      expect.objectContaining({ idempotencyKey: 'k1' }),
    );
  });

  it('returns first step result on ok', async () => {
    const rt = {
      mcp: vi.fn().mockResolvedValue({
        ok: true,
        results: [{ ok: true, result: { actions: [1] } }],
        raw: {},
      }),
      trace: false,
    } as unknown as CliRuntime;
    await expect(mcpAction(rt, 'discovery.list')).resolves.toEqual({ actions: [1] });
  });
});

describe('saveConfig chmod', () => {
  it.skipIf(process.platform === 'win32')(
    'sets config.json mode to 0o600 on unix',
    async () => {
      const { mkdtemp, rm, stat } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const home = await mkdtemp(join(tmpdir(), 'as-cli-'));
      try {
        const { saveConfig } = await import('../runtime/configStore.js');
        await saveConfig(
          {
            apiBase: 'https://agentstack.tech/api',
            activeProfile: 'default',
            profiles: { default: {} },
          },
          home,
          {},
        );
        const mode = (await stat(join(home, 'config.json'))).mode & 0o777;
        expect(mode).toBe(0o600);
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
  );
});

describe('doctor report', () => {
  it('emits stable schema id', async () => {
    const printed: unknown[] = [];
    const rt = {
      apiKey: 'k',
      projectId: 1,
      apiBase: 'https://agentstack.tech/api',
      mcpUrl: 'https://agentstack.tech/mcp',
      trace: false,
      mcp: vi.fn().mockResolvedValue({ ok: true, results: [], raw: {} }),
      print: (data: unknown) => {
        printed.push(data);
      },
    } as unknown as CliRuntime;
    await doctorCommand.run(rt, []);
    expect(printed[0]).toMatchObject({
      schema: DOCTOR_SCHEMA,
      ok: true,
      connectivity: 'ok',
    });
  });
});

describe('sdk import contract', () => {
  it('exports symbols CLI depends on', async () => {
    const sdk = await import('@agentstack/sdk');
    const required = [
      'AgentStackSDK',
      'mcpExecute',
      'mcpDiscoverByIntent',
      'mcpGetDiscovery',
      'loginWithDeviceCodeForm',
      'resolvePublicOrigin',
      'resolveMcpUrl',
      'SDK_VERSION',
    ];
    for (const name of required) {
      expect(name in sdk).toBe(true);
    }
  });
});
