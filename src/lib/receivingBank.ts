export const receivingBankSchema = {
  banco_recebimento: { type: ["string", "null"], description: "Banco onde o titular recebe o salário ou benefício, não o banco do empréstimo." },
  agencia_recebimento: { type: ["string", "null"], description: "Agência de recebimento como texto, preservando zeros iniciais e dígito verificador." },
  conta_recebimento: { type: ["string", "null"], description: "Conta de recebimento como texto, preservando zeros iniciais, dígito verificador e operação se indicada." },
};

export interface ReceivingBankData {
  banco_recebimento: string | null;
  agencia_recebimento: string | null;
  conta_recebimento: string | null;
}

// Resultado da conferência do banco de recebimento contra o contracheque:
// null = documento não trouxe dados bancários de recebimento (nada a conferir)
// "ok" = confere com o que já está cadastrado
// "diferente" = o documento mostra dados diferentes dos cadastrados
// "conferir" = documento trouxe dados, mas o cliente ainda não tinha nenhum cadastrado
export type ReceivingBankCheck = "ok" | "diferente" | "conferir" | null;

const digits = (value: unknown) => (typeof value === "string" ? value.replace(/\D/g, "") : "");
const normBank = (value: unknown) =>
  typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

export function checkReceivingBank(current: ReceivingBankData, found: ReceivingBankData): ReceivingBankCheck {
  const foundBank = normBank(found.banco_recebimento);
  const foundAg = digits(found.agencia_recebimento);
  const foundCt = digits(found.conta_recebimento);
  if (!foundBank && !foundAg && !foundCt) return null;

  const curBank = normBank(current.banco_recebimento);
  const curAg = digits(current.agencia_recebimento);
  const curCt = digits(current.conta_recebimento);
  if (!curBank && !curAg && !curCt) return "conferir";

  // Banco: tolera variações de nome (ex.: "BANCO DO BRASIL S.A." vs "Banco do Brasil").
  const bankDiff = foundBank && curBank ? !(curBank.includes(foundBank) || foundBank.includes(curBank)) : false;
  // Agência/conta: compara apenas os dígitos, ignorando pontuação e dígito formatado.
  const agDiff = foundAg && curAg ? foundAg !== curAg : false;
  const ctDiff = foundCt && curCt ? foundCt !== curCt : false;
  return bankDiff || agDiff || ctDiff ? "diferente" : "ok";
}

export function normalizeReceivingBank(data: Partial<Record<keyof typeof receivingBankSchema, unknown>>) {
  const text = (value: unknown) => typeof value === "string" ? value.trim() || null : null;
  return {
    banco_recebimento: text(data.banco_recebimento),
    agencia_recebimento: text(data.agencia_recebimento),
    conta_recebimento: text(data.conta_recebimento),
  };
}