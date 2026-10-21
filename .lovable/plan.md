# Bandeirinhas de estágio

Cada cliente mostra uma bandeirinha colorida (formato de flâmula, com a ponta recortada) com o estágio atual.

## Tags
- NOVO — azul
- EM NEGOCIAÇÃO — âmbar
- CONTRATO DIGITADO — roxo
- PAGO (FINALIZADO) — verde
- C.REJEITOU (cliente desistiu) — laranja (estágio novo)
- REPROVADO (banco reprovou) — vermelho (estágio novo)

Os estágios atuais (Quentes, Frios, Remarketing, Descartados) continuam existindo, com bandeirinha no mesmo estilo.

## Onde aparece
- Lista de clientes: ao lado do nome (celular e computador).
- Cards do pipeline: no topo do card; o pipeline ganha as colunas C.REJEITOU e REPROVADO.
- Cadastro do cliente: no topo, uma fileira de bandeirinhas clicáveis para escolher o estágio.
- O filtro por estágio da lista inclui os dois novos.

## Detalhes técnicos
- Migração aditiva: `ALTER TYPE pipeline_stage ADD VALUE 'cliente_rejeitou'` e `'reprovado'`.
- `STAGES` em `src/lib/pipeline.ts`: novos ids, rótulos atualizados (Digitado → "CONTRATO DIGITADO", PAGO → "PAGO (FINALIZADO)") e campo `short` para a bandeirinha.
- Novo componente `StageFlag.tsx` (clip-path de flâmula, cor via `color-mix` da cor do estágio, texto em maiúsculas pequeno) usado em app.clientes, app.pipeline e ClientFormDialog (seletor).
- Dashboard ignora os dois novos estágios na contagem de "em jogo" como hoje faz com descartados.
