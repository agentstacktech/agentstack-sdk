import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Read `shared/fixtures/<segments>` by walking parents.
 * Returns null when this package is checked out without the AgentStack monorepo.
 */
export function readMonorepoFixture(startDir: string, ...segmentsUnderFixtures: string[]): unknown | null {
  let dir = startDir;
  for (let i = 0; i < 10; i += 1) {
    const candidate = join(dir, 'shared', 'fixtures', ...segmentsUnderFixtures);
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, 'utf8')) as unknown;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
