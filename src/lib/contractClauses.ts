import { supabase } from '@/integrations/supabase/client';

/** Uma cláusula do contrato. O corpo usa itens "1.1." e alíneas "a)"; a numeração é refeita sozinha. */
export interface ContractClause {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
  /** Sai no quadro de destaque com declaração de ciência e rubrica */
  highlight?: boolean;
}

export const DEFAULT_CLAUSES_VERSION = '2026-10-11';

const C = (id: string, title: string, body: string[], highlight = false): ContractClause => ({ id, title, body: body.join('\n'), enabled: true, ...(highlight ? { highlight: true } : {}) });

/** Marcadores do quadro de destaque (art. 54, §4º do CDC) no texto montado. */
export const HIGHLIGHT_START = '[[DESTAQUE]]';
export const HIGHLIGHT_END = '[[/DESTAQUE]]';
export const AWARENESS_TEXT = 'Declaro que li e compreendi as cláusulas {CLAUSULAS_DESTAQUE}, especialmente quanto às exclusões de garantia, às limitações do sistema, à propriedade dos equipamentos até a quitação e à minha responsabilidade pelo posicionamento das câmeras.';

export const DEFAULT_CLAUSES: ContractClause[] = [
  C('objeto', 'OBJETO', [
    '1.1. Fornecimento dos equipamentos e prestação de Serviço Técnico Especializado de instalação, configuração e testes do sistema de segurança descrito na tabela de itens deste contrato, a ser executado no endereço de instalação indicado:',
    '{ESCOPO}',
    '1.2. O que não estiver descrito neste contrato não está incluído e depende de novo orçamento aprovado por escrito.',
  ]),
  C('preco', 'PREÇO E PAGAMENTO', [
    '2.1. Valor total de {VALOR_TOTAL}, compreendendo equipamentos, materiais, serviço e testes. {PAGAMENTO}',
    '2.2. O atraso sujeita o CONTRATANTE a multa de 2%, juros de 1% ao mês e correção pelo IPCA.',
    '2.3. Atraso superior a 30 dias autoriza a CONTRATADA a suspender a garantia contratual e o suporte, cobrar por meios próprios, protestar o título, incluir o débito nos órgãos de proteção ao crédito e exercer os direitos da Cláusula 8ª. Despesas de cobrança e honorários correm por conta do inadimplente, nos limites legais.',
  ]),
  C('prazo', 'PRAZO E EXECUÇÃO', [
    '3.1. Execução na data acordada, no prazo estimado informado neste contrato.',
    '3.2. O CONTRATANTE garante o acesso ao local e a presença de pessoa maior e autorizada durante toda a execução.',
    '3.3. Não contam no prazo: indisponibilidade do local, falta de energia ou de infraestrutura, impedimento de acesso, clima que inviabilize trabalho em altura ou área externa, atraso de fornecedores e qualquer fato não imputável à CONTRATADA.',
    '3.4. Comparecendo a equipe na data agendada e não sendo possível executar por motivo atribuível ao CONTRATANTE, será devida taxa de visita improdutiva, e nova data será agendada.',
  ]),
  C('obrig-contratada', 'OBRIGAÇÕES DA CONTRATADA', [
    '4.1. Executar com técnica e profissionais qualificados; fornecer equipamentos novos e em perfeito funcionamento; testar e demonstrar o sistema; orientar quanto ao uso e ao acesso remoto; manter sigilo; deixar o local limpo.',
    '4.2. Responder pelos danos que comprovadamente causar ao imóvel por culpa de seus profissionais, excluídas as intervenções inerentes à instalação, previamente informadas.',
  ]),
  C('obrig-contratante', 'OBRIGAÇÕES DO CONTRATANTE', [
    '5.1. Fornecer acesso ao local nas datas agendadas e, às suas expensas, a infraestrutura necessária: ponto de energia dentro das normas, internet quando houver acesso remoto, e condições seguras de trabalho.',
    '5.2. Informar previamente a existência de tubulação elétrica, hidráulica ou de gás nos locais de perfuração. A CONTRATADA não responde por danos decorrentes da ausência ou incorreção dessa informação.',
    '5.3. Obter as autorizações de condomínio, locador ou órgão público quando necessárias.',
    '5.4. Efetuar os pagamentos nas datas acordadas e conservar os equipamentos conforme as orientações recebidas.',
    '5.5. Guardar o gravador (DVR/NVR) e a fonte em local protegido, ventilado, seco e de acesso restrito, declarando ter sido orientado quanto a isso.',
    '5.6. Alterar imediatamente as senhas recebidas e guardá-las em local seguro. A CONTRATADA não mantém cópia das credenciais após a entrega.',
    '5.7. Comunicar qualquer falha no prazo mais breve possível.',
  ]),
  C('garantia', 'GARANTIA E SUAS EXCLUSÕES', [
    '6.1. A CONTRATADA concede garantia de {GARANTIA_PERIODO} sobre o Serviço Técnico Especializado, contada da conclusão, sem prejuízo da garantia legal do Código de Defesa do Consumidor. Os equipamentos têm a garantia de seus fabricantes, cabendo à CONTRATADA o encaminhamento quando acionada no prazo.',
    '6.2. A GARANTIA NÃO COBRE falhas ou danos decorrentes de: descargas atmosféricas, surtos, oscilações ou interrupção de energia; uso inadequado, negligência ou inobservância das instruções; intervenção, reparo ou mudança de posicionamento por terceiros não autorizados; vandalismo, furto, roubo, incêndio, alagamento, infiltração, maresia, animais ou insetos; caso fortuito e força maior; instabilidade ou alteração da internet, do provedor ou do roteador do CONTRATANTE; alteração de senhas, configurações ou aplicativos pelo CONTRATANTE ou por terceiros; desgaste natural.',
    '6.3. Chamado decorrente de hipótese excluída será orçado previamente e cobrado, mediante concordância do CONTRATANTE.',
  ], true),
  C('limitacoes', 'LIMITAÇÕES DO SISTEMA', [
    '7.1. O sistema de segurança eletrônica é ferramenta de monitoramento, registro e dissuasão. NÃO CONSTITUI SERVIÇO DE VIGILÂNCIA ARMADA, NEM MONITORAMENTO 24 HORAS POR CENTRAL, NEM GARANTE A PREVENÇÃO DE FURTOS, ROUBOS, INVASÕES OU QUAISQUER SINISTROS, salvo contratação específica e expressa.',
    '7.2. A CONTRATADA não responde por eventos ocorridos no imóvel nem por perdas patrimoniais do CONTRATANTE ou de terceiros, tampouco por furto, avaria ou desligamento dos equipamentos após a entrega.',
    '7.3. O período de retenção das gravações depende da capacidade do armazenamento, da quantidade de câmeras, da resolução e da configuração. A estimativa informada não constitui garantia de prazo fixo.',
    '7.4. O acesso remoto depende de internet ativa e estável no imóvel e no aparelho do CONTRATANTE e da disponibilidade dos serviços do fabricante. A continuidade do funcionamento depende do fornecimento regular de energia elétrica.',
  ], true),
  C('propriedade', 'PROPRIEDADE DOS EQUIPAMENTOS', [
    '8.1. Os equipamentos permanecem de propriedade da CONTRATADA até a quitação integral, nos termos dos artigos 521 e seguintes do Código Civil, transferindo-se automaticamente ao CONTRATANTE com o pagamento final.',
    '8.2. Enquanto não quitado, fica vedada a remoção, alienação, oneração ou deslocamento dos equipamentos sem anuência escrita da CONTRATADA.',
  ], true),
  C('cameras', 'POSICIONAMENTO DAS CÂMERAS E PROTEÇÃO DE DADOS', [
    '9.1. O posicionamento e o ângulo das câmeras são definidos pelo CONTRATANTE, que responde EXCLUSIVAMENTE pelo enquadramento escolhido, inclusive por reclamações ou demandas de terceiros decorrentes da captação de áreas de imóveis vizinhos, vias ou espaços de uso comum. A CONTRATADA orienta tecnicamente, mas não responde pela decisão final.',
    '9.2. As imagens são de titularidade e responsabilidade exclusiva do CONTRATANTE, que figura como controlador dos dados nos termos da Lei nº 13.709/2018. A CONTRATADA atua apenas como prestadora do serviço de instalação, não realizando armazenamento, acesso ou monitoramento das imagens, salvo quando expressamente solicitada para suporte.',
  ], true),
  C('aceite', 'ENTREGA E ACEITE', [
    '10.1. Concluída a instalação, a CONTRATADA demonstrará o funcionamento do sistema ao CONTRATANTE, que firmará Termo de Recebimento e Aceite declarando o recebimento em pleno funcionamento, com as orientações de uso e as credenciais.',
    '10.2. A ausência do CONTRATANTE após agendamento prévio, ou a recusa injustificada em firmar o Termo, não impede a conclusão: o serviço será considerado aceito decorridos 5 dias úteis sem manifestação por escrito.',
    '10.3. Divergências quanto a quantidade, posicionamento ou funcionamento devem ser apontadas na entrega ou em até 5 dias úteis, por escrito, para correção sem custo.',
    '10.4. A CONTRATADA poderá fazer registro fotográfico do local antes e depois, para comprovação técnica da execução. O uso dessas imagens para divulgação depende de autorização: {AUTORIZACAO_IMAGEM}',
  ]),
  C('rescisao', 'ALTERAÇÕES E RESCISÃO', [
    '11.1. Qualquer inclusão, exclusão ou alteração de itens, valores ou prazos só vale por termo aditivo assinado por ambas as partes, permanecendo íntegros o contrato original e suas assinaturas.',
    '11.2. O contrato poderá ser rescindido por acordo; pela CONTRATADA em caso de inadimplemento superior a 30 dias; pelo CONTRATANTE mediante comunicação; ou por descumprimento de obrigação essencial, após notificação com 10 dias para correção.',
    '11.3. Rescindido antes do início, restituem-se os valores pagos, deduzidos os custos comprovadamente incorridos. Rescindido após o início por iniciativa imotivada do CONTRATANTE, serão devidos os equipamentos já adquiridos ou instalados, os serviços executados e cláusula penal de 20% sobre o saldo remanescente.',
    '11.4. A retirada de equipamentos instalados, quando cabível, será agendada pela CONTRATADA, correndo por conta do CONTRATANTE os custos de desinstalação e reparo das fixações.',
  ]),
  C('finais', 'DISPOSIÇÕES FINAIS', [
    '12.1. O suporte técnico é prestado pelos canais oficiais, em dias úteis e horário comercial. Chamados em garantia não têm custo; os demais são orçados previamente. Este contrato não inclui manutenção preventiva periódica nem monitoramento ativo, salvo contratação específica.',
    '12.2. As partes reconhecem a validade da assinatura eletrônica aposta neste documento, nos termos do art. 10, §2º da MP 2.200-2/2001 e do art. 107 do Código Civil. Cada assinatura é registrada com nome, documento, data, hora e código de integridade do conteúdo. Trata-se de assinatura eletrônica simples, não equivalente a certificado ICP-Brasil, o que não lhe retira validade entre as partes.',
    '12.3. A tolerância quanto ao descumprimento não implica renúncia. A nulidade de uma cláusula não afeta as demais. O contrato obriga herdeiros e sucessores. As comunicações podem ser feitas por escrito, e-mail ou aplicativo de mensagens, nos contatos deste instrumento.',
    '12.4. Nas relações de consumo, nenhuma disposição deste contrato afasta os direitos assegurados pelo Código de Defesa do Consumidor.',
    '12.5. Fica eleito o foro da comarca de São Paulo/SP, ressalvado, nas relações de consumo, o direito do CONTRATANTE de demandar no foro de seu domicílio.',
  ]),
];

