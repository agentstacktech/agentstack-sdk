/**
 * Locate AgentStack monorepo siblings (shared/, agentstack-core/, …).
 * Standalone checkouts of agentstack-sdk return null — do not fail the build.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * @param {string} startDir
 * @param {...string} segments path under the monorepo root
 * @returns {string | null}
 */
export function findMonorepoFile(startDir, ...segments) {
  let dir = startDir;
  for (let i = 0; i < 10; i += 1) {
    const candidate = join(dir, ...segments);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
