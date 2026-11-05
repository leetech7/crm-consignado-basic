import { describe, it, expect } from "vitest";
import { stagePriority } from "./pipeline";
describe("stagePriority", () => {
  it("ordena digitado, em negociação, quentes, depois o resto", () => {
    const order = (["novo", "quente", "em_negociacao", "digitado"] as const).slice().sort((a, b) => stagePriority(a) - stagePriority(b));
    expect(order).toEqual(["digitado", "em_negociacao", "quente", "novo"]);
  });
});
