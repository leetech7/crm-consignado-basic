# Preencher o cliente a partir do extrato (IA)

## O que o usuário verá
- Em cada anexo do cliente (PDF ou imagem de extrato/contracheque), um botão **"Ler extrato com IA"**.
- A IA lê o documento e mostra uma tela de revisão com **valor atual x valor encontrado** para:
  - Nome completo, CPF (com validação), Data de nascimento (idade calculada automaticamente)
  - Margem disponível, Margem cartão RCC, Margem cartão RMC
  - Órgão (quando identificável na lista existente)
  - **Contratos consignados vigentes**: banco, nº do contrato, parcela, prazo total, parcelas pagas/restantes, saldo devedor estimado, data de início
- Cada campo tem uma caixinha para aceitar ou não. Nada é sobrescrito sem confirmar.
- Ao confirmar, os dados vão para o cliente e os contratos aparecem numa nova seção **"Contratos vigentes"** dentro do cadastro (com opção de editar/remover manualmente).
- Fica registrado no histórico do cliente: "Dados importados do extrato X".

## Fora do escopo agora
- Parecer/regras de consignado (plano anterior) — pode vir depois, separado.
- Leitura automática no upload (fica pelo botão, para controlar custo).

## Detalhes técnicos
- Nova tabela `client_contracts` (client_id, banco, numero_contrato, valor_parcela, prazo_total, parcelas_pagas, parcelas_restantes, saldo_devedor, data_inicio, origem 'ia'|'manual'), com GRANT e RLS iguais aos de `client_attachments` (dono do cliente ou gerente/admin).
- Server function `extractFromAttachment` (createServerFn + requireSupabaseAuth): verifica acesso ao cliente via RLS, baixa o arquivo do bucket privado, envia ao Lovable AI Gateway (modelo multimodal padrão) com saída estruturada (tool calling / JSON schema), retorna os campos sugeridos. Erros 402/429 com mensagem em português.
- Componente `ExtractReviewDialog` em `ClientAttachments`; ao aplicar: update em `clients` + insert em `client_contracts` + registro em `activities`.
- Seção "Contratos vigentes" no `ClientFormDialog` em grade compacta, seguindo o layout atual.
