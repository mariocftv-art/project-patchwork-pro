import { Link } from 'react-router-dom';

import { useBrand } from '@/lib/brand';

function Wrap({ title, children }: { title: string; children: React.ReactNode }) {
  const b = useBrand();
  return (
    <article className="max-w-3xl mx-auto bg-card rounded-lg border border-border p-6 sm:p-8 text-sm leading-relaxed text-foreground space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">Última atualização: setembro de 2026 · {b.name}{b.cnpj ? ` · CNPJ ${b.cnpj}` : ''}</p>
      {children}
      <p><Link to="/" className="underline font-medium">← Voltar para a loja</Link></p>
    </article>
  );
}

const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-semibold pt-2">{children}</h2>;

export function Privacy() {
  return (
    <Wrap title="Política de Privacidade">
      <p>Esta política explica como a {useBrand().name} trata seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018 – LGPD).</p>
      <H>1. Dados coletados</H>
      <p>Nome, e-mail, telefone/WhatsApp, CPF (opcional), endereço de entrega e itens do pedido ou orçamento.</p>
      <H>2. Finalidade</H>
      <p>Processar pedidos e orçamentos, entregar produtos, prestar serviços de instalação, emitir documentos fiscais, informar o status do pedido e dar suporte.</p>
      <H>3. Base legal</H>
      <p>Execução de contrato, cumprimento de obrigação legal e legítimo interesse, nos termos do art. 7º da LGPD.</p>
      <H>4. Compartilhamento</H>
      <p>Somente com prestadores essenciais (hospedagem, transporte, meios de pagamento) e autoridades quando exigido por lei. Não vendemos seus dados.</p>
      <H>5. Armazenamento e segurança</H>
      <p>Os dados ficam em servidores protegidos, com acesso restrito a administradores autorizados, pelo tempo necessário às finalidades e às obrigações legais.</p>
      <H>6. Seus direitos</H>
      <p>Você pode solicitar confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelos nossos canais de contato.</p>
      <H>7. Cookies e armazenamento local</H>
      <p>Usamos armazenamento local do navegador para carrinho, favoritos e acompanhamento de pedidos. Não usamos cookies de publicidade.</p>
      <H>8. Contato do encarregado</H>
      <p>WhatsApp {useBrand().phone}.</p>
    </Wrap>
  );
}

export function Terms() {
  return (
    <Wrap title="Termos de Uso">
      <H>1. Aceite</H>
      <p>Ao usar este site você concorda com estes termos e com a Política de Privacidade.</p>
      <H>2. Produtos e preços</H>
      <p>Preços e disponibilidade podem mudar sem aviso. Pedidos só são confirmados após contato da loja e confirmação do pagamento.</p>
      <H>3. Pagamento e entrega</H>
      <p>As formas de pagamento, o frete e os prazos são combinados no fechamento do pedido.</p>
      <H>4. Trocas e devoluções</H>
      <p>Seguimos o Código de Defesa do Consumidor, incluindo o direito de arrependimento de 7 dias para compras feitas fora do estabelecimento.</p>
      <H>5. Garantia</H>
      <p>Garantia legal e, quando houver, garantia contratual informada no orçamento ou contrato.</p>
      <H>6. Responsabilidades</H>
      <p>O cliente deve informar dados corretos. A loja não se responsabiliza por uso inadequado dos equipamentos.</p>
      <H>7. Foro</H>
      <p>Fica eleito o foro da comarca de São Paulo/SP.</p>
    </Wrap>
  );
}
