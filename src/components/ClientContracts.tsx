import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/pipeline";
import { toast } from "sonner";

interface Contract {
  id: string;
  banco: string | null;
  numero_contrato: string | null;
  valor_parcela: number | null;
  prazo_total: number | null;
  parcelas_pagas: number | null;
  parcelas_restantes: number | null;
  saldo_devedor: number | null;
  data_inicio: string | null;
  origem: string;
}

type Field = keyof Omit<Contract, "id" | "origem">;
const COLS: { k: Field; label: string; type: string }[] = [
  { k: "banco", label: "Banco", type: "text" },
  { k: "numero_contrato", label: "Contrato", type: "text" },
  { k: "valor_parcela", label: "Parcela", type: "number" },
  { k: "prazo_total", label: "Prazo", type: "number" },
  { k: "parcelas_pagas", label: "Pagas", type: "number" },
  { k: "parcelas_restantes", label: "Restam", type: "number" },
  { k: "saldo_devedor", label: "Saldo", type: "number" },
];

export function ClientContracts({ clientId, reloadKey }: { clientId: string; reloadKey: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Contract[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("client_contracts").select("*").eq("client_id", clientId).order("created_at");
    if (error) toast.error(error.message);
    setItems((data ?? []) as Contract[]);
  };
  useEffect(() => { load(); }, [clientId, reloadKey]);

  const add = async () => {
    if (!user) return;
    const { error } = await supabase.from("client_contracts").insert({ client_id: clientId, created_by: user.id, origem: "manual" });
    if (error) return toast.error(error.message);
    load();
  };

  const save = async (id: string, k: Field, raw: string) => {
    const col = COLS.find((c) => c.k === k)!;
    const v = raw === "" ? null : col.type === "number" ? Number(raw) : raw;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
    const { error } = await supabase.from("client_contracts").update({ [k]: v } as never).eq("id", id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este contrato?")) return;
    const { error } = await supabase.from("client_contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const totalParcelas = items.reduce((s, c) => s + (Number(c.valor_parcela) || 0), 0);
  const totalSaldo = items.reduce((s, c) => s + (Number(c.saldo_devedor) || 0), 0);

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado.</p>}
      {items.map((c) => (
        <div key={c.id} className="grid grid-cols-2 items-end gap-2 rounded-md border border-border/40 p-2 sm:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1fr_.6fr_.6fr_.6fr_1fr_auto]">
          {COLS.map((col) => (
            <div key={col.k} className="min-w-0 space-y-0.5">
              <span className="text-[10px] uppercase text-muted-foreground">{col.label}</span>
              <Input
                className="h-8 text-sm"
                type={col.type}
                step={col.type === "number" ? "0.01" : undefined}
                defaultValue={c[col.k] ?? ""}
                onBlur={(e) => { if (e.target.value !== String(c[col.k] ?? "")) save(c.id, col.k, e.target.value); }}
              />
            </div>
          ))}
          <div className="flex items-center gap-1">
            {c.origem === "ia" && <Sparkles className="h-3.5 w-3.5 text-primary" aria-label="Importado pela IA" />}
            <Button type="button" size="icon" variant="ghost" onClick={() => remove(c.id)} title="Remover"><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar contrato</Button>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">Parcelas: <b>{formatBRL(totalParcelas)}</b> · Saldo devedor: <b>{formatBRL(totalSaldo)}</b></span>
        )}
      </div>
    </div>
  );
}
