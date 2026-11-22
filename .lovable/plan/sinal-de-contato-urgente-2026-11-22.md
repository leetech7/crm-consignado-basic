# Sinal de contato urgente

Um marcador separado das tags: um ícone de atenção (triângulo vermelho/âmbar) que você liga e desliga em cada cliente.

## Como vai funcionar
- **Lista de clientes:** ícone de atenção clicável ao lado do nome (computador e celular). Clique liga/desliga na hora. Desligado aparece apagado, só para clicar.
- **Topo da lista:** clientes urgentes aparecem sempre primeiro, antes de Contrato digitado / Em negociação / Quentes.
- **Filtro:** novo botão "Só urgentes" na lista.
- **Pipeline:** o ícone aparece no card, ao lado do nome.
- **Cadastro do cliente:** botão "Urgente" no topo, junto às bandeirinhas de estágio, sem substituí-las.
- O estágio (tag) não muda ao marcar urgente.

## Detalhes técnicos
- Migração aditiva: `ALTER TABLE clients ADD COLUMN urgente boolean NOT NULL DEFAULT false` (RLS existente já cobre).
- `Client` em `src/lib/pipeline.ts` ganha `urgente`; ordenação padrão: urgente primeiro, depois `stagePriority`, depois data.
- Novo componente `UrgentToggle` (ícone `AlertTriangle`, cor via token `--destructive`/`--warning`), usado em app.clientes, app.pipeline e ClientFormDialog.
- Teste em `pipeline.test.ts` garantindo que urgente vem antes de "digitado" na ordenação.
