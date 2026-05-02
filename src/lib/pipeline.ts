export type PipelineStage =
  | "novo"
  | "quente"
  | "frio"
  | "descartado"
  | "em_negociacao"
  | "digitado"
  | "aguardando_link"
  | "pago";

export const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "novo", label: "Novos", color: "oklch(0.7 0.16 240)" },
  { id: "quente", label: "Quentes", color: "oklch(0.7 0.2 35)" },
  { id: "frio", label: "Frios", color: "oklch(0.65 0.12 220)" },
  { id: "em_negociacao", label: "Em negociação", color: "oklch(0.78 0.16 75)" },
  { id: "digitado", label: "Digitado", color: "oklch(0.7 0.18 300)" },
  { id: "aguardando_link", label: "Aguardando link/pgto", color: "oklch(0.72 0.16 200)" },
  { id: "pago", label: "PAGO!", color: "oklch(0.74 0.18 158)" },
  { id: "descartado", label: "Descartados", color: "oklch(0.55 0.02 250)" },
];

export const stageLabel = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const stageColor = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.color ?? "oklch(0.6 0 0)";

export interface Client {
  id: string;
  owner_id: string;
  nome: string;
  cpf: string | null;
  idade: number | null;
  telefone: string | null;
  orgao: string | null;
  endereco: string | null;
  observacoes: string | null;
  proximo_contato: string | null;
  taxa_rps: number | null;
  stage: PipelineStage;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const formatBRL = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const onlyDigits = (s: string) => s.replace(/\D/g, "");

export const formatPhoneForWhatsApp = (phone: string | null) => {
  if (!phone) return null;
  const digits = onlyDigits(phone);
  if (digits.length < 10) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
};
