import { describe, it, expect } from 'vitest';
import { editedProductFields, productDescription } from './productEdit';

describe('product editing', () => {
  const initial = { title: 'Kit Alarme Sem Fio Ppa On App Wifi 7 Sensor Bateria Sirene', description: 'Descrição atual', price: 600, stock: 7, promo_price: 500, promo_enabled: false, promo_until: '2026-11-30', on_sale: false, original_price: null, category: 'alarmes' };
  it('changes only description, preserving name, price, stock and promotion', () => {
    expect(editedProductFields({ ...initial, description: 'Descrição alterada' }, initial)).toEqual({ description: 'Descrição alterada' });
  });
  it('allows clearing the description without changing other fields', () => {
    expect(editedProductFields({ ...initial, description: null }, initial)).toEqual({ description: null });
  });
  it('does not create an update when editing is cancelled or unchanged', () => {
    expect(editedProductFields({ ...initial }, initial)).toEqual({});
  });
  it('changes promotion only when explicitly edited', () => {
    expect(editedProductFields({ ...initial, promo_enabled: true, promo_until: '2026-12-01' }, initial)).toEqual({ promo_enabled: true, promo_until: '2026-12-01' });
  });
  it('preserves the description exactly as written, including surrounding spaces and newlines', () => {
    const description = '  Descrição completa\nSegunda linha  \n';
    expect(productDescription(description)).toBe(description);
  });
  it('preserves the specified kit values when only its description changes', () => {
    const kit = { ...initial, price: 2830, promo_price: 2250, stock: 50, promo_until: '2026-12-02T23:59:59-03:00', brand: 'PPA', model: 'On App' };
    expect(editedProductFields({ ...kit, description: productDescription('  Texto novo\n') }, kit)).toEqual({ description: '  Texto novo\n' });
  });
});