export const CLAUSE_HEAD = /^CLÁUSULA\s+(\d+)ª\s+—\s+/i;
export const VERSION_LINE = /^Modelo de cláusulas — versão de /;

export const cloneClauses = (c: ContractClause[]) => c.map((x) => ({ ...x }));

export function formatVersion(v: string) {
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR');
}

/**
 * Renumera um texto já montado: cabeçalhos "CLÁUSULA Nª — ", itens "N.M." e
 * referências "Cláusula Nª"/"itens N.M". Textos antigos (sem esses cabeçalhos) não mudam.
 */
export function renumberClauseLines(lines: string[]): string[] {
  const map = new Map<string, number>();
  let n = 0;
  lines.forEach((l) => {
    const m = l.trim().match(CLAUSE_HEAD);
    if (m) map.set(m[1], ++n);
  });
  if (!n) return lines;
  let cur = 0;
  let orig = '';
  return lines.map((raw) => {
    const l = raw.trim();
    const m = l.match(CLAUSE_HEAD);
    if (m) {
      cur = map.get(m[1])!;
      orig = m[1];
      return l.replace(CLAUSE_HEAD, `CLÁUSULA ${cur}ª — `);
    }
    if (!cur) return raw;
    return raw
      .replace(new RegExp(`(^|[^\\d.])${orig}\\.(\\d+)(?=[.\\s,;])`, 'g'), `$1${cur}.$2`)
      .replace(/Cláusula (\d+)ª/g, (s, k) => (map.has(k) && k !== orig ? `Cláusula ${map.get(k)}ª` : k === orig ? `Cláusula ${cur}ª` : s));
  });
}

