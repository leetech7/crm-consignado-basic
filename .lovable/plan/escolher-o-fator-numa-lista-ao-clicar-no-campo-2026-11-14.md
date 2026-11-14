# Escolher o Fator numa lista ao clicar no campo

## O que vai mudar
- Ao clicar no campo **Fator** do cliente, abre ao lado uma lista com a tabela de fatores (a mesma da tela Fatores): **Idade | Fator**.
- A linha da idade do cliente aparece destacada e a lista já abre rolada até ela.
- Há uma busca rápida por idade no topo da lista.
- Clicar numa linha preenche o Fator e fecha a lista; o Valor bruto recalcula na hora.
- Continua sendo possível digitar o fator à mão e copiar o valor.
- No celular, a lista abre abaixo do campo, na largura da tela.

## Detalhes técnicos
- Popover (shadcn) ancorado no input do Fator em `ClientFormDialog.tsx`, reaproveitando `ageFactors` já carregado no form.
- Ao escolher: `update("fator", f.toFixed(5))` (marca fatorTouched, mantendo a regra atual).
- `scrollIntoView` da linha da idade ao abrir; estado vazio "Nenhum fator cadastrado" com link para a tela Fatores.
