# Cadastrar câmeras SIGMA / AITEK

## O que será feito
- Verificar novamente os cinco SKUs para impedir duplicidades.
- Cadastrar os cinco produtos ativos com nomes, descrições, marca, modelos, custos e preços informados.
- Organizar todos em **Câmeras**, separados entre **Câmeras Bullet** e **Câmeras Dome**.
- Manter destaque e promoção desligados nos novos itens, sem alterar produtos existentes.
- Como não foram fornecidos estoque nem imagens autorizadas, manter estoque zerado e imagem pendente, sem inventar dados.
- Registrar a referência de preço em um ponto central apenas para futuras importações, sem aplicá-la automaticamente.

## Validação
- Confirmar os cinco SKUs, preços e categorias na base.
- Verificar que os produtos aparecem na loja e são localizados pela busca.
- Confirmar que painel, carrinho, checkout, login e pedidos continuam funcionando.

## Detalhes técnicos
- Inserção idempotente por SKU único: um SKU já existente não será duplicado.
- Nenhuma tela existente será redesenhada ou terá seu comportamento alterado.
