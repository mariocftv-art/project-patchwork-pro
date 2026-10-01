# Painel "white-label": cores, logo e admin do novo dono

Objetivo: quem fizer um remix recebe o painel completo, coloca a própria logo, cores e dados (CNPJ, telefone etc.), sem nenhuma informação sua e sem você como admin.

## O que muda para o usuário

1. **Paleta de cores do site inteiro** (aba Personalização > Identidade visual)
   - Cor principal (hoje amarelo), cor escura (faixas/rodapé, hoje preto), cor dos preços (hoje azul), cor do preço riscado (hoje vermelho).
   - Prévia ao vivo e botão "Restaurar cores padrão".
   - Aplicada na loja, no painel e nos PDFs.
2. **Logo em todo lugar**: a logo enviada aparece no topo do site, rodapé, tela de login do admin, PDFs e ícone do app instalado.
3. **Dados da empresa em todo lugar**: nome, CNPJ, telefone, WhatsApp, e-mail, Instagram e cidade passam a vir só da Personalização (topo, rodapé, páginas legais, rastreio, carrinho, contrato, assinatura).
4. **Primeiro acesso do novo dono**: num remix sem admin, a primeira pessoa que criar conta em /admin vira admin automaticamente. Depois disso, ninguém mais vira admin sozinho.
5. **Sem suas informações no código**: os valores padrão viram genéricos ("Minha Empresa", campos vazios, logo neutra). Os seus dados continuam salvos no seu banco, então seu site não muda visualmente.

## Garantias
- Seu site atual fica igual: suas cores, logo e dados já salvos continuam valendo.
- Nada de pedidos, orçamentos, contratos, cálculos ou produtos é alterado.

## Detalhes técnicos
- Novas colunas em company_profile: theme_primary, theme_dark, theme_price, theme_price_old (hex). Um ThemeProvider converte hex para HSL e sobrescreve as variáveis CSS (--primary, --accent, preço) em :root no carregamento.
- Hook useCompanyProfile (cache existente) usado em Layout, AdminLogin, Auth, Legal, TrackOrder, Cart, Product, ProductCard, NotificationsPopover, ContractsManagement, pdfBrand/premiumPDF; remover o CNPJ fixo da assinatura.
- defaultCompanyProfile vira genérico; migração grava seus dados atuais na linha existente (se faltar algum) antes da troca.
- RPC SECURITY DEFINER claim_first_admin(): insere role admin para auth.uid() somente se não houver nenhum admin; chamada após login em /admin. E-mails de admin removidos do código.
- Cores muito claras continuam ajustadas no PDF para leitura.
