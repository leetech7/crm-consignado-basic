import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { stagePriority } from "./pipeline";
describe("stagePriority", () => {
  test("ordena digitado, em negociação, quentes, depois o resto", () => {
    const order = (["novo", "quente", "em_negociacao", "digitado"] as const).slice().sort((a, b) => stagePriority(a) - stagePriority(b));
    deepStrictEqual(order, ["digitado", "em_negociacao", "quente", "novo"]);
  });
});
