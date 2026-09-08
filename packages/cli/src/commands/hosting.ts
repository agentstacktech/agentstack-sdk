import type { CommandSpec } from './types.js';
import { hasFlag, parseFlagValue, positional } from './types.js';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, basename } from 'node:path';

/** Minimal starter HTML when --file omitted (hosting-only — not MCP). */
const DEFAULT_QUICKSTART_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>AgentStack Site</title>
  <style>
    body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;
      background:linear-gradient(160deg,#0f172a,#1e293b);color:#e2e8f0}
    main{text-align:center;padding:2rem}
    h1{font-size:clamp(1.75rem,4vw,2.5rem);margin:0 0 .5rem}
    p{opacity:.85;margin:0}
  </style>
</head>
<body>
  <main>
    <h1>AgentStack</h1>
    <p>Published via <code>agentstack hosting quick-start</code></p>
  </main>
</body>
</html>
`;

async function collectFiles(
  dir: string,
  base = dir,
): Promise<Array<{ path: string; content: string }>> {
  const out: Array<{ path: string; content: string }> = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full, base)));
    else {
      out.push({
        path: relative(base, full).replace(/\\/g, '/'),
        content: await readFile(full, 'utf8'),
      });
    }
  }
  return out;
}

/** Chunk deploySiteFiles batches (SDK warns at ~50). */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export const hostingCommands: CommandSpec[] = [
  {
    name: 'hosting quick-start',
    description: 'Publish starter site — --name [--file html] (default mini HTML)',
    sdkPath: 'hosting.quickStart',
    usage: '[--name <bucket>] [--file index.html] [--no-publish]',
    examples: [
      'agentstack hosting quick-start --name demo',
      'agentstack hosting quick-start --file ./index.html --name docs',
    ],
    async run(rt, args) {
      const projectId = rt.requireProject();
      const file = parseFlagValue(args, 'file');
      const html = file ? await readFile(file, 'utf8') : DEFAULT_QUICKSTART_HTML;
      const bucket_name =
        parseFlagValue(args, 'name') || parseFlagValue(args, 'bucket-name');
      const res = await rt.sdk.hosting.quickStart({
        project_id: projectId,
        html,
        ...(bucket_name ? { bucket_name } : {}),
        publish: !hasFlag(args, 'no-publish'),
      });
      rt.print(res.data ?? res);
    },
  },
  {
    name: 'hosting deploy',
    description: 'Deploy --dir or --zip into --bucket (publishes unless --no-publish)',
    sdkPath: 'hosting.deploySiteFiles',
    usage: '--bucket <id> (--dir <path> | --zip <file>) [--no-publish]',
    examples: [
      'agentstack hosting deploy --bucket <uuid> --dir ./dist',
      'agentstack hosting deploy --bucket <uuid> --zip ./site.zip',
    ],
    async run(rt, args) {
      const projectId = rt.requireProject();
      const bucketId = parseFlagValue(args, 'bucket');
      if (!bucketId) {
        throw new Error(
          'usage: hosting deploy --bucket <id> (--dir <path> | --zip <file>)',
        );
      }
      const publish = !hasFlag(args, 'no-publish');
      const zip = parseFlagValue(args, 'zip');
      if (zip) {
        const buf = await readFile(zip);
        const file = new File([buf], basename(zip), { type: 'application/zip' });
        const uploaded = await rt.sdk.hosting.importZip(projectId, bucketId, file);
        const pub = publish
          ? (await rt.sdk.hosting.publishBucket(bucketId, projectId)).data
          : undefined;
        rt.print({ upload: uploaded.data, publish: pub });
        return;
      }
      const dir = parseFlagValue(args, 'dir');
      if (!dir) throw new Error('provide --dir or --zip');
      if (!(await stat(dir)).isDirectory()) throw new Error('--dir must be a directory');
      const files = await collectFiles(dir);
      let last: unknown;
      for (const part of chunk(files, 50)) {
        last = await rt.sdk.hosting.deploySiteFiles(projectId, bucketId, part, {
          publish: false,
        });
      }
      const pub = publish
        ? (await rt.sdk.hosting.publishBucket(bucketId, projectId)).data
        : undefined;
      rt.print({ upload: last, publish: pub, files: files.length });
    },
  },
  {
    name: 'hosting sites',
    description: 'List hosting sites for project',
    sdkPath: 'hosting.listSites',
    async run(rt) {
      const res = await rt.sdk.hosting.listSites(rt.requireProject());
      rt.print(res.data ?? res);
    },
  },
];

export const storageCommands: CommandSpec[] = [
  {
    name: 'storage quota',
    description: 'Storage quota',
    sdkPath: 'storage.getQuota',
    async run(rt) {
      rt.print(await rt.sdk.storage.getQuota({ projectId: rt.requireProject() }));
    },
  },
  {
    name: 'storage ls',
    description: 'List files — optional folder',
    sdkPath: 'storage.listFiles',
    async run(rt, args) {
      const folder = parseFlagValue(args, 'folder') || positional(args)[0];
      rt.print(
        await rt.sdk.storage.listFiles(folder, { projectId: rt.requireProject() }),
      );
    },
  },
  {
    name: 'storage rm',
    description: 'Delete file — --id --folder (default _)',
    sdkPath: 'storage.deleteFile',
    usage: '--id <file_id> [--folder _]',
    examples: ['agentstack storage rm --id <file_id> --folder _'],
    async run(rt, args) {
      const id = parseFlagValue(args, 'id') || positional(args)[0];
      if (!id) throw new Error('usage: storage rm --id <file_id> [--folder _]');
      const folder = parseFlagValue(args, 'folder') || '_';
      rt.print(
        await rt.sdk.storage.deleteFile(id, folder, {
          projectId: rt.requireProject(),
        }),
      );
    },
  },
  {
    name: 'storage upload',
    description: 'Upload file — --file [--filename]',
    sdkPath: 'storage.uploadFile',
    async run(rt, args) {
      const filePath = parseFlagValue(args, 'file') || positional(args)[0];
      if (!filePath) throw new Error('usage: storage upload --file <path>');
      const buf = await readFile(filePath);
      const filename = parseFlagValue(args, 'filename') || basename(filePath);
      rt.print(
        await rt.sdk.storage.uploadFile(new Blob([buf]), {
          filename,
          projectId: rt.requireProject(),
        }),
      );
    },
  },
];
