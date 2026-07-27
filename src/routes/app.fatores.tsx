import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAgeFactors, parseAgeFactorsCSV, type ParsedRow } from "@/lib/ageFactors";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Download, FileText, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/fatores")({
  component: FatoresPage,
});

function FatoresPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { data, loading, reload } = useAgeFactors();
  const [replaceAll, setReplaceAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingIdade, setEditingIdade] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newIdade, setNewIdade] = useState("");
  const [newFator, setNewFator] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (authLoading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/app/dashboard" />;

  const handleImport = async (file: File) => {
    const text = await file.text();
    const { rows, skipped } = parseAgeFactorsCSV(text);
    if (!rows.length) {
      toast.error("Nenhuma linha válida encontrada no CSV");
      return;
    }
    setBusy(true);
    try {
      if (replaceAll) {
        const { error: delErr } = await (supabase as any)
          .from("age_factors").delete().gte("idade", 0);
        if (delErr) throw delErr;
      }
      const payload = rows.map((r: ParsedRow) => ({ idade: r.idade, fator: r.fator }));
      const { error } = await (supabase as any)
        .from("age_factors")
        .upsert(payload, { onConflict: "idade" });
      if (error) throw error;
      toast.success(
        `${rows.length} fator(es) importado(s)${skipped.length ? ` · ${skipped.length} ignorado(s)` : ""}`
      );
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Falha na importação");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCsv = () => {
    const header = "idade,fator\n";
    const body = data.map((r) => `${r.idade},${Number(r.fator).toFixed(5)}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fatores_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplate = () => {
    const sample = "idade,fator\n18,0.00234\n19,0.00238\n20,0.00242\n";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_fatores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveEdit = async (idade: number) => {
    const f = parseFloat(editValue.replace(",", "."));
    if (!Number.isFinite(f) || f <= 0) {
      toast.error("Fator inválido");
      return;
    }
    const { error } = await (supabase as any)
      .from("age_factors")
      .update({ fator: Number(f.toFixed(5)) })
      .eq("idade", idade);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    setEditingIdade(null);
    reload();
  };

  const addRow = async () => {
    const i = parseInt(newIdade, 10);
    const f = parseFloat(newFator.replace(",", "."));
    if (!Number.isFinite(i) || i < 0 || i >= 150) return toast.error("Idade inválida");
    if (!Number.isFinite(f) || f <= 0) return toast.error("Fator inválido");
    const { error } = await (supabase as any)
      .from("age_factors")
      .upsert({ idade: i, fator: Number(f.toFixed(5)) }, { onConflict: "idade" });
    if (error) return toast.error(error.message);
    toast.success("Fator salvo");
    setNewIdade("");
    setNewFator("");
    reload();
  };

  const removeRow = async (idade: number) => {
    if (!confirm(`Remover fator da idade ${idade}?`)) return;
    const { error } = await (supabase as any)
      .from("age_factors").delete().eq("idade", idade);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    reload();
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tabela de Fatores</h1>
        <p className="text-sm text-muted-foreground">
          Fatores por idade usados para calcular o valor bruto no cadastro do cliente.
        </p>
      </div>

      <Card className="p-4 md:p-6" style={{ background: "var(--gradient-card)" }}>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy} className="gap-2">
            <Upload className="h-4 w-4" /> Importar CSV
          </Button>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <FileText className="h-4 w-4" /> Modelo CSV
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!data.length} className="gap-2">
            <Download className="h-4 w-4" /> Exportar atual
          </Button>
          <label className="ml-auto flex items-center gap-2 text-sm">
            <Checkbox
              checked={replaceAll}
              onCheckedChange={(v) => setReplaceAll(v === true)}
            />
            Substituir toda a tabela ao importar
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Formato: <code>idade,fator</code> (uma linha por idade). Cabeçalho opcional.
          Decimais com "," ou "." são aceitos.
        </p>
      </Card>

      <Card className="p-4 md:p-6" style={{ background: "var(--gradient-card)" }}>
        <h2 className="mb-3 text-sm font-semibold">Adicionar / atualizar manualmente</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Idade</Label>
            <Input
              type="number" min="0" max="149" className="w-28"
              value={newIdade} onChange={(e) => setNewIdade(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fator</Label>
            <Input
              type="number" step="0.00001" min="0.00001" className="w-40"
              value={newFator} onChange={(e) => setNewFator(e.target.value)}
              placeholder="0,00000"
            />
          </div>
          <Button onClick={addRow}>Salvar</Button>
        </div>
      </Card>

      <Card className="overflow-hidden" style={{ background: "var(--gradient-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Idade</th>
                <th className="px-4 py-3 text-left">Fator</th>
                <th className="px-4 py-3 text-left">Atualizado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Carregando...</td></tr>
              )}
              {!loading && !data.length && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum fator cadastrado. Importe um CSV para começar.
                </td></tr>
              )}
              {data.map((r) => (
                <tr key={r.idade} className="border-t border-border/50">
                  <td className="px-4 py-2 font-medium">{r.idade}</td>
                  <td className="px-4 py-2 font-mono">
                    {editingIdade === r.idade ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number" step="0.00001" className="w-32"
                          value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => saveEdit(r.idade)}>Salvar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingIdade(null)}>Cancelar</Button>
                      </div>
                    ) : (
                      <button
                        className="cursor-pointer hover:underline"
                        onClick={() => { setEditingIdade(r.idade); setEditValue(Number(r.fator).toFixed(5)); }}
                      >
                        {Number(r.fator).toFixed(5)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(r.updated_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => removeRow(r.idade)} title="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
