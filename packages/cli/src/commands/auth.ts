import {
  DEFAULT_DEVICE_SCOPES,
  loginWithDeviceCodeForm,
} from '@agentstack/sdk';
import type { CommandSpec } from './types.js';
import { hasFlag, parseFlagValue, positional } from './types.js';
import { printErr } from '../runtime/output.js';

type DeviceCodePrompt = {
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};

const CLIENT_ID = 'agentstack-cli';

export const authCommands: CommandSpec[] = [
  {
    name: 'auth login',
    description: 'Device Code login or --api-key (CI)',
    async run(rt, args) {
      const key = parseFlagValue(args, 'api-key') || parseFlagValue(args, 'token');
      if (key) {
        const pidRaw = parseFlagValue(args, 'project');
        const projectId = pidRaw ? Number(pidRaw) : rt.projectId;
        await rt.saveProfile({
          apiKey: key,
          ...(projectId != null ? { projectId } : {}),
        });
        rt.print({ ok: true, mode: 'api-key', projectId: projectId ?? null });
        return;
      }

      const scope = hasFlag(args, 'scope-ci')
        ? 'mcp:execute projects:read agents:run'
        : DEFAULT_DEVICE_SCOPES;

      const token = await loginWithDeviceCodeForm({
        apiBase: rt.apiBase,
        clientId: CLIENT_ID,
        scope,
        onUserCode: (info: DeviceCodePrompt) => {
          printErr(`Open: ${info.verificationUriComplete}`);
          printErr(`User code: ${info.userCode}`);
        },
      });

      const access = String(token.access_token || '');
      if (!access) throw new Error('Device Code returned no access_token');
      const pin = token.project_id != null ? Number(token.project_id) : undefined;
      await rt.saveProfile({
        apiKey: access,
        ...(pin != null && pin > 1 ? { projectId: pin } : {}),
      });
      rt.print({
        ok: true,
        mode: 'device-code',
        user_id: token.user_id,
        service_caps: token.service_caps,
        projectId: pin && pin > 1 ? pin : null,
      });
    },
  },
  {
    name: 'auth logout',
    description: 'Clear stored API key for active profile',
    async run(rt) {
      await rt.saveProfile({ apiKey: null });
      rt.print({ ok: true });
    },
  },
  {
    name: 'auth whoami',
    description: 'Show profile (REST auth.getProfile)',
    sdkPath: 'platform.auth.getProfile',
    async run(rt) {
      rt.requireAuth();
      rt.print(await rt.sdk.platform.auth.getProfile());
    },
  },  {
    name: 'auth use-project',
    description: 'Pin working project id (X-Project-ID); warn if id=1',
    async run(rt, args) {
      const id = Number(positional(args)[0] || parseFlagValue(args, 'project'));
      if (!Number.isFinite(id)) throw new Error('usage: auth use-project <id>');
      if (id === 1) {
        printErr(
          'warning: project_id=1 is ecosystem identity — prefer a tenant workspace id > 1',
        );
      }
      await rt.saveProfile({ projectId: id });
      rt.print({ ok: true, projectId: id });
    },
  },
  {
    name: 'auth status',
    description: 'Show local auth/project pin (no network)',
    async run(rt) {
      rt.print({
        apiBase: rt.apiBase,
        mcpUrl: rt.mcpUrl,
        hasToken: Boolean(rt.apiKey),
        projectId: rt.projectId ?? null,
        profile: rt.config.activeProfile,
      });
    },
  },
  {
    name: 'auth profiles',
    description: 'List config profiles (names only — no secrets)',
    async run(rt) {
      const names = Object.keys(rt.config.profiles || {});
      rt.print({
        active: rt.config.activeProfile,
        profiles: names.map((name) => ({
          name,
          hasToken: Boolean(rt.config.profiles[name]?.apiKey),
          projectId: rt.config.profiles[name]?.projectId ?? null,
          active: name === rt.config.activeProfile,
        })),
      });
    },
  },
  {
    name: 'auth use-profile',
    description: 'Switch active profile — auth use-profile <name>',
    async run(rt, args) {
      const name = positional(args)[0];
      if (!name) throw new Error('usage: auth use-profile <name>');
      const profiles = { ...rt.config.profiles };
      if (!profiles[name]) profiles[name] = {};
      // One disk write via saveProfile (activeProfile already switched)
      rt.config = { ...rt.config, activeProfile: name, profiles };
      const p = profiles[name] || {};
      await rt.saveProfile({
        apiKey: p.apiKey ?? null,
        projectId: p.projectId ?? null,
      });
      rt.print({
        ok: true,
        profile: name,
        hasToken: Boolean(rt.apiKey),
        projectId: rt.projectId ?? null,
      });
    },
  },
];
