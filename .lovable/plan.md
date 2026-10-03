# Análise automática de documentos com IA (Consignado)

## O que o usuário vai ter

1. **Nova aba "Regras de Consignado"** (admin/gerente editam, todos leem)
   - Lista de regras e instruções em texto livre, organizada por órgão (SIAPE, INSS, CLT, Marinha etc.) e uma seção "Regras gerais".
   - Exemplos: margem máxima 35% + 5% cartão, idade limite por banco, fator por idade, quando sugerir compra de dívida, sinais de alerta.
   - Essas regras são enviadas para a IA em toda análise, então a equipe ajusta o "cérebro" sem precisar de programação.

2. **Botão "Analisar com IA" em cada anexo** (PDF ou imagem de extrato/contracheque) no cadastro do cliente
   - A IA lê o documento e extrai: nome, CPF, data de nascimento, órgão, margem disponível, margem RCC, margem RMC, contratos/parcelas existentes (base para compra de dívida).
   - Abre uma tela de revisão mostrando **valor atual x valor sugerido** para cada campo, com caixinhas para escolher o que aplicar. Nada é sobrescrito sem confirmação.
   - Ao aplicar, o fator e o valor bruto recalculam automaticamente como hoje.

3. **Parecer da IA**
   - Texto curto: Aprovável / Atenção / Não recomendado, motivos, regras aplicadas, sugestão de operação (novo, compra de dívida, cartão) e próximos passos.
   - Fica salvo no histórico do cliente (data, documento analisado, quem pediu) e pode ser copiado.

## Detalhes técnicos

- Tabela `consignado_rules` (orgao nullable, titulo, conteudo, ordem, ativo) com GRANTs + RLS: leitura para autenticados, escrita admin/gerente via `has_role`.
- Tabela `client_ai_analyses` (client_id, attachment_id, extracted jsonb, parecer text, veredito, created_by, created_at) com RLS seguindo o acesso já existente aos clientes.
- Server function `analyzeAttachment` (createServerFn + requireSupabaseAuth): baixa o arquivo do bucket privado, envia PDF/imagem ao Lovable AI Gateway (modelo padrão `openai/gpt-6-astra`, Responses API, streaming) junto com as regras ativas do órgão + gerais e os dados atuais do cliente; saída estruturada (schema simples) com campos extraídos + parecer.
- Tratamento de erros 402/429 com mensagem clara em português.
- Nova rota `/app/regras` + item no menu; componente `AiAnalysisDialog` ligado ao `ClientAttachments`/`ClientFormDialog`.
- Regras iniciais pré-cadastradas como exemplo (editáveis) — valores genéricos que a equipe deve revisar.

## Fora do escopo
- Análise automática no momento do upload (fica manual pelo botão, para controlar custo).

---

# Ajuste extra: campos de valores mais compactos no cadastro do cliente

- Agrupar os campos financeiros (Compra de dívida, Margem disponível, Margem RCC, Margem RMC, Fator, Valor bruto, RPS %, Valor RPS, Valor líquido) num bloco próprio "Valores", em grade compacta.
- Grade: 2 colunas no celular, 3 no tablet, 4-5 no laptop/desktop; campos com altura menor, rótulos curtos ("Margem RCC", "RPS %") e números alinhados à direita.
- Remover a largura mínima fixa do Valor bruto (causa sobreposição) e usar `min-w-0` em todos os campos, sem cortar valores de 8 dígitos.
- Botões auxiliares (recalcular/copiar) menores, dentro do campo, sem empurrar o layout.
- Conferir visualmente em 375px, 768px e 1280px.
