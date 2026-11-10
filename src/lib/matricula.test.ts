import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeMatricula } from "./matricula";

describe("matrícula extraída", () => {
  it("preserva zeros à esquerda e dígitos verificadores", () => {
    assert.equal(normalizeMatricula(" 0012345-6 "), "0012345-6");
  });
  it("não inventa matrícula quando ausente ou não textual", () => {
    assert.equal(normalizeMatricula(null), null);
    assert.equal(normalizeMatricula(" "), null);
    assert.equal(normalizeMatricula(12345), null);
  });
});