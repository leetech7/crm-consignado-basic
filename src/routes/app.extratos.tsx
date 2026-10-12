import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileScan, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/app/extratos")({
  component: ExtratosPage,
  head: () => ({
    meta: [
      { title: "Extratos importados — CRM-OSC - CONSIG" },
      { name: "description", content: "Acompanhe os extratos lidos pela IA e o status de cada leitura." },
      { property: "og:title", content: "Extratos importados — CRM-OSC - CONSIG" },
      { property: "og:description", content: "Acompanhe os extratos lidos pela IA e o status de cada leitura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Status = "processando" | "lido" | "aplicado" | "descartado" | "erro";

type Analise = {
  id: string;
  client_id: string;
  file_name: string;
  status: Status;
  campos_aplicados: number;
  contratos_aplicados: number;
  erro: string | null;
  created_at: string;
  applied_at: string | null;
  clients: { nome: string } | null;
};

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  processando: { label: "Processando", cls: "bg-info/15 text-info" },
  lido: { label: "Aguardando revisão", cls: "bg-warning/15 text-warning" },
  aplicado: { label: "Aplicado", cls: "bg-success/15 text-success" },
  descartado: { label: "Descartado", cls: "bg-muted text-muted-foreground" },
  erro: { label: "Erro", cls: "bg-destructive/15 text-destructive" },
};

const PAGE_SIZES = [10, 25, 50];

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function ExtratosPage() {
  const [items, setItems] = useState<Analise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_ai_analyses")
      .select("id, client_id, file_name, status, campos_aplicados, contratos_aplicados, erro, created_at, applied_at, clients(nome)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as unknown as Analise[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [filterStatus, pageSize]);

  const filtered = useMemo(
    () => (filterStatus === "all" ? items : items.filter((a) => a.status === filterStatus)),
    [items, filterStatus],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(filtered.length, currentPage * pageSize);
  const paginated = filtered.slice(startIdx - 1, endIdx);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach((a) => { c[a.status] = (c[a.status] ?? 0) + 1; });
    return c;
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileScan className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold sm:text-xl">Extratos importados</h1>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({counts.all ?? 0})</SelectItem>
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label} ({counts[s] ?? 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/50">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : paginated.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Nenhuma leitura encontrada. Use o botão "Ler extrato com IA" nos anexos de um cliente.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {paginated.map((a) => {
              const meta = STATUS_META[a.status] ?? STATUS_META.lido;
              return (
                <li key={a.id} className="flex flex-col gap-1.5 p-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.file_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.clients?.nome ?? "Cliente removido"} · {fmtDateTime(a.created_at)}
                    </p>
                    {a.status === "erro" && a.erro && (
                      <p className="mt-0.5 truncate text-xs text-destructive">{a.erro}</p>
                    )}
                    {a.status === "aplicado" && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.campos_aplicados} campo(s) e {a.contratos_aplicados} contrato(s) aplicados
                        {a.applied_at ? ` em ${fmtDateTime(a.applied_at)}` : ""}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/50 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{startIdx}-{endIdx} de {filtered.length}</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-16"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground">Página {currentPage}/{totalPages}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