/** Monta o texto do contrato com as cláusulas ligadas, já numeradas, e a linha da versão do modelo. */
export function composeClauses(clauses: ContractClause[], version: string): string {
  const lines: string[] = [`Modelo de cláusulas — versão de ${formatVersion(version)}`, ''];
  let inBox = false;
  const close = () => { if (inBox) { lines.push(HIGHLIGHT_END, ''); inBox = false; } };
  clauses.forEach((c, i) => {
    if (!c.enabled || !c.title.trim()) return;
    if (c.highlight && !inBox) { lines.push(HIGHLIGHT_START); inBox = true; }
    if (!c.highlight) close();
    // número de origem: o do primeiro item "N.M." do corpo, senão a posição
    const orig = c.body.match(/^\s*(\d+)\.\d+\./m)?.[1] ?? String(i + 1);
    lines.push(`CLÁUSULA ${orig}ª — ${c.title.trim().toUpperCase()}`);
    c.body.split('\n').forEach((b) => lines.push(b.replace(/\*\*/g, '')));
    lines.push('');
  });
  close();
  return renumberClauseLines(lines).join('\n').trim();
}

/* ---- Modelo salvo em Personalização (cache de módulo) ---- */
let template: { clauses: ContractClause[]; version: string } = { clauses: DEFAULT_CLAUSES, version: DEFAULT_CLAUSES_VERSION };

