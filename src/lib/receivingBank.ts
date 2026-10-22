export const receivingBankSchema = {
  banco_recebimento: { type: ["string", "null"], description: "Banco onde o titular recebe o salário ou benefício, não o banco do empréstimo." },
  agencia_recebimento: { type: ["string", "null"], description: "Agência de recebimento como texto, preservando zeros iniciais e dígito verificador." },
  conta_recebimento: { type: ["string", "null"], description: "Conta de recebimento como texto, preservando zeros iniciais, dígito verificador e operação se indicada." },
};

export function normalizeReceivingBank(data: Partial<Record<keyof typeof receivingBankSchema, unknown>>) {
  const text = (value: unknown) => typeof value === "string" ? value.trim() || null : null;
  return {
    banco_recebimento: text(data.banco_recebimento),
    agencia_recebimento: text(data.agencia_recebimento),
    conta_recebimento: text(data.conta_recebimento),
  };
}