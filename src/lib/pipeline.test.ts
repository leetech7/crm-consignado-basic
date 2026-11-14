import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { stagePriority } from "./pipeline";
describe("stagePriority", () => {
  test("ordena digitado, em negociação, quentes, depois o resto", () => {
    const order = (["novo", "quente", "em_negociacao", "digitado"] as const).slice().sort((a, b) => stagePriority(a) - stagePriority(b));
    deepStrictEqual(order, ["digitado", "em_negociacao", "quente", "novo"]);
  });
});
import { findDuplicate } from "./pipeline";
describe("findDuplicate", () => {
  const list = [{ id: "1", nome: "Lúcia  Helena", cpf: "891.108.897-87" }];
  test("CPF igual com ou sem máscara é duplicado", () => {
    deepStrictEqual(findDuplicate("Outro", "89110889787", list)?.kind, "cpf");
  });
  test("nome igual ignorando acento, caixa e espaços", () => {
    deepStrictEqual(findDuplicate("lucia helena", "", list)?.kind, "nome");
  });
  test("o próprio cliente em edição não conta", () => {
    deepStrictEqual(findDuplicate("Lúcia Helena", "89110889787", list, "1"), null);
  });
});
