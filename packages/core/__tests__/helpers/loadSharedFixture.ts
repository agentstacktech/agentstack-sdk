import { readFileSync } from 'fs';
import { join } from 'path';

const FIXTURE_ROOT = join(__dirname, '../../../../shared/fixtures');

export function loadSharedFixture(relPath: string): unknown {
  const raw = readFileSync(join(FIXTURE_ROOT, relPath), 'utf8');
  return JSON.parse(raw);
}
