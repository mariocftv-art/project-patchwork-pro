/**
 * Categorias dos itens do documento e escopo automático.
 * Fonte única: os mesmos itens do orçamento alimentam PDF, contrato, prévia, impressão e WhatsApp.
 */

export type ItemCategory =
  | 'CAMERA'
  | 'DVR'
  | 'NVR'
  | 'HD'
  | 'FONTE'
  | 'CABO'
  | 'CONECTOR'
  | 'RACK'
  | 'INTERFONE'
  | 'PORTEIRO'
  | 'CONTROLE_ACESSO'
  | 'CERCA_ELETRICA'
  | 'ALARME'
  | 'SERVICO'
  | 'OUTRO';

export interface ScopeItem {
  description: string;
  quantity: number;
  kind?: 'product' | 'service';
}

const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function categorize(it: ScopeItem): ItemCategory {
  const d = norm(it.description);
  if (it.kind === 'service' || /\bmao de obra\b/.test(d)) return 'SERVICO';
  if (/\bdvr\b|\bxvr\b|\bmhdx\b/.test(d)) return 'DVR';
  if (/\bnvr\b/.test(d)) return 'NVR';
  if (/^(hd|hdd|disco)\b|\bhd\s*(de\s*)?\d+\s*(tb|gb)\b|\bdisco rigido\b/.test(d)) return 'HD';
  if (/\bcamera|\bbullet\b|\bdome\b|\bspeed\s*dome\b|\bipc\b/.test(d)) return 'CAMERA';
  if (/\bfonte\b/.test(d)) return 'FONTE';
  if (/\bcabo|\bcabeamento\b/.test(d)) return 'CABO';
  if (/\bconector|\bbalun|\bbnc\b|\bp4\b|\brj45\b/.test(d)) return 'CONECTOR';
  if (/\brack\b/.test(d)) return 'RACK';
  if (/\bporteiro\b/.test(d)) return 'PORTEIRO';
  if (/\binterfone\b/.test(d)) return 'INTERFONE';
  if (/controle de acesso|\bcatraca\b|\bfechadura\b|\bbiometri/.test(d)) return 'CONTROLE_ACESSO';
  if (/cerca eletrica|\beletrificador\b/.test(d)) return 'CERCA_ELETRICA';
  if (/\balarme\b|\bsensor\b|\bsirene\b/.test(d)) return 'ALARME';
  return 'OUTRO';
}

/** Rótulo curto usado no ícone neutro do PDF quando o item não tem foto */
export const CATEGORY_BADGE: Record<ItemCategory, string> = {
  CAMERA: 'CAM',
  DVR: 'DVR',
  NVR: 'NVR',
  HD: 'HD',
  FONTE: 'FONTE',
  CABO: 'CABO',
  CONECTOR: 'CON',
  RACK: 'RACK',
  INTERFONE: 'INT',
  PORTEIRO: 'PORT',
  CONTROLE_ACESSO: 'ACES',
  CERCA_ELETRICA: 'CERCA',
  ALARME: 'ALRM',
  SERVICO: 'SERV',
  OUTRO: 'ITEM',
};

const qty = (n: number) => Math.max(0, Math.round(Number(n) || 0));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function cameraType(d: string) {
  const s = norm(d);
  if (/speed\s*dome|\bptz\b/.test(s)) return 'Speed Dome';
  if (/\bdome\b/.test(s)) return 'Dome';
  if (/\bbullet\b/.test(s)) return 'Bullet';
  if (/\bmini\b/.test(s)) return 'Mini';
  return '';
}

const channels = (d: string) => norm(d).match(/(\d+)\s*(ch\b|canais|canal)/)?.[1];
const capacity = (d: string) => norm(d).match(/(\d+)\s*(tb|gb)\b/);

