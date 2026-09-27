# Ajustes de segurança e design da loja

Os recursos que já existem continuam funcionando. Os erros citados na mensagem não fazem parte deste trabalho.

## 1. Proteção dos pedidos (primeiro)
- Religar a proteção na tabela de pedidos, com regras específicas:
  - Qualquer visitante pode **criar** um pedido. Os dados são conferidos: itens, total maior que zero e campos obrigatórios preenchidos.
  - Só administradores podem **ler, alterar ou excluir** pedidos.
  - A página de rastreio e a de confirmação passam a buscar o pedido por uma consulta segura pelo número do pedido. Essa consulta devolve só o status e o resumo, sem a lista inteira.
- A causa provável da falha no celular é esta: o checkout grava o pedido e, logo em seguida, tenta **ler** o pedido gravado. Com a proteção ligada, um visitante não pode ler pedidos, então a gravação parecia falhar. A correção é gravar sem ler de volta e gerar o número do pedido no próprio aparelho.
- Também serão conferidos a origem da requisição, os cabeçalhos enviados e o limite de requisições. Depois disso, testo um pedido de ponta a ponta simulando um celular, sem login.
- A memória do projeto que manda manter a proteção desligada será atualizada.

## 2. Cabeçalhos de segurança
- Uma CSP restritiva e a Referrer-Policy entram na própria página.
- **Limitação:** HSTS, nosniff e frame-ancestors só podem ser definidos pelo servidor que hospeda o site. A hospedagem do Lovable já usa HTTPS, mas não permite configurar esses cabeçalhos por conta própria. Vou incluir o que for possível e avisar o que depende da hospedagem.

## 3. Links externos
- Todos os links que abrem outros sites (WhatsApp, Instagram, PDFs) recebem `rel="noopener noreferrer"`.

## 4. Páginas legais
- Duas páginas novas: Política de Privacidade (LGPD) e Termos de Uso, com links no rodapé.
- O texto será um modelo padrão. O jurídico da empresa deve revisar.

## 5. Rodapé
- O CNPJ sai do cabeçalho e vai para o rodapé, junto com a razão social, o WhatsApp, o e-mail e o Instagram @linkmrstore.

## 6. Cores
- A loja fica só com o amarelo da marca, preto e cinzas neutros.
- Sai o roxo do banner e o verde-água da barra de categorias.
- O azul de links e botões vira preto ou amarelo.

## 7. Produtos esgotados (estoque 0)
- Aparecem por último na lista, com o cartão mais apagado.
- No lugar do botão de compra aparece "Avise-me quando chegar". Ele abre o WhatsApp com o nome do produto.

## 8. Filtro de categorias
- Categorias sem nenhum produto somem do filtro lateral.

## 9. Botões flutuantes
- Fica só o botão do WhatsApp. O Instagram vai para o rodapé.

## 10. Frete grátis
- O selo sai de cada cartão de produto e vira uma faixa única no topo do site.

## 11. Acessibilidade
- As cores de texto atingem o contraste AA.
- Todo botão e link mostra um contorno amarelo e preto visível quando recebe foco pelo teclado.

## Detalhes técnicos
- Migração: `ENABLE ROW LEVEL SECURITY` em `orders`. Política de INSERT para anon e authenticated com `WITH CHECK` validando os campos. Políticas de SELECT, UPDATE e DELETE só via `has_role(auth.uid(),'admin')`. Nova função SECURITY DEFINER `get_order_by_number(text)` para o rastreio.
- No checkout: `insert()` sem `.select()`.
- O realtime do rastreio passa a ser polling pela função, porque o realtime obedece à proteção da tabela.
- CSP via `<meta http-equiv>` no `index.html`, liberando o próprio site, o backend e as imagens.
- Os tokens de cor em `index.css` e `tailwind.config.ts` substituem as cores `ml-*`.
- Arquivos afetados: `ProductCard`, `Home`, `Layout`, `PromoBanner`, rotas novas `/privacidade` e `/termos`.