export const getContractTemplate = () => ({ clauses: cloneClauses(template.clauses), version: template.version });

export async function loadContractTemplate() {
  const { data } = await supabase.from('company_profile').select('id, contract_clauses, contract_clauses_version').limit(1).maybeSingle();
  const c = data?.contract_clauses as unknown as ContractClause[] | null;
  if (Array.isArray(c) && c.length) template = { clauses: c, version: data?.contract_clauses_version || DEFAULT_CLAUSES_VERSION };
  else template = { clauses: DEFAULT_CLAUSES, version: DEFAULT_CLAUSES_VERSION };
  return { id: data?.id ?? null, ...getContractTemplate(), custom: Array.isArray(c) && c.length > 0 };
}

export async function saveContractTemplate(id: string, clauses: ContractClause[] | null) {
  const version = new Date().toISOString();
  const { error } = await supabase.from('company_profile')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ contract_clauses: clauses as any, contract_clauses_version: clauses ? version : null })
    .eq('id', id);
  if (error) throw error;
  template = clauses ? { clauses, version } : { clauses: DEFAULT_CLAUSES, version: DEFAULT_CLAUSES_VERSION };
}

/** Campos de um contrato novo a partir do modelo atual. */
export function defaultContractFields() {
  const t = getContractTemplate();
  return { contractClauses: t.clauses, contractVersion: t.version, contractText: composeClauses(t.clauses, t.version) };
}
