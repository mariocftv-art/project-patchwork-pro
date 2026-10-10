import { supabase } from '@/integrations/supabase/client';

/** Uma cláusula do contrato. O corpo usa itens "1.1." e alíneas "a)"; a numeração é refeita sozinha. */
export interface ContractClause {
  id: string;
  title: string;
  body: string;
  enabled: boolean;
}

export const DEFAULT_CLAUSES_VERSION = '2026-10-10';

const C = (id: string, title: string, body: string[]): ContractClause => ({ id, title, body: body.join('\n'), enabled: true });

export const DEFAULT_CLAUSES: ContractClause[] = [
  C('objeto', 'DO OBJETO', [
    '1.1. O presente contrato tem por objeto o fornecimento de equipamentos e a prestação de Serviço Técnico Especializado de instalação, configuração e testes do sistema de segurança eletrônica descrito neste instrumento, a ser executado no endereço indicado pelo CONTRATANTE.',
    '1.2. Integram este contrato, como parte indissociável, a relação de equipamentos, materiais e serviços constante da tabela de itens deste documento:',
    '{ESCOPO}',
    '1.3. Serviços, equipamentos ou materiais não descritos neste contrato não estão incluídos e dependerão de novo orçamento e aprovação prévia por escrito.',
  ]),
  C('preco', 'DO PREÇO E DA FORMA DE PAGAMENTO', [
    '2.1. Pelo objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor total de {VALOR_TOTAL}. {PAGAMENTO}',
    '2.2. O valor contratado compreende os equipamentos, os materiais, o Serviço Técnico Especializado e os testes de funcionamento descritos na Cláusula 1ª.',
    '2.3. O atraso no pagamento de qualquer parcela sujeitará o CONTRATANTE a multa de 2% (dois por cento) sobre o valor em atraso, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IPCA, sem prejuízo da cobrança judicial do débito.',
    '2.4. O inadimplemento por prazo superior a 30 (trinta) dias faculta à CONTRATADA a suspensão de qualquer serviço de suporte ou garantia contratual até a regularização, bem como a adoção das medidas previstas na Cláusula 10ª.',
  ]),
  C('prazo', 'DO PRAZO E DA EXECUÇÃO', [
    '3.1. A execução dos serviços terá início na data acordada entre as partes e será concluída no prazo estimado informado neste contrato, salvo ocorrência das hipóteses previstas nos itens 3.3 e 3.4.',
    '3.2. A data e o horário da instalação serão previamente combinados com o CONTRATANTE, que deverá garantir o acesso ao local e a presença de pessoa maior de idade e autorizada durante toda a execução.',
    '3.3. Não serão computados no prazo os períodos decorrentes de: indisponibilidade do local, ausência de energia elétrica ou de infraestrutura adequada, impedimento de acesso, condições climáticas que inviabilizem o trabalho em altura ou em área externa, atraso de fornecedores, ou qualquer fato não imputável à CONTRATADA.',
    '3.4. Caso a equipe compareça na data e horário agendados e não consiga executar os serviços por motivo atribuível ao CONTRATANTE, será devida à CONTRATADA taxa de visita improdutiva no valor correspondente ao deslocamento da equipe, e nova data será agendada.',
  ]),
  C('obrig-contratada', 'DAS OBRIGAÇÕES DA CONTRATADA', [
    '4.1. Executar os serviços com zelo, técnica e observância das normas aplicáveis, empregando profissionais qualificados.',
    '4.2. Fornecer os equipamentos e materiais descritos neste contrato, novos e em perfeito estado de funcionamento.',
    '4.3. Realizar os testes de funcionamento do sistema e demonstrar sua operação ao CONTRATANTE antes da conclusão do serviço.',
    '4.4. Orientar o CONTRATANTE quanto ao uso do sistema, incluindo o acesso remoto por aplicativo, quando aplicável.',
    '4.5. Responder pelos danos que comprovadamente causar ao imóvel ou aos bens do CONTRATANTE por culpa de seus profissionais durante a execução, excluídos os desgastes e as intervenções inerentes e necessárias à instalação, previamente informados.',
    '4.6. Manter sigilo sobre as informações, imagens e dados a que tiver acesso em razão deste contrato.',
    '4.7. Deixar o local de trabalho limpo e organizado ao final da execução.',
  ]),
  C('obrig-contratante', 'DAS OBRIGAÇÕES DO CONTRATANTE', [
    '5.1. Fornecer acesso ao local nas datas e horários agendados.',
    '5.2. Disponibilizar, às suas expensas, a infraestrutura necessária à instalação, incluindo ponto de energia elétrica adequado e dentro das normas, rede de internet quando o sistema previr acesso remoto, e condições seguras de trabalho.',
    '5.3. Informar previamente a existência de tubulações, fiação elétrica, hidráulica ou de gás embutidas nos locais de perfuração. A CONTRATADA não responderá por danos decorrentes da ausência ou da incorreção dessa informação.',
    '5.4. Obter, quando necessário, as autorizações de condomínio, de locador, de órgão público ou de terceiros para a instalação.',
    '5.5. Efetuar os pagamentos nas datas acordadas.',
    '5.6. Conservar os equipamentos, observando as instruções de uso recebidas.',
    '5.7. Comunicar à CONTRATADA qualquer falha ou anormalidade no prazo mais breve possível.',
  ]),
  C('garantia', 'DA GARANTIA', [
    '6.1. A CONTRATADA concede garantia de {GARANTIA_PERIODO} sobre o Serviço Técnico Especializado de instalação, contada da data de conclusão, sem prejuízo da garantia legal prevista no Código de Defesa do Consumidor.',
    '6.2. Os equipamentos fornecidos têm a garantia concedida por seus respectivos fabricantes, nos prazos e condições por eles estabelecidos, cabendo à CONTRATADA o encaminhamento ao fabricante quando acionada dentro do prazo.',
    '6.3. Durante a vigência da garantia do serviço, a CONTRATADA realizará, sem custo adicional, os ajustes e correções decorrentes de falha de instalação ou de configuração.',
    '6.4. O acionamento da garantia deverá ser feito pelos canais oficiais de atendimento da CONTRATADA, com descrição da ocorrência.',
  ]),
  C('exclusoes', 'DAS EXCLUSÕES DA GARANTIA', [
    '7.1. A garantia não cobre falhas ou danos decorrentes de:',
    'a) descargas atmosféricas, surtos, oscilações ou interrupção no fornecimento de energia elétrica;',
    'b) uso inadequado, negligência, imperícia ou inobservância das instruções de uso;',
    'c) intervenção, reparo, alteração de posicionamento ou manutenção realizada por terceiros não autorizados pela CONTRATADA;',
    'd) vandalismo, furto, roubo, incêndio, alagamento, infiltração, maresia, animais, insetos ou caso fortuito e força maior;',
    'e) indisponibilidade, instabilidade ou alteração da internet, do provedor, do roteador ou da rede do CONTRATANTE;',
    'f) alteração de senhas, de configurações ou de aplicativos realizada pelo CONTRATANTE ou por terceiros;',
    'g) desgaste natural decorrente do uso e do tempo.',
    '7.2. Constatado que o chamado decorre de hipótese excluída da garantia, o atendimento será cobrado conforme a tabela vigente, mediante prévia informação e concordância do CONTRATANTE.',
  ]),
  C('limitacoes', 'DO FUNCIONAMENTO DO SISTEMA E DAS LIMITAÇÕES', [
    '8.1. O sistema de segurança eletrônica é ferramenta de monitoramento, registro e dissuasão. Não constitui serviço de vigilância armada, de monitoramento 24 horas por central, nem garante a prevenção de furtos, roubos, invasões ou quaisquer sinistros, salvo contratação específica e expressa desses serviços.',
    '8.2. A CONTRATADA não responde por eventos ocorridos no imóvel, por perdas patrimoniais ou por danos de qualquer natureza sofridos pelo CONTRATANTE ou por terceiros.',
    '8.3. O período de retenção das gravações depende da capacidade do dispositivo de armazenamento instalado, da quantidade de câmeras, da resolução e da configuração escolhidas, podendo variar. A CONTRATADA informará a estimativa, que não constitui garantia de prazo fixo.',
    '8.4. O acesso remoto por aplicativo depende de internet ativa e estável no imóvel e no dispositivo do CONTRATANTE, bem como da disponibilidade dos serviços do fabricante, estando fora da ingerência da CONTRATADA.',
    '8.5. A continuidade do funcionamento depende do fornecimento regular de energia elétrica no imóvel.',
  ]),
  C('propriedade', 'DA PROPRIEDADE DOS EQUIPAMENTOS', [
    '9.1. Os equipamentos fornecidos permanecem de propriedade da CONTRATADA até a quitação integral do valor contratado, nos termos dos artigos 521 e seguintes do Código Civil.',
    '9.2. Quitado o contrato, a propriedade transfere-se automaticamente ao CONTRATANTE, independentemente de novo instrumento.',
    '9.3. Enquanto não quitado, fica vedada a remoção, a alienação, a oneração ou o deslocamento dos equipamentos sem prévia anuência escrita da CONTRATADA.',
  ]),
  C('rescisao', 'DA RESCISÃO', [
    '10.1. Este contrato poderá ser rescindido:',
    'a) por acordo entre as partes, a qualquer tempo;',
    'b) pela CONTRATADA, em caso de inadimplemento superior a 30 (trinta) dias;',
    'c) pelo CONTRATANTE, mediante comunicação, respondendo pelos equipamentos já adquiridos e pelos serviços já executados;',
    'd) por descumprimento de obrigação essencial por qualquer das partes, após notificação com prazo de 10 (dez) dias para correção.',
    '10.2. Rescindido o contrato antes do início da execução, serão restituídos os valores pagos, deduzidos os custos comprovadamente incorridos pela CONTRATADA.',
    '10.3. Rescindido após o início da execução, serão devidos os equipamentos entregues e os serviços efetivamente prestados até a data da rescisão.',
  ]),
  C('aditivo', 'DA ALTERAÇÃO DO ESCOPO', [
    '11.1. Qualquer inclusão, exclusão ou alteração de equipamentos, serviços, quantidades, valores ou prazos somente terá validade mediante termo aditivo, assinado por ambas as partes.',
    '11.2. O contrato original e suas assinaturas permanecerão íntegros e válidos, sendo o aditivo documento complementar e autônomo.',
  ]),
  C('cameras', 'DO POSICIONAMENTO DAS CÂMERAS E DA PRIVACIDADE', [
    '12.1. O posicionamento e o ângulo das câmeras são definidos pelo CONTRATANTE, cabendo a ele a responsabilidade pelo enquadramento escolhido.',
    '12.2. O CONTRATANTE declara estar ciente de que a captação de imagens de áreas internas de imóveis vizinhos, de vias e de espaços de uso comum pode configurar violação de privacidade, respondendo exclusivamente por eventuais reclamações, notificações ou demandas de terceiros decorrentes do enquadramento adotado.',
    '12.3. A CONTRATADA orientará tecnicamente quanto ao melhor posicionamento, mas não responde pela decisão final do CONTRATANTE.',
  ]),
  C('lgpd', 'DA PROTEÇÃO DE DADOS', [
    '13.1. As imagens captadas pelo sistema são de titularidade e responsabilidade exclusiva do CONTRATANTE, que figura como controlador dos dados, nos termos da Lei nº 13.709/2018 (LGPD).',
    '13.2. A CONTRATADA atua exclusivamente como prestadora do serviço de instalação e configuração, não realizando armazenamento, acesso, tratamento ou monitoramento das imagens, salvo quando expressamente solicitado pelo CONTRATANTE para fins de suporte técnico.',
    '13.3. As senhas de acesso ao sistema serão entregues ao CONTRATANTE, recomendando-se sua alteração imediata. A CONTRATADA não se responsabiliza por acessos indevidos decorrentes da guarda inadequada das credenciais.',
    '13.4. Os dados pessoais fornecidos para a execução deste contrato serão tratados exclusivamente para essa finalidade e para o cumprimento de obrigações legais.',
  ]),
  C('suporte', 'DO SUPORTE TÉCNICO', [
    '14.1. O suporte técnico será prestado pelos canais oficiais de atendimento da CONTRATADA, em dias úteis e dentro do horário comercial.',
    '14.2. Chamados cobertos pela garantia não terão custo. Os demais serão orçados previamente e executados mediante aprovação do CONTRATANTE.',
    '14.3. Este contrato não inclui manutenção preventiva periódica, limpeza de equipamentos nem monitoramento ativo, salvo contratação específica.',
  ]),
  C('assinatura', 'DA ASSINATURA ELETRÔNICA', [
    '15.1. As partes reconhecem a validade da assinatura eletrônica aposta neste documento, nos termos do artigo 10, § 2º, da Medida Provisória nº 2.200-2/2001 e do artigo 107 do Código Civil, declarando aceitá-la como manifestação inequívoca de vontade.',
    '15.2. Cada assinatura é registrada com nome, documento de identificação, data, hora e código de integridade do conteúdo assinado, o que assegura que o documento não foi alterado após a assinatura.',
    '15.3. Trata-se de assinatura eletrônica simples, não equivalente a certificado digital ICP-Brasil, o que não lhe retira a validade entre as partes signatárias.',
  ]),
  C('gerais', 'DAS DISPOSIÇÕES GERAIS', [
    '16.1. A tolerância de qualquer das partes quanto ao descumprimento de obrigação não implica renúncia, novação ou alteração do contrato.',
    '16.2. A eventual nulidade de uma cláusula não afeta a validade das demais.',
    '16.3. Este contrato obriga as partes, seus herdeiros e sucessores.',
    '16.4. As comunicações entre as partes poderão ser feitas por escrito, por mensagem eletrônica ou por aplicativo de mensagens, nos contatos informados neste instrumento.',
    '16.5. Nas relações de consumo, nenhuma disposição deste contrato afasta ou limita os direitos assegurados ao CONTRATANTE pelo Código de Defesa do Consumidor.',
  ]),
  C('foro', 'DO FORO', [
    '17.1. Fica eleito o foro da comarca de São Paulo/SP para dirimir as questões oriundas deste contrato, ressalvado, nas relações de consumo, o direito do CONTRATANTE de demandar no foro de seu domicílio.',
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
  clauses.forEach((c, i) => {
    if (!c.enabled || !c.title.trim()) return;
    // número de origem: o do primeiro item "N.M." do corpo, senão a posição
    const orig = c.body.match(/^\s*(\d+)\.\d+\./m)?.[1] ?? String(i + 1);
    lines.push(`CLÁUSULA ${orig}ª — ${c.title.trim().toUpperCase()}`);
    c.body.split('\n').forEach((b) => lines.push(b.replace(/\*\*/g, '')));
    lines.push('');
  });
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
