import type { Product } from './supabaseApi';

/** Preserve the customer's full text, including spaces and line breaks. */
export function productDescription(value?: string): string | null {
  return value === undefined || value === '' ? null : value;
}

/** Compare to the form's initial representation, not normalized database values. */
export function editedProductFields(candidate: Partial<Product>, baseline: Partial<Product>): Partial<Product> {
  return Object.fromEntries(Object.entries(candidate).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(baseline[key as keyof Product])
  )) as Partial<Product>;
}