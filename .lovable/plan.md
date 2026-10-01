# Pagamento com Mercado Pago (Checkout Pro)

## O que você vai ver
1. **Personalização → aba "Pagamento"**: botão Ligado/Desligado, Public Key, Access Token, Modo Teste/Produção e botão **"Testar conexão"**, que mostra "Conectado como <nome da conta>".
   - Depois de salvo, o Access Token mostra só os 4 últimos caracteres. Para trocar, você digita o token novo inteiro.
2. **Formas aceitas** (caixas de seleção): Cartão de crédito, Pix, Boleto e Cartão de débito. O rodapé e o carrinho mostram só as que estiverem marcadas. O texto fixo atual sai.
3. **Checkout Pro**: o cliente vai para a página do próprio Mercado Pago para pagar. Nenhum dado de cartão passa pelo seu site. Depois volta para a tela "Pedido confirmado".
4. **Confirmação automática**: quando o Mercado Pago aprova o pagamento, o pedido muda sozinho para **Pago** e aparece um aviso no painel. Cancelado ou recusado vira **Cancelado**.
5. **Aba "Pedidos"** (a que já existe) mostra número, cliente, valor, forma de pagamento, status (Aguardando / Pago / Cancelado) e data.
6. **Mercado Pago desligado**: o botão "Finalizar Compra" vira **"Solicitar pedido pelo WhatsApp"** e segue o fluxo de hoje. A mensagem do WhatsApp não muda.

## Um ponto de segurança para você decidir
O site não consegue gravar um "secret" do sistema a partir de um formulário. Isso só se faz por fora, no painel do Lovable. Para você trocar o token sem mexer em código, ele fica guardado em uma área trancada do banco, com o mesmo nível de proteção:
- só as funções do servidor conseguem ler o token;
- nem o painel admin nem o navegador conseguem ler o token de volta (o painel só recebe os 4 últimos caracteres);
- ele nunca vai para o site nem para nenhuma variável VITE_.

## Detalhes técnicos
- Tabela `payment_settings` (pública para leitura): enabled, mode, public_key, methods[], token_last4. Leitura liberada para anon (a Public Key é feita para isso); gravação só admin.
- Tabela `payment_secrets` (access_token): sem GRANT para anon/authenticated, só service_role.
- Em `orders`: colunas payment_status, mp_preference_id e mp_payment_id. Status mapeado para Aguardando, Pago e Cancelado.
- Funções no servidor:
  - `mp-admin`: salvar o token (com checagem de admin via has_role) e testar a conexão (GET /users/me).
  - `mp-create-preference`: recalcula preços e frete no servidor pelo id do produto (o cliente não define o valor), cria a preferência com external_reference = número do pedido, excluded_payment_types conforme as formas marcadas e notification_url apontando para o webhook. Devolve init_point (produção) ou sandbox_init_point (teste).
  - `mp-webhook` (verify_jwt=false): consulta o pagamento direto na API do Mercado Pago (não confia no corpo do aviso), atualiza o pedido e grava um registro em admin_logs para o aviso no painel. Também dispara o push que já existe.
- Checkout.tsx: se o Mercado Pago estiver ligado, cria o pedido e redireciona; se estiver desligado, usa o fluxo do WhatsApp.
- Rodapé (Layout.tsx) e carrinho passam a ler `methods`.
- AGENTS.md: registrar a regra "token MP só em tabela service_role, usado só nas funções do servidor".
