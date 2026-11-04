import { describe, expect, it } from 'vitest';
import { validateDoc, type PremiumDocData } from './docModel';

const pj = (extra: Record<string, unknown> = {}): PremiumDocData => ({
  docType: 'contrato',
  number: 'T',
  date: '2026-11-04',
  customer: {
    name: 'Empresa Teste Ltda', phone: '11999999999', cnpj: '02.942.192/0006-95',
    street: 'Rua A', number: '1', city: 'São Paulo', state: 'SP', ...extra,
  },
  items: [{ description: 'Câmera', quantity: 1, unitPrice: 100 }],
} as unknown as PremiumDocData);

describe('contrato: nome, cargo e CPF de quem assina são opcionais', () => {
  it('contrato de empresa sem nome, cargo e CPF de quem assina não gera erro', () => {
    expect(validateDoc(pj())).toEqual([]);
  });
  it('CPF de quem assina preenchido e inválido gera erro', () => {
    expect(validateDoc(pj({ representativeCpf: '111.111.111-12' })).some((e) => e.includes('CPF de quem assina'))).toBe(true);
  });
  it('prévia abre sem prazo; só o documento final exige prazo', () => {
    expect(validateDoc(pj())).toEqual([]);
    expect(validateDoc(pj(), { final: true }).some((e) => e.includes('prazo'))).toBe(true);
    expect(validateDoc(pj({ executionDays: 15 }), { final: true })).toEqual([]);
  });
});
