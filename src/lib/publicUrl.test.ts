import { describe, expect, test } from 'vitest';
import { publicOrigin } from './publicUrl';

const PUB = 'https://mrsegmaxima2026.lovable.app';
const PREVIEW = 'https://id-preview--e095a5b1-4d98-4212-a673-1d17abb27d5d.lovable.app';

describe('link enviado ao cliente nunca é de prévia', () => {
  test('na prévia, usa o endereço publicado salvo', () => {
    expect(publicOrigin(PUB, PREVIEW)).toBe(PUB);
  });
  test('endereço salvo com barra no fim ou sem https', () => {
    expect(publicOrigin('mrsegmaxima2026.lovable.app/', PREVIEW)).toBe(PUB);
  });
  test('endereço salvo de prévia é ignorado', () => {
    expect(publicOrigin(PREVIEW, PUB)).toBe(PUB);
  });
  test('link do editor lovable.dev/projects é ignorado', () => {
    expect(publicOrigin('https://lovable.dev/projects/abc', PUB)).toBe(PUB);
  });
});
