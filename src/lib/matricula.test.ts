import { describe, expect, it } from "vitest";
import { normalizeMatricula } from "./matricula";

describe("matrícula extraída", () => {
  it("preserva zeros à esquerda e dígitos verificadores", () => {
    expect(normalizeMatricula(" 0012345-6 ")).toBe("0012345-6");
  });
  it("não inventa matrícula quando ausente ou não textual", () => {
    expect(normalizeMatricula(null)).toBeNull();
    expect(normalizeMatricula(" ")).toBeNull();
    expect(normalizeMatricula(12345)).toBeNull();
  });
});