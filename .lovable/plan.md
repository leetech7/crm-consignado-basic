# E-mail e estado civil do cliente

## O que muda
- Dois novos campos na ficha do cliente, numa nova linha logo abaixo de nascimento, idade, telefone, órgão e origem:
  - **E-mail**: validação simples de formato e um botão para copiar.
  - **Estado civil**: lista com Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União estável e Separado(a).
- Os dois campos são salvos com o cliente, entram no rascunho automático e na exportação CSV.
- A leitura de documentos com IA também passa a preencher e-mail e estado civil quando eles aparecem no documento, e você confere antes de aplicar.

## Detalhes técnicos
- Migração aditiva: `clients.email text`, `clients.estado_civil text` (os dois podem ficar vazios).
- `ESTADOS_CIVIS` em `src/lib/pipeline.ts`; o estado inicial, o carregamento e o salvamento em `ClientFormDialog.tsx`; a coluna no CSV.
- Esquema de extração e linhas na revisão: `email` e `estado_civil` (opcionais, nada é inventado).
