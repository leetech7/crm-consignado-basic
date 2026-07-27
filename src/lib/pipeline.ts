export type PipelineStage =
  | "novo"
  | "quente"
  | "frio"
  | "descartado"
  | "em_negociacao"
  | "digitado"
  | "pago"
  | "remarketing";

export const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "novo", label: "Novos", color: "oklch(0.7 0.16 240)" },
  { id: "quente", label: "Quentes", color: "oklch(0.7 0.2 35)" },
  { id: "frio", label: "Frios", color: "oklch(0.65 0.12 220)" },
  { id: "em_negociacao", label: "Em negociação", color: "oklch(0.78 0.16 75)" },
  { id: "digitado", label: "Digitado", color: "oklch(0.7 0.18 300)" },
  { id: "pago", label: "PAGO!", color: "oklch(0.74 0.18 158)" },
  { id: "remarketing", label: "Remarketing", color: "oklch(0.7 0.15 320)" },
  { id: "descartado", label: "Descartados", color: "oklch(0.55 0.02 250)" },
];

export const ORGAOS = [
  "SIAPE",
  "CLT",
  "INSS",
  "MARINHA",
  "EXÉRCITO",
  "AERONÁUTICA",
  "PREFEITURA RJ",
  "PREFEITURA (OUTRAS)",
  "GOVERNO RJ",
  "GOVERNO (OUTROS)",
] as const;

export const stageLabel = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const stageColor = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.color ?? "oklch(0.6 0 0)";

export interface Client {
  id: string;
  owner_id: string;
  nome: string;
  cpf: string | null;
  idade: number | null;
  data_nascimento: string | null;
  telefone: string | null;
  orgao: string | null;
  endereco: string | null;
  observacoes: string | null;
  proximo_contato: string | null;
  taxa_rps: number | null;
  valor_bruto: number | null;
  valor_rps_total: number | null;
  margem_disponivel: number | null;
  fator: number | null;
  stage: PipelineStage;
  favorito: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const formatBRL = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const isValidCPF = (input: string): boolean => {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
};

export const formatCPF = (input: string): string => {
  const d = onlyDigits(input).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

// DDDs válidos no Brasil
const VALID_BR_DDDS = new Set([
  11,12,13,14,15,16,17,18,19,
  21,22,24,27,28,
  31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,
  51,53,54,55,
  61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,
  81,82,83,84,85,86,87,88,89,
  91,92,93,94,95,96,97,98,99,
]);

/**
 * Normaliza um telefone brasileiro para o formato E.164 sem o "+"
 * exigido pelo wa.me (ex.: 5511999999999).
 *
 * Regras:
 * - Remove todos os símbolos não numéricos.
 * - Aceita números com ou sem DDI 55.
 * - Exige DDD válido (2 dígitos) + 8 ou 9 dígitos do assinante.
 * - Retorna null se inválido.
 */
export const formatPhoneForWhatsApp = (phone: string | null): string | null => {
  if (!phone) return null;
  let digits = onlyDigits(phone);
  if (!digits) return null;

  // Remove zeros à esquerda (ex.: 0xx ou prefixo 00 internacional)
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  // Remove DDI 55 para validar a parte nacional
  let national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  // Esperamos 10 (fixo: DDD + 8) ou 11 (celular: DDD + 9) dígitos
  if (national.length !== 10 && national.length !== 11) return null;

  const ddd = parseInt(national.slice(0, 2), 10);
  if (!VALID_BR_DDDS.has(ddd)) return null;

  const subscriber = national.slice(2);
  // Celular deve começar com 9
  if (national.length === 11 && subscriber[0] !== "9") return null;
  // Fixo não pode começar com 0 ou 1
  if (national.length === 10 && /^[01]/.test(subscriber)) return null;

  return `55${national}`;
};

