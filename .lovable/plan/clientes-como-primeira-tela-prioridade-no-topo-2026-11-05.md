# Clientes como primeira tela + prioridade no topo

## O que muda
- Ao abrir o app (ou depois do login), a primeira tela passa a ser **Clientes** em vez do Dashboard. O Dashboard continua no menu.
- Na lista de clientes, a ordem padrão passa a ser:
  1. CONTRATO DIGITADO
  2. EM NEGOCIAÇÃO
  3. Quentes
  4. Demais clientes
- Dentro de cada grupo, os mais recentes primeiro (como hoje).
- Se você clicar num cabeçalho de coluna para ordenar (nome, órgão etc.), essa ordenação manual é respeitada normalmente.

## Detalhes técnicos
- `src/routes/index.tsx` e `src/routes/login.tsx` (redirect pós-login e emailRedirectTo): `/app/dashboard` → `/app/clientes`.
- `app.clientes.tsx`: no `sorted`, com a ordenação padrão (`created_at`), aplicar peso por estágio (`digitado`=0, `em_negociacao`=1, `quente`=2, resto=3) antes da data; substitui a prioridade antiga de favoritos.
- Teste pequeno do peso por estágio em `src/lib`.
