import { expect, it } from 'vitest';
import { refusesAppWorker } from './appWorker';

it('keeps development and numbered Lovable previews free of app caches', () => {
  expect(refusesAppWorker('localhost', false, false, false)).toBe(true);
  expect(refusesAppWorker('preview-2--shop.lovable.app', true, false, false)).toBe(true);
  expect(refusesAppWorker('id-preview--shop.lovable.app', true, false, false)).toBe(true);
  expect(refusesAppWorker('project--shop-dev.lovable.app', true, false, false)).toBe(true);
});
it('allows the published site and custom domains but not iframe or kill-switch use', () => {
  expect(refusesAppWorker('mrsegmaxima2026.lovable.app', true, false, false)).toBe(false);
  expect(refusesAppWorker('preview-v2--shop.example.com', true, false, false)).toBe(false);
  expect(refusesAppWorker('mrsegmaxima2026.lovable.app', true, true, false)).toBe(true);
  expect(refusesAppWorker('mrsegmaxima2026.lovable.app', true, false, true)).toBe(true);
});