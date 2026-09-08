#!/usr/bin/env node
/**
 * @agentstack/cli entry — gene repo.tooling.user_cli.gen1
 */

import { createRuntime, type GlobalFlags, type CliRuntime } from './runtime/createRuntime.js';
import { EXIT, mapErrorToExit } from './runtime/errors.js';
import { printErr } from './runtime/output.js';
import { findCommand, helpText } from './commands/registry.js';

function parseGlobals(argv: string[]): { flags: GlobalFlags; rest: string[] } {
  const flags: GlobalFlags = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '--quiet') flags.quiet = true;
    else if (a === '--trace') flags.trace = true;
    else if (a === '--project' && argv[i + 1]) {
      flags.project = Number(argv[++i]);
    } else if (a.startsWith('--project=')) {
      flags.project = Number(a.slice('--project='.length));
    } else if (a === '--profile' && argv[i + 1]) {
      flags.profile = argv[++i];
    } else if (a.startsWith('--profile=')) {
      flags.profile = a.slice('--profile='.length);
    } else if (a === '--api-base' && argv[i + 1]) {
      flags.apiBase = argv[++i];
    } else if (a.startsWith('--api-base=')) {
      flags.apiBase = a.slice('--api-base='.length);
    } else {
      rest.push(a);
    }
  }
  return { flags, rest };
}

/** Meta commands ignore runtime — avoid createRuntime for cold help/completion. */
const META_NO_RUNTIME = new Set(['help', 'completion']);

async function main(): Promise<void> {
  const raw = process.argv.slice(2);
  if (raw.length === 0 || raw[0] === '-h' || raw[0] === '--help') {
    process.stdout.write(`${helpText()}\n`);
    process.exitCode = EXIT.OK;
    return;
  }

  const { flags, rest } = parseGlobals(raw);
  const { cmd, rest: cmdArgs } = findCommand(rest);
  if (!cmd) {
    printErr(`unknown command: ${rest.join(' ')}`);
    printErr(helpText());
    process.exitCode = EXIT.USAGE;
    return;
  }

  try {
    if (META_NO_RUNTIME.has(cmd.name)) {
      await cmd.run(undefined as unknown as CliRuntime, cmdArgs);
    } else {
      const rt = await createRuntime(flags);
      await cmd.run(rt, cmdArgs);
    }
    if (process.exitCode == null) process.exitCode = EXIT.OK;
  } catch (err) {
    printErr(err instanceof Error ? err.message : String(err));
    process.exitCode = mapErrorToExit(err);
  }
}

main();
