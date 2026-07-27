## Tabela de fatores por idade (import CSV)

### O que será feito
1. **Nova tabela `age_factors`** no banco (idade INT PK, fator NUMERIC(12,5), updated_at). RLS: leitura por qualquer usuário autenticado; escrita apenas Admin.
2. **Nova página `/app/fatores`** (menu lateral, visível só para Admin):
   - Lista atual de idades × fatores.
   - Botão **Importar CSV** que aceita arquivo com formato `idade,fator` (cabeçalho opcional). Faz upsert em lote — substitui os valores das idades presentes no arquivo, mantém as demais. Opção "Substituir tudo" (limpa antes de importar).
   - Botão **Baixar modelo CSV** e **Exportar atual**.
   - Edição inline de linhas individuais (opcional, para ajustes rápidos).
3. **Autopreenchimento no cadastro do cliente** (`ClientFormDialog`):
   - Ao definir idade (manual ou via data de nascimento), busca o fator correspondente e preenche o campo Fator.
   - Campo continua editável; se o usuário digitar, mantém o valor manual (rastreado como já é hoje o Valor bruto).
   - Se não houver fator para aquela idade, deixa em branco e mostra aviso discreto.

### Formato do CSV
```
idade,fator
18,0.00234
19,0.00238
...
```
- Separador vírgula ou ponto e vírgula (detecta automaticamente).
- Decimal aceita `,` ou `.`.
- Ignora linhas inválidas e mostra resumo (X importados, Y ignorados).

### Detalhes técnicos
- Migration: `CREATE TABLE public.age_factors` + GRANTs + RLS (`SELECT` para authenticated; `INSERT/UPDATE/DELETE` só via `has_role(auth.uid(),'admin')`).
- Cache client-side com React Query (`queryKey: ['age_factors']`) e invalidação após import.
- Parser CSV simples em JS (sem lib extra).
- Novo item no menu do `AppShell` gated por role admin.
