import { describe, it, expect } from 'vitest';
import { addDaysISO, executionTermText, resolveContractText, type PremiumDocData } from './docModel';
import { toggleReadyClause, composeClauses } from './contractClauses';

const base = (days: number): PremiumDocData => ({
  docType: 'contrato',
  customer: { name: 'Teste', executionDays: days, startDate: '2026-11-04', endDate: addDaysISO('2026-11-04', days) },
  items: [{ description: 'Serviço', qty: 1, unitPrice: 1000 }],
  payment: { method: 'entrada50' },
} as unknown as PremiumDocData);

describe('prazo por contrato', () => {
  it('15 dias a partir de 04/11/2026 conclui em 19/11/2026', () => {
    expect(addDaysISO('2026-11-04', 15)).toBe('2026-11-19');
    expect(executionTermText(base(15))).toContain('até 15 dias corridos');
    expect(executionTermText(base(15))).toContain('19/11/2026');
  });
  it('7 e 30 dias são independentes', () => {
    expect(executionTermText(base(7))).toContain('até 7 dias corridos');
    expect(addDaysISO('2026-11-04', 30)).toBe('2026-12-04');
  });
});

describe('cláusula pronta de pagamento 50/50', () => {
  it('total 1.000,00 vira 500,00 de entrada e 500,00 final', () => {
    const c = toggleReadyClause([], 'pronta-pagamento', true);
    const d = { ...base(15), contractClauses: c, contractText: composeClauses(c, '2026-11-04') } as PremiumDocData;
    const txt = resolveContractText(d);
    expect(txt).toMatch(/50% de entrada \(R\$\s?500,00\)/);
    expect(txt).toMatch(/50% final \(R\$\s?500,00\)/);
  });
});
