import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { MoneySchema } from '../schemas';

const fixturePath = join(
  __dirname,
  '../../../../../../../shared/fixtures/commerce_money_v1.json',
);

type MoneyFixture = {
  cases: Array<{ amount: number; currency: string; decimals: number }>;
};

function loadCases() {
  const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as MoneyFixture;
  expect(raw.cases.length).toBeGreaterThan(0);
  return raw.cases;
}

describe('MoneySchema contract parity (shared.commerce.money.gen1)', () => {
  it.each(loadCases())('round-trips fixture case %#', (caseRow) => {
    const parsed = MoneySchema.parse(caseRow);
    expect(MoneySchema.parse(parsed)).toEqual(parsed);
    expect(parsed).toEqual(caseRow);
  });

  it('rejects decimals above 8', () => {
    expect(() =>
      MoneySchema.parse({ amount: 1, currency: 'USD', decimals: 9 }),
    ).toThrow();
  });
});
