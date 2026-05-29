import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { STAGES, ORGAOS, formatBRL, formatPhoneForWhatsApp, onlyDigits, isValidCPF, formatCPF, stageLabel, stageColor, type Client, type PipelineStage } from "@/lib/pipeline";
import { Plus, Search, MessageCircle, Pencil, Trash2, Download, X, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
});

type SortKey = "nome" | "telefone" | "orgao" | "stage" | "taxa_rps" | "margem_disponivel" | "created_at";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50, 100];

function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // search & filters
  const [searchType, setSearchType] = useState<"nome" | "cpf" | "telefone" | "orgao">("nome");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  // sort & pagination
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setClients((data ?? []) as Client[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, searchType, stageFilter, pageSize]);

  const cpfDigits = searchType === "cpf" ? onlyDigits(search) : "";
  const cpfValid = searchType === "cpf" && cpfDigits.length === 11 && isValidCPF(cpfDigits);
  const cpfInvalid = searchType === "cpf" && cpfDigits.length === 11 && !cpfValid;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = onlyDigits(search);
    return clients.filter((c) => {
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (!q) return true;
      if (searchType === "cpf") {
        // Only filter by CPF when 11 digits AND check digits are valid
        if (!cpfValid) return true;
        if (!c.cpf) return false;
        return onlyDigits(c.cpf).includes(qDigits);
      }
      if (searchType === "telefone") {
        if (!c.telefone) return false;
        return onlyDigits(c.telefone).includes(qDigits);
      }
      if (searchType === "orgao") {
        if (!c.orgao) return false;
        return c.orgao.toLowerCase() === q;
      }
      return c.nome.toLowerCase().includes(q);
    });
  }, [clients, search, searchType, stageFilter, cpfValid]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[sortKey as keyof Client];
      const bv = b[sortKey as keyof Client];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "pt-BR", { numeric: true }) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sorted, currentPage, pageSize]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente removido");
    load();
  };

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Idade", "Telefone", "Órgão", "Endereço", "Estágio", "Taxa RPS", "Próximo contato", "Observações"];
    const rows = sorted.map((c) => [
      c.nome, c.cpf ?? "", c.idade ?? "", c.telefone ?? "", c.orgao ?? "", c.endereco ?? "",
      stageLabel(c.stage), c.taxa_rps ?? 0, c.proximo_contato ?? "", (c.observacoes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const openWhatsApp = (c: Client) => {
    const phone = formatPhoneForWhatsApp(c.telefone);
    if (!phone) return toast.error("Telefone inválido — verifique DDD e número");
    const firstName = (c.nome ?? "").trim().split(/\s+/)[0] || "";
    const msg = encodeURIComponent(`Olá ${firstName}, tudo bem?`.trim());
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank", "noopener,noreferrer");
  };


  const clearFilters = () => {
    setSearch("");
    setStageFilter("all");
    setSearchType("nome");
  };

  const hasFilters = search.trim() !== "" || stageFilter !== "all";
  const startIdx = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, sorted.length);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {sorted.length} de {clients.length} clientes
            {hasFilters && " (filtrado)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }} style={{ background: "var(--gradient-primary)" }}>
            <Plus className="h-4 w-4 mr-2" />Novo
          </Button>
        </div>
      </div>

      <Card className="p-4" style={{ background: "var(--gradient-card)" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select value={searchType} onValueChange={(v) => setSearchType(v as "nome" | "cpf" | "telefone" | "orgao")}>
            <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Por nome</SelectItem>
              <SelectItem value="cpf">Por CPF</SelectItem>
              <SelectItem value="telefone">Por telefone</SelectItem>
              <SelectItem value="orgao">Por órgão</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            {searchType === "orgao" ? (
              <Select value={search || "all"} onValueChange={(v) => setSearch(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione um órgão..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os órgãos</SelectItem>
                  {ORGAOS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 pr-9"
                  placeholder={
                    searchType === "cpf"
                      ? "Digite o CPF (000.000.000-00)"
                      : searchType === "telefone"
                      ? "Buscar por telefone..."
                      : "Buscar por nome..."
                  }
                  inputMode={searchType === "cpf" || searchType === "telefone" ? "numeric" : "text"}
                  value={searchType === "cpf" ? formatCPF(search) : search}
                  onChange={(e) => setSearch(
                    searchType === "cpf"
                      ? onlyDigits(e.target.value).slice(0, 11)
                      : searchType === "telefone"
                      ? onlyDigits(e.target.value)
                      : e.target.value
                  )}
                  aria-invalid={cpfInvalid || undefined}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {searchType === "cpf" && search && (
                  <p className={`mt-1 text-xs ${cpfInvalid ? "text-destructive" : cpfValid ? "text-success" : "text-muted-foreground"}`}>
                    {cpfInvalid
                      ? "CPF inválido — verifique os dígitos."
                      : cpfValid
                      ? "CPF válido"
                      : `Digite ${11 - cpfDigits.length} dígito(s) restante(s)`}
                  </p>
                )}
              </>
            )}
          </div>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Estágio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="md:w-auto">
              <X className="h-4 w-4 mr-2" />Limpar
            </Button>
          )}
        </div>

        {hasFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search.trim() && (
              <Badge variant="secondary" className="gap-1">
                {searchType === "cpf" ? "CPF" : searchType === "telefone" ? "Telefone" : searchType === "orgao" ? "Órgão" : "Nome"}: {search}
                <button onClick={() => setSearch("")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {stageFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Estágio: {stageLabel(stageFilter as PipelineStage)}
                <button onClick={() => setStageFilter("all")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden" style={{ background: "var(--gradient-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("nome")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Nome {sortIcon("nome")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("telefone")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Telefone {sortIcon("telefone")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("orgao")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Órgão {sortIcon("orgao")}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort("stage")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Estágio {sortIcon("stage")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => toggleSort("taxa_rps")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Taxa RPS {sortIcon("taxa_rps")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => toggleSort("margem_disponivel")} className="inline-flex items-center gap-1 hover:text-foreground">
                    Margem {sortIcon("margem_disponivel")}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="border-t border-border/50 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => { setEditing(c); setOpenForm(true); }}
                      className="font-medium text-left cursor-pointer hover:underline hover:text-primary"
                      title="Editar cliente"
                    >
                      {c.nome}
                    </button>
                    {c.cpf && <div className="text-xs text-muted-foreground">{c.cpf}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.telefone ? (
                      <button
                        onClick={() => openWhatsApp(c)}
                        className="text-primary hover:underline"
                        title="Abrir conversa no WhatsApp"
                      >
                        {c.telefone}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.orgao ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" style={{ borderColor: stageColor(c.stage as PipelineStage), color: stageColor(c.stage as PipelineStage) }}>
                      {stageLabel(c.stage as PipelineStage)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(c.taxa_rps ?? 0))}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(c.margem_disponivel ?? 0))}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openWhatsApp(c)} title="WhatsApp">
                        <MessageCircle className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpenForm(true); }} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. {c.nome} será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(c.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Mostrando {startIdx}-{endIdx} de {sorted.length}</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>por página</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <ClientFormDialog open={openForm} onOpenChange={setOpenForm} client={editing} onSaved={load} />
    </div>
  );
}
