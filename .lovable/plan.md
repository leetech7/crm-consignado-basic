## Mudança

Transformar o campo "Órgão" no formulário de cliente (`ClientFormDialog.tsx`) de input de texto livre para um Select com as opções:

- SIAPE
- CLT
- INSS
- MARINHA
- EXÉRCITO
- AERONÁUTICA
- PREFEITURA RJ
- PREFEITURA (OUTRAS)
- GOVERNO RJ
- GOVERNO (OUTROS)

## Detalhes técnicos

- Substituir `<Input>` do campo `orgao` por `<Select>` (shadcn já em uso no projeto).
- Definir constante `ORGAOS` exportada em `src/lib/pipeline.ts` para reuso (form + filtro da página de Clientes).
- Atualizar o filtro "Por órgão" em `src/routes/app.clientes.tsx`: trocar o input de texto por um Select com as mesmas opções (mantém busca consistente).
- Sem mudanças no banco — `orgao` continua `text` nullable. Valores antigos fora da lista continuam sendo exibidos normalmente; se o cliente tiver um valor legado, o Select mostra esse valor selecionado e o usuário pode trocar por um da lista ao editar.

## Compatibilidade com dados existentes

Para não perder valores legados (ex.: "Prefeitura SP" digitado antes), o Select aceita o valor atual mesmo se não estiver na lista — renderizando-o como item desabilitado "(legado: X)" até o usuário escolher um valor padronizado.
