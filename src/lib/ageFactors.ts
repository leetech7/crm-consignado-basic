import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgeFactor {
  idade: number;
  fator: number;
  updated_at: string;
}

export interface ParsedRow {
  idade: number;
  fator: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: { line: number; content: string; reason: string }[];
}

/**
 * Parse CSV com formato: idade,fator (ou idade;fator)
 * Aceita cabeçalho opcional. Decimais com "," ou ".".
 */
export function parseAgeFactorsCSV(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  const skipped: ParseResult["skipped"] = [];
  const seen = new Set<number>();
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const sep = line.includes(";") ? ";" : ",";
    const parts = line.split(sep).map((p) => p.trim());
    if (parts.length < 2) {
      skipped.push({ line: i + 1, content: line, reason: "colunas insuficientes" });
      return;
    }
    // Cabeçalho
    if (/[a-zA-Z]/.test(parts[0]) || /[a-zA-Z]/.test(parts[1])) {
      if (i === 0) return;
      skipped.push({ line: i + 1, content: line, reason: "valores não numéricos" });
      return;
    }
    const idade = parseInt(parts[0], 10);
    const fator = parseFloat(parts[1].replace(",", "."));
    if (!Number.isFinite(idade) || idade < 0 || idade >= 150) {
      skipped.push({ line: i + 1, content: line, reason: "idade inválida" });
      return;
    }
    if (!Number.isFinite(fator) || fator <= 0) {
      skipped.push({ line: i + 1, content: line, reason: "fator inválido" });
      return;
    }
    if (seen.has(idade)) {
      skipped.push({ line: i + 1, content: line, reason: "idade duplicada" });
      return;
    }
    seen.add(idade);
    rows.push({ idade, fator: Number(fator.toFixed(5)) });
  });

  return { rows, skipped };
}

export function useAgeFactors() {
  const [data, setData] = useState<AgeFactor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any)
      .from("age_factors")
      .select("*")
      .order("idade", { ascending: true });
    if (!error) setData((rows ?? []) as AgeFactor[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}

/** Retorna o fator para uma idade específica, ou null se não houver. */
export function factorForAge(list: AgeFactor[], idade: number | null | undefined): number | null {
  if (idade == null || !Number.isFinite(idade)) return null;
  const found = list.find((r) => r.idade === idade);
  return found ? Number(found.fator) : null;
}
