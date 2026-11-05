import { describe, it, expect } from 'vitest';
import { split5050, completionInfo, addDaysISO } from './docModel';
import { withExtraClauses, DEFAULT_CLAUSES } from './contractClauses';

describe('pagamento 50% / 50%', () => {
  it('R$ 600,00 dá 300 de entrada e 300 no final', () => {
    expect(split5050(600)).toEqual({ entry: 300, final: 300 });
  });
  it('centavo ímpar vai para o final', () => {
    expect(split5050(100.01)).toEqual({ entry: 50, final: 50.01 });
  });
});

describe('prazo por contrato', () => {
  it('sugere 15 dias quando o contrato não tem prazo', () => {
    expect(completionInfo({ name: 'x' } as never).days).toBe(15);
  });
  it('cada contrato usa o seu prazo (7 e 30)', () => {
    expect(completionInfo({ name: 'a', completionDays: '7', startDate: '2026-11-10' } as never).end).toBe('17/11/2026');
    expect(completionInfo({ name: 'b', completionDays: '30', startDate: '2026-11-10' } as never).end).toBe('10/12/2026');
  });
  it('soma dias atravessando o mês', () => {
    expect(addDaysISO('2026-11-25', 15)).toBe('2026-12-10');
  });
});

describe('cláusulas prontas', () => {
  it('acrescenta no fim sem apagar as existentes', () => {
    const old = DEFAULT_CLAUSES.filter((c) => !['pagamento5050', 'prazoseguranca'].includes(c.id));
    const out = withExtraClauses(old);
    expect(out.slice(0, old.length)).toEqual(old);
    expect(out.slice(-2).map((c) => c.id)).toEqual(['pagamento5050', 'prazoseguranca']);
  });
});