/** Linhas do escopo (com "• ") montadas somente a partir dos itens reais */
export function buildScopeLines(items: ScopeItem[]): string[] {
  const valid = items.filter((i) => i.description?.trim() && qty(i.quantity) > 0);
  const lines: string[] = [];
  const byCat = new Map<ItemCategory, ScopeItem[]>();
  valid.forEach((i) => {
    const c = categorize(i);
    byCat.set(c, [...(byCat.get(c) || []), i]);
  });
  const sum = (arr: ScopeItem[] = []) => arr.reduce((s, i) => s + qty(i.quantity), 0);

  // Câmeras
  const cams = byCat.get('CAMERA') || [];
  const camTotal = sum(cams);
  if (camTotal) {
    const types = new Map<string, number>();
    cams.forEach((c) => {
      const t = cameraType(c.description);
      types.set(t, (types.get(t) || 0) + qty(c.quantity));
    });
    const named = [...types.entries()].filter(([t]) => t);
    let line = `Instalação de ${plural(camTotal, 'câmera de segurança', 'câmeras de segurança')}`;
    if (types.size > 1 && named.length) {
      const parts = [...types.entries()].map(([t, n]) => (t ? `${n} ${t}` : `${n} ${n === 1 ? 'outro modelo' : 'outros modelos'}`));
      const last = parts.pop();
      line += `, sendo ${parts.length ? `${parts.join(', ')} e ${last}` : last}`;
    } else if (named.length === 1 && types.size === 1) {
      line += ` (${named[0][0]})`;
    }
    lines.push(`${line}.`);
  }

  // Gravadores
  (['DVR', 'NVR'] as const).forEach((cat) => {
    const arr = byCat.get(cat) || [];
    const groups = new Map<string, number>();
    arr.forEach((i) => {
      const ch = channels(i.description) || '';
      groups.set(ch, (groups.get(ch) || 0) + qty(i.quantity));
    });
    groups.forEach((n, ch) => lines.push(`Instalação/configuração de ${n} ${cat}${ch ? ` de ${ch} canais` : ''}.`));
  });

  // HD
  const hdGroups = new Map<string, number>();
  (byCat.get('HD') || []).forEach((i) => {
    const m = capacity(i.description);
    const k = m ? `${m[1]} ${m[2].toUpperCase()}` : '';
    hdGroups.set(k, (hdGroups.get(k) || 0) + qty(i.quantity));
  });
  hdGroups.forEach((n, cap) => lines.push(`Instalação de ${n} HD${cap ? ` de ${cap}` : ''}.`));

  const fontes = sum(byCat.get('FONTE'));
  if (fontes) lines.push(`Instalação de ${plural(fontes, 'fonte de alimentação', 'fontes de alimentação')}.`);
  const racks = sum(byCat.get('RACK'));
  if (racks) lines.push(`Instalação de ${plural(racks, 'rack', 'racks')}.`);
  if (byCat.get('CABO')?.length) lines.push('Passagem e organização do cabeamento.');
  if (byCat.get('CONECTOR')?.length) lines.push('Instalação de conectores e acessórios de conexão.');
  const simple: Array<[ItemCategory, string, string]> = [
    ['INTERFONE', 'interfone', 'interfones'],
    ['PORTEIRO', 'porteiro eletrônico', 'porteiros eletrônicos'],
    ['CONTROLE_ACESSO', 'equipamento de controle de acesso', 'equipamentos de controle de acesso'],
    ['CERCA_ELETRICA', 'item de cerca elétrica', 'itens de cerca elétrica'],
    ['ALARME', 'item de alarme', 'itens de alarme'],
  ];
  simple.forEach(([cat, one, many]) => {
    const n = sum(byCat.get(cat));
    if (n) lines.push(`Instalação de ${plural(n, one, many)}.`);
  });
  (byCat.get('OUTRO') || []).forEach((i) => lines.push(`Fornecimento de ${qty(i.quantity)}x ${i.description.trim().replace(/\.$/, '')}.`));

  // Serviços Técnicos Especializados
  const svc = byCat.get('SERVICO') || [];
  const count = (re: RegExp) => svc.filter((s) => re.test(norm(s.description))).reduce((a, s) => a + qty(s.quantity), 0);
  const used = new Set<ScopeItem>();
  const mark = (re: RegExp) => svc.forEach((s) => re.test(norm(s.description)) && used.add(s));
  const trocaRe = /\btroca/;
  const remRe = /\bremoc|\bretirada/;
  const appRe = /aplicativo|acesso remoto|\bapp\b/;
  const instRe = /instala/;
  const trocas = count(trocaRe);
  const remocoes = count(remRe);
  const app = count(appRe);
  mark(trocaRe);
  mark(remRe);
  mark(appRe);
  const inst = svc.filter((s) => !used.has(s) && instRe.test(norm(s.description)) && /camera/.test(norm(s.description)));
  const instN = inst.reduce((a, s) => a + qty(s.quantity), 0);
  inst.forEach((s) => used.add(s));
  if (instN && !camTotal) lines.push(`Instalação de ${plural(instN, 'câmera', 'câmeras')}.`);
  if (trocas) lines.push(`Troca de ${plural(trocas, 'câmera', 'câmeras')}.`);
  if (remocoes) lines.push(`Remoção de ${plural(remocoes, 'câmera', 'câmeras')}.`);
  svc
    .filter((s) => !used.has(s))
    .forEach((s) => {
      const d = s.description.trim().replace(/^m[aã]o de obra\s*[—–-]\s*/i, '').replace(/\.$/, '');
      const n = qty(s.quantity);
      lines.push(`${d.charAt(0).toUpperCase()}${d.slice(1)}${n > 1 ? ` (${n}x)` : ''}.`);
    });
  if (app) lines.push('Configuração do aplicativo para acesso remoto.');

  const hasEquip = valid.some((i) => categorize(i) !== 'SERVICO');
  if (hasEquip || instN) lines.push('Configuração do sistema e testes de funcionamento.');
  return lines.map((l) => `• ${l}`);
}
