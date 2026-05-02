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
import { STAGES, formatBRL, formatPhoneForWhatsApp, stageLabel, stageColor, type Client, type PipelineStage } from "@/lib/pipeline";
import { Plus, Search, MessageCircle, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
});

function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      if (stageFilter !== "all" && c.stage !== stageFilter) return false;
      if (!q) return true;
      return [c.nome, c.cpf, c.telefone, c.orgao].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
  }, [clients, search, stageFilter]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliente removido");
    load();
  };

  const exportCSV = () => {
    const headers = ["Nome", "CPF", "Idade", "Telefone", "Órgão", "Endereço", "Estágio", "Taxa RPS", "Próximo contato", "Observações"];
    const rows = filtered.map((c) => [
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
    if (!phone) return toast.error("Telefone inválido");
    const msg = encodeURIComponent(`Olá ${c.nome.split(" ")[0]}, tudo bem?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Clientes</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {clients.length} clientes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button onClick={() => { setEditing(null); setOpenForm(true); }} style={{ background: "var(--gradient-primary)" }}>
            <Plus className="h-4 w-4 mr-2" />Novo
          </Button>
        </div>
      </div>

      <Card className="p-4" style={{ background: "var(--gradient-card)" }}>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, CPF, telefone, órgão..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os estágios</SelectItem>
              {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden" style={{ background: "var(--gradient-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Órgão</th>
                <th className="px-4 py-3 text-left">Estágio</th>
                <th className="px-4 py-3 text-right">Taxa RPS</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-t border-border/50 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.nome}</div>
                    {c.cpf && <div className="text-xs text-muted-foreground">{c.cpf}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telefone ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.orgao ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" style={{ borderColor: stageColor(c.stage as PipelineStage), color: stageColor(c.stage as PipelineStage) }}>
                      {stageLabel(c.stage as PipelineStage)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(c.taxa_rps ?? 0))}</td>
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
      </Card>

      <ClientFormDialog open={openForm} onOpenChange={setOpenForm} client={editing} onSaved={load} />
    </div>
  );
}
