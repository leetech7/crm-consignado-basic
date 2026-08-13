# Dashboard de Bolhas Flutuantes

Nova visualização animada do pipeline: cada cliente vira uma bolha flutuante, com tamanho e cor conforme o estágio. Quando um lead vai para PAGO, a bolha estoura com fogos de artifício.

## Como vai funcionar

- Nova aba "Bolhas" no menu (`/app/bolhas`), sem alterar o dashboard atual.
- Cada cliente ativo vira uma bolha com o primeiro nome dentro e o valor bruto abaixo.
- Tamanho e cor por estágio:
  - Frios / Novos: bolhas pequenas, cinza-azuladas
  - Quentes / Em negociação: bolhas médias, âmbar
  - Digitado / Aguardando link (contrato feito): bolhas grandes, roxo/verde-água
  - Descartados: não aparecem
- Movimento: as bolhas flutuam continuamente, com leve deriva e repique nas bordas, além de um brilho pulsante.
- Interação: passar o mouse pausa a bolha e mostra os dados (nome, CPF, órgão, valor); clicar abre o cadastro do cliente.
- Estouro com fogos: ao mover um lead para PAGO (pelo menu da própria bolha ou detectado em tempo real), a bolha infla, estoura e dispara fogos de artifício com partículas coloridas, som opcional e um toast "PAGO!".
- Rodapé com contadores por estágio e valor total em jogo.

## Detalhes técnicos

- Rota nova `src/routes/app.bolhas.tsx`, carregando `clients` via Supabase (mesma consulta do pipeline) e assinando `postgres_changes` para refletir mudanças de estágio ao vivo.
- Componente `src/components/BubbleField.tsx`: simulação em `requestAnimationFrame` com posições/velocidades em `useRef`, bolhas renderizadas como divs absolutas com `transform` (sem re-render por frame).
- Componente `src/components/FireworksBurst.tsx`: canvas sobreposto, partículas com gravidade e fade, limpeza automática ao terminar.
- Tamanho da bolha derivado do estágio e escalado suavemente pelo `valor_bruto`; cores vindas dos tokens de `STAGES` em `src/lib/pipeline.ts`.
- Respeita `prefers-reduced-motion`: sem flutuação nem fogos, apenas layout estático.
- Responsivo: em telas pequenas, menos bolhas simultâneas e raio reduzido; link adicionado ao `AppShell`.
- Head da rota com título/descrição próprios.
