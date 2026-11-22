# Comissão criada só quando gerente ou administrador marca PAGO

## O que muda
- Quando um **gerente ou administrador** muda um cliente para **PAGO**, a comissão continua sendo criada automaticamente, como hoje.
- Quando um **vendedor** marca o próprio cliente como PAGO, o cliente fica PAGO, mas **nenhuma comissão é criada**.
- Se depois um gerente ou administrador quiser gerar a comissão desse cliente, ele pode tirar o cliente de PAGO e marcar de novo, ou lançar a comissão manualmente na tela de Comissões.
- Nada mais muda: telas, cálculos e permissões dos vendedores continuam iguais.

## Verificação
- Conferir que a regra salva só cria a comissão quando quem faz a mudança é gerente ou administrador.
- Testar com a sua conta de administrador: marcar um cliente de teste como PAGO, confirmar que a comissão aparece e depois apagar o cliente e a comissão de teste.
- Marcar o apontamento "Vendedor cria comissão para si mesmo" como resolvido só se as duas conferências passarem.

## Detalhes técnicos
- Migração recriando `public.handle_client_paid()`: manter `paid_at = now()` na transição para `pago`, e executar o INSERT em `commissions` somente se `public.is_manager_or_admin(auth.uid())` for verdadeiro.
- Nenhuma alteração nas policies, no gatilho ou no código do app.
