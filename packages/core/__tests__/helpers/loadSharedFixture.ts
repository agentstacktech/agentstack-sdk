import { readMonorepoFixture } from './monorepoFixture';

/** Load a monorepo `shared/fixtures` JSON file. Throws when the sibling tree is absent. */
export function loadSharedFixture(relPath: string): unknown {
  const found = readMonorepoFixture(__dirname, ...relPath.split('/').filter(Boolean));
  if (found === null) {
    throw new Error(
      `shared fixture not in this checkout (standalone SDK repo): ${relPath}`,
    );
  }
  return found;
}
