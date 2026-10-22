import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { normalizeReceivingBank } from "./receivingBank";

describe("Dados de recebimento do contracheque", () => {
  test("preserva banco, zeros iniciais e dígitos da agência e conta", () => {
    deepStrictEqual(normalizeReceivingBank({ banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" }), { banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" });
  });
  test("não preenche dados ausentes no documento", () => {
    deepStrictEqual(normalizeReceivingBank({}), { banco_recebimento: null, agencia_recebimento: null, conta_recebimento: null });
  });
});