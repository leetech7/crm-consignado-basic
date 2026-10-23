import { describe, test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import { groupPortabilityContracts, portabilityValues, portabilityTotals, portabilityReportData, buildPortabilityProposal, type PortabilityContract } from "./portabilidade";

const client = { id: "cliente-a", nome: "Cliente A", cpf: null, telefone: null, orgao: "SIAPE", taxa_rps: 20 };
const contract: PortabilityContract = { id: "contrato-a", client_id: client.id, created_by: "vendedor", created_at: "2026-10-23", banco: "Banco A", numero_contrato: "123", valor_parcela: 200, prazo_total: 84, parcelas_pagas: 12, parcelas_restantes: 72, saldo_devedor: 10000, data_inicio: null, portar: true, valor_troco: 1000, origem: "manual", clients: client };

describe("Portabilidade", () => {
  test("relatório inclui cliente e soma apenas trocos dos contratos marcados, sem exigir RPS", () => {
    const report = portabilityReportData({ client: { ...client, taxa_rps: null }, contracts: [contract, { ...contract, id: "segundo", valor_troco: 500 }, { ...contract, id: "excluido", portar: false, valor_troco: 9000 }] });
    strictEqual(report?.clientName, "Cliente A");
    strictEqual(report?.totalTroco, 1500);
    deepStrictEqual(report?.contracts.map(c => c.id), ["contrato-a", "segundo"]);
  });
  test("relatório não apresenta total incompleto quando falta troco", () => {
    strictEqual(portabilityReportData({ client, contracts: [{ ...contract, valor_troco: null }] }), null);
  });
  test("lista somente os contratos marcados para portar", () => {
    const groups = groupPortabilityContracts([contract, { ...contract, id: "nao-portar", portar: false }]);
    deepStrictEqual(groups[0]?.contracts.map(c => c.id), ["contrato-a"]);
  });
  test("separa os contratos de cada cliente", () => {
    const groups = groupPortabilityContracts([contract, { ...contract, id: "contrato-b", client_id: "cliente-b", clients: { ...client, id: "cliente-b", nome: "Cliente B" } }]);
    deepStrictEqual(groups.map(g => [g.client.id, g.contracts.map(c => c.id)]), [["cliente-a", ["contrato-a"]], ["cliente-b", ["contrato-b"]]]);
  });
  test("aplica RPS percentual sobre o troco e calcula líquido", () => {
    deepStrictEqual(portabilityValues(1000, 20), { bruto: 1000, rps: 200, liquido: 800 });
  });
  test("soma o troco e RPS dos contratos do cliente", () => {
    deepStrictEqual(portabilityTotals({ client, contracts: [contract, { ...contract, id: "outro", valor_troco: 500 }] }), { bruto: 1500, rps: 300, liquido: 1200, complete: true });
  });
  test("não gera proposta com troco ou RPS ausente", () => {
    strictEqual(buildPortabilityProposal({ client, contracts: [{ ...contract, valor_troco: null }] }), null);
    strictEqual(buildPortabilityProposal({ client: { ...client, taxa_rps: null }, contracts: [contract] }), null);
  });
  test("aceita troco e taxa zero explicitamente informados", () => {
    deepStrictEqual(portabilityValues(0, 0), { bruto: 0, rps: 0, liquido: 0 });
  });
});