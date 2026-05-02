import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/pipeline";
import { useAuth } from "@/lib/auth";
import { Wallet, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/app/comissoes")({
  component: ComissoesPage,
});

interface Row {
  id: string;
  client_id: string;
  vendedor_id: string;
  taxa_rps: number;
  percentual: number;
  valor: number;
  paga: boolean;
  created_at: string;
  clients?: { nome: string } | null;
  profiles?: { full_name: string; email: string } | null;
}

function ComissoesPage() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("commissions")
      .select("*, clients(nome), profiles:vendedor_id(full_name, email)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as any);
  };

  useEffect(() => { load(); }, []);

  const togglePaga = async (r: Row) => {
    const { error } = await supabase.from("commissions").update({ paga: !r.paga }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(!r.paga ? "Marcada como paga" : "Marcada como pendente");
    load();
  };

  const total = rows.reduce((s, r) => s + Number(r.valor), 0);
  const totalPaga = rows.filter((r) => r.paga).reduce((s, r) => s + Number(r.valor), 0);
  const totalPendente = total - totalPaga;

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Comissões</h1>
        <p className="text-sm text-muted-foreground">Geradas automaticamente quando uma venda vai para PAGO</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Total gerado", value: total, color: "var(--info)" },
          { label: "Já pagas", value: totalPaga, color: "var(--success)" },
          { label: "Pendentes", value: totalPendente, color: "var(--warning)" },
        ].map((k) => (
          <Card key={k.label} className="p-5" style={{ background: "var(--gradient-card)" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <Wallet className="h-4 w-4" style={{ color: k.color }} />
            </div>
            <p className="mt-2 text-2xl font-bold">{formatBRL(k.value)}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden" style={{ background: "var(--gradient-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                {isManager && <th className="px-4 py-3 text-left">Vendedor</th>}
                <th className="px-4 py-3 text-right">Taxa RPS</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-center">Status</th>
                {isManager && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhuma comissão ainda</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}</td>
                  <td className="px-4 py-3 font-medium">{r.clients?.nome ?? "—"}</td>
                  {isManager && <td className="px-4 py-3 text-muted-foreground">{r.profiles?.full_name || r.profiles?.email || "—"}</td>}
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(r.taxa_rps))}</td>
                  <td className="px-4 py-3 text-right">{Number(r.percentual).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-primary">{formatBRL(Number(r.valor))}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={r.paga ? "default" : "outline"} className={r.paga ? "" : "text-warning border-warning"}>
                      {r.paga ? "Paga" : "Pendente"}
                    </Badge>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => togglePaga(r)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
