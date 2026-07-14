import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { hostingQuickStartResponseSchema } from '../hostingQuickStartSchema';

const fixturePath = join(
  __dirname,
  '../fixtures/hostingQuickStartResponse.v1.json',
);

describe('hostingQuickStartResponseSchema', () => {
  it('parses shared fixture (GA-12)', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
    const parsed = hostingQuickStartResponseSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.bucket_id).toBe('demo-bucket-01');
    }
  });
});
