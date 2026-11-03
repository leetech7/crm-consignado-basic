# Regras dos bancos para consulta

## O que você vai ter
- Uma nova aba **"Regras dos Bancos"** no menu.
- Uma ficha para cada banco com: nome do banco, órgãos aceitos (SIAPE, INSS etc.), idade mínima e máxima, prazo máximo (em meses), taxa mínima e máxima (%), tipos de operação aceitos (Novo, Refin, Port. c/ Refin), troco mínimo, documentos exigidos e observações livres.
- Busca por banco e filtros por órgão e tipo de operação.
- Somente admin e gerente podem cadastrar, editar ou excluir regras. Todos os usuários podem consultar.
- Dentro da ficha do cliente, um botão **"Bancos compatíveis"** mostra quais bancos aceitam o cliente pela idade e pelo órgão, com o motivo quando algum banco não aceita (ex.: "idade acima de 75").

## Etapas
1. Criar o lugar no banco de dados para guardar as regras, com consulta liberada para usuários logados e edição só para admin e gerente.
2. Criar a tela de consulta e cadastro (lista, busca, formulário).
3. Criar a função que compara o cliente com as regras, com testes (idade fora da faixa, órgão não aceito, tipo de operação).
4. Adicionar o botão "Bancos compatíveis" na ficha do cliente.

## Possível próximo passo (não incluído agora)
- Perguntar à IA sobre as regras ("Banese aceita 76 anos no SIAPE?") ou anexar o PDF do roteiro de cada banco.

## Detalhes técnicos
- Nova tabela `bank_rules` (orgaos text[], tipos_operacao text[], idade_min/max int, prazo_max int, taxa_min/max numeric, troco_min numeric, documentos text, observacoes text, ativo bool, updated_by uuid). GRANT para authenticated/service_role; RLS: SELECT para autenticados, INSERT/UPDATE/DELETE via `is_manager_or_admin`.
- Rota `src/routes/app.bancos.tsx`, item no AppShell.
- Helper puro `src/lib/bankRules.ts` (`matchBankRules(client, rules)`) + `bankRules.test.ts`.
- Dialog `BankMatchDialog.tsx` aberto pela ficha do cliente.
