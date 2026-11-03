import { describe, it, expect } from 'vitest';
import { namesMatch } from './cnpjCheck';
import { computeTotals, installmentSchedule } from './docModel';
describe('razão social x CNPJ', () => {
  it('aceita nome igual sem sufixo', () => expect(namesMatch('Excellence Comércio Ltda', ['EXCELLENCE COMERCIO LTDA'])).toBe(true));
  it('bloqueia nome diferente', () => expect(namesMatch('Padaria Pão Quente', ['EXCELLENCE COMERCIO LTDA'])).toBe(false));
});
describe('parcelas sem juros', () => {
  it('6.694,00 em 3x = 2.231,33 + 2.231,33 + 2.231,34', () => {
    const d = { date: new Date('2026-11-03'), items: [{ description: 'x', quantity: 1, unitPrice: 6694 }], payment: { method: 'parcelado' as const, installments: 3 } };
    const v = installmentSchedule(d as never).map((p) => p.value);
    expect(v).toEqual([2231.33, 2231.33, 2231.34]);
    expect(computeTotals(d as never).installmentTotal).toBe(6694);
  });
});
