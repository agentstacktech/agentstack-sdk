import {
  addMoney,
  formatMoney,
  money,
  moneyFromMajor,
  mulMoney,
  subMoney,
  sumMoney,
} from '../money';

describe('money', () => {
  it('creates from minor units', () => {
    expect(money(999, 'USD', 2)).toEqual({ amount: 999, currency: 'USD', decimals: 2 });
  });

  it('creates from major units', () => {
    expect(moneyFromMajor(9.99, 'USD').amount).toBe(999);
  });

  it('adds and subtracts', () => {
    const a = money(100);
    const b = money(50);
    expect(addMoney(a, b).amount).toBe(150);
    expect(subMoney(a, b).amount).toBe(50);
  });

  it('multiplies by quantity', () => {
    expect(mulMoney(money(100), 3).amount).toBe(300);
  });

  it('sums array', () => {
    expect(sumMoney([money(100), money(200)]).amount).toBe(300);
  });

  it('formats USDT', () => {
    expect(formatMoney(moneyFromMajor(10.5, 'USDT'))).toContain('USDT');
  });
});
