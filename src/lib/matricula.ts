/** Identificador textual: não converte números nem remove zeros ou dígitos. */
export function normalizeMatricula(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}