import { describe, expect, test } from "bun:test";
import { normalizeReceivingBank } from "./receivingBank";

describe("Dados de recebimento do contracheque", () => {
  test("preserva banco, zeros iniciais e dígitos da agência e conta", () => {
    expect(normalizeReceivingBank({ banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" })).toEqual({ banco_recebimento: "Banco do Brasil", agencia_recebimento: "0012-3", conta_recebimento: "00045678-9" });
  });
  test("não preenche dados ausentes no documento", () => {
    expect(normalizeReceivingBank({})).toEqual({ banco_recebimento: null, agencia_recebimento: null, conta_recebimento: null });
  });
});