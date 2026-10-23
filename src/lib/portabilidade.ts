import type { Database } from "@/integrations/supabase/types";
import { formatBRL, formatPct } from "./pipeline";

export type PortabilityClient = Pick<Database["public"]["Tables"]["clients"]["Row"], "id" | "nome" | "cpf" | "telefone" | "orgao" | "taxa_rps">;
export type PortabilityContract = Database["public"]["Tables"]["client_contracts"]["Row"] & { clients: PortabilityClient | null };
export type PortabilityGroup = { client: PortabilityClient; contracts: PortabilityContract[] };

export function groupPortabilityContracts(rows: PortabilityContract[]): PortabilityGroup[] {
  const groups = new Map<string, PortabilityGroup>();
  for (const row of rows) {
    if (!row.portar || !row.clients) continue;
    const group = groups.get(row.client_id) ?? { client: row.clients, contracts: [] };
    group.contracts.push(row);
    groups.set(row.client_id, group);
  }
  return [...groups.values()].sort((a, b) => a.client.nome.localeCompare(b.client.nome, "pt-BR"));
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export function portabilityValues(troco: number | null, taxa: number | null) {
  if (troco === null || taxa === null || !Number.isFinite(troco) || !Number.isFinite(taxa) || troco < 0 || taxa < 0 || taxa > 100) return null;
  const bruto = money(troco);
  const rps = money(bruto * taxa / 100);
  return { bruto, rps, liquido: money(bruto - rps) };
}

export function portabilityTotals(group: PortabilityGroup) {
  let bruto = 0, rps = 0, liquido = 0;
  let complete = group.contracts.length > 0;
  for (const contract of group.contracts) {
    const value = portabilityValues(contract.valor_troco, group.client.taxa_rps);
    if (!value) { complete = false; continue; }
    bruto += value.bruto; rps += value.rps; liquido += value.liquido;
  }
  return { bruto: money(bruto), rps: money(rps), liquido: money(liquido), complete };
}

export function buildPortabilityProposal(group: PortabilityGroup): string | null {
  const totals = portabilityTotals(group);
  if (!totals.complete) return null;
  return [
    "*PROPOSTA DE PORTABILIDADE COM REFINANCIAMENTO*", "",
    `Olá, *${group.client.nome.trim().split(/\s+/)[0]}*!`,
    "Segue sua proposta de portabilidade:", "",
    ...group.contracts.flatMap((contract, index) => {
      const value = portabilityValues(contract.valor_troco, group.client.taxa_rps);
      if (!value) return [];
      return [
        `*Contrato ${index + 1} — ${contract.banco || "Banco não informado"}*`,
        `Número: ${contract.numero_contrato || "Não informado"}`,
        ...(contract.valor_parcela === null ? [] : [`Parcela atual: ${formatBRL(contract.valor_parcela)}`]),
        `Troco bruto: ${formatBRL(value.bruto)}`,
        `RPS (${formatPct(group.client.taxa_rps)} sobre o troco): ${formatBRL(value.rps)}`,
        `Troco líquido: ${formatBRL(value.liquido)}`, "",
      ];
    }),
    `*TOTAL DO TROCO BRUTO: ${formatBRL(totals.bruto)}*`,
    `Total RPS: ${formatBRL(totals.rps)}`,
    `*TOTAL LÍQUIDO PARA VOCÊ: ${formatBRL(totals.liquido)}*`, "",
    "Valores sujeitos à confirmação do saldo devedor, margem e aprovação do banco.",
  ].join("\n");
}