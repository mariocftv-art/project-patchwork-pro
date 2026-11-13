import { describe, it, expect } from 'vitest';
import { editedProductFields } from './productEdit';

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
});