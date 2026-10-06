import { readMonorepoFixture } from '../../../../__tests__/helpers/monorepoFixture';

import { MoneySchema } from '../schemas';

type MoneyFixture = {
  cases: Array<{ amount: number; currency: string; decimals: number }>;
};

const moneyFixture = readMonorepoFixture(__dirname, 'commerce_money_v1.json') as MoneyFixture | null;

describe('MoneySchema contract parity (shared.commerce.money.gen1)', () => {
  if (moneyFixture && moneyFixture.cases.length > 0) {
    it.each(moneyFixture.cases)('round-trips fixture case %#', (caseRow) => {
    const parsed = MoneySchema.parse(caseRow);
    expect(MoneySchema.parse(parsed)).toEqual(parsed);
    expect(parsed).toEqual(caseRow);
    });
  } else {
    it.skip('round-trips fixture cases (monorepo shared/fixtures)', () => {});
  }

  it('rejects decimals above 8', () => {
    expect(() =>
      MoneySchema.parse({ amount: 1, currency: 'USD', decimals: 9 }),
    ).toThrow();
  });
});
