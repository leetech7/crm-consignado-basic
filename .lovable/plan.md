# Evitar clientes duplicados (nome ou CPF)

Hoje já existem repetidos: 2 CPFs (um aparece 3 vezes, outro 2 vezes) e 2 nomes repetidos (3 e 2 vezes).

## O que vai mudar
1. **Aviso ao salvar** — ao salvar um cliente (novo ou editado), o sistema procura outro cliente com o mesmo CPF ou o mesmo nome (ignorando maiúsculas, acentos e espaços extras).
   - **CPF igual**: bloqueia o salvamento e mostra "Já existe um cliente com este CPF: <nome>", com botão **Abrir cliente existente**.
   - **Nome igual (CPF diferente ou vazio)**: mostra aviso "Já existe um cliente com este nome" com opções **Abrir existente** ou **Salvar mesmo assim** (homônimos acontecem).
2. **Aviso enquanto digita** — ao sair do campo CPF ou Nome, aparece logo abaixo um aviso se já houver cadastro igual.
3. **Proteção no banco** — o CPF passa a ser único por usuário, para que nem por duas abas abertas ao mesmo tempo seja possível duplicar. Só é ativado depois que os duplicados atuais forem resolvidos.
4. **Duplicados atuais** — listo os clientes repetidos para você decidir qual manter; nada é apagado sem sua confirmação.

## Detalhes técnicos
- Função pura `findDuplicate(nome, cpf, clients, excludeId)` em `src/lib/pipeline.ts` com normalização (dígitos do CPF; nome sem acento/caixa/espaços) + testes.
- Consulta RLS-scoped em `clients` no `ClientFormDialog` (blur e submit).
- Migração posterior: índice único parcial em `(owner_id, regexp_replace(cpf,'\D','','g'))` onde cpf não vazio; erro 23505 traduzido para mensagem em português.
