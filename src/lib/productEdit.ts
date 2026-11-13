import type { Product } from './supabaseApi';

/** Compare to the form's initial representation, not normalized database values. */
export function editedProductFields(candidate: Partial<Product>, baseline: Partial<Product>): Partial<Product> {
  return Object.fromEntries(Object.entries(candidate).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(baseline[key as keyof Product])
  )) as Partial<Product>;
}