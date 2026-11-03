/** Confere se a razão social digitada bate com a do CNPJ (consulta pública BrasilAPI). */
const STOP = new Set(['LTDA', 'ME', 'EPP', 'EIRELI', 'SA', 'S', 'A', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'CIA', 'COMERCIO', 'SERVICOS', 'MEI']);
export const nameTokens = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));

export function namesMatch(typed: string, official: string[]): boolean {
  const t = nameTokens(typed);
  if (!t.length) return false;
  return official.filter(Boolean).some((o) => {
    const ot = new Set(nameTokens(o));
    if (!ot.size) return false;
    const hit = t.filter((w) => ot.has(w)).length;
    return hit / t.length >= 0.6 || hit / ot.size >= 0.6;
  });
}

/** null = sem consulta disponível (não bloqueia); senão { ok, official } */
export async function checkCnpjName(cnpj: string, name: string, fantasy?: string): Promise<{ ok: boolean; official: string } | null> {
  const d = (cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = (await r.json()) as { razao_social?: string; nome_fantasia?: string };
    if (!j.razao_social) return null;
    const official = [j.razao_social, j.nome_fantasia || ''];
    return { ok: namesMatch(name, official) || (!!fantasy && namesMatch(fantasy, official)), official: j.razao_social };
  } catch {
    return null;
  }
}
