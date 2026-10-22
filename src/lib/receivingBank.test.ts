import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { normalizeReceivingBank, checkReceivingBank } from "./receivingBank";

describe("Dados de recebimento do contracheque", () => {
  test("preserva banco, zeros iniciais e dígitos da agência e conta", () => {
    deepStrictEqual(normalizeReceivingBank({ banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" }), { banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" });
  });
  test("não preenche dados ausentes no documento", () => {
    deepStrictEqual(normalizeReceivingBank({}), { banco_recebimento: null, agencia_recebimento: null, conta_recebimento: null });
  });
});

describe("Alerta de conferência do banco de recebimento", () => {
  const cur = { banco_recebimento: "Banco do Brasil", agencia_recebimento: "1234-5", conta_recebimento: "98765-4" };

  test("documento sem dados de recebimento não gera alerta", () => {
    deepStrictEqual(checkReceivingBank(cur, { banco_recebimento: null, agencia_recebimento: null, conta_recebimento: null }), null);
  });

  test("banco igual em grafias diferentes confere", () => {
    deepStrictEqual(checkReceivingBank(cur, { banco_recebimento: "BANCO DO BRASIL S.A.", agencia_recebimento: "1234-5", conta_recebimento: "98765-4" }), "ok");
  });

  test("banco diferente alerta", () => {
    deepStrictEqual(checkReceivingBank(cur, { banco_recebimento: "Caixa Econômica Federal", agencia_recebimento: "1234-5", conta_recebimento: "98765-4" }), "diferente");
  });

  test("conta diferente alerta mesmo com banco igual", () => {
    deepStrictEqual(checkReceivingBank(cur, { banco_recebimento: "Banco do Brasil", agencia_recebimento: "1234-5", conta_recebimento: "11111-1" }), "diferente");
  });

  test("agência compara só dígitos (formatos diferentes conferem)", () => {
    deepStrictEqual(checkReceivingBank(cur, { banco_recebimento: "Banco do Brasil", agencia_recebimento: "12345", conta_recebimento: "987654" }), "ok");
  });

  test("cliente sem banco cadastrado pede conferência", () => {
    deepStrictEqual(checkReceivingBank({ banco_recebimento: null, agencia_recebimento: null, conta_recebimento: null }, { banco_recebimento: "Itaú", agencia_recebimento: "0001", conta_recebimento: "22233" }), "conferir");
  });
});
