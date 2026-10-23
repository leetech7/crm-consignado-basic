import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRightLeft, Copy, FileText, MessageCircle, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatCPF, formatPhoneForWhatsApp } from "@/lib/pipeline";
import { buildPortabilityProposal, buildPortabilityReport, groupPortabilityContracts, portabilityTotals, portabilityValues, type PortabilityGroup } from "@/lib/portabilidade";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/portabilidade")({
  component: PortabilidadeScreen,
  head: () => ({ meta: [
    { title: "Portabilidade — CRM-OSC - CONSIG" },
    { name: "description", content: "Contratos para portabilidade, troco, RPS e propostas de refinanciamento por cliente." },
    { property: "og:title", content: "Portabilidade — CRM-OSC - CONSIG" },
    { property: "og:description", content: "Acompanhe contratos para portar e prepare propostas de portabilidade por cliente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function PortabilidadeScreen() {
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}><PortabilidadePage /></QueryClientProvider>;
}

function PortabilidadePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<PortabilityGroup | null>(null);
  const [documentMode, setDocumentMode] = useState<"proposal" | "report">("proposal");
  const query = useQuery({
    queryKey: ["portabilidade", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("client_contracts")
        .select("*, clients!inner(id, nome, cpf, telefone, orgao, taxa_rps)")
        .eq("portar", true).order("created_at", { ascending: false });
      if (error) throw error;
      return groupPortabilityContracts(data ?? []);
    },
  });
  const groups = useMemo(() => {
    const term = search.toLocaleLowerCase("pt-BR").trim();
    const digits = term.replace(/\D/g, "");
    return (query.data ?? []).filter(g => !term || g.client.nome.toLocaleLowerCase("pt-BR").includes(term)
      || (digits.length > 0 && (g.client.cpf ?? "").replace(/\D/g, "").includes(digits))
      || g.contracts.some(c => `${c.banco ?? ""} ${c.numero_contrato ?? ""}`.toLocaleLowerCase("pt-BR").includes(term)));
  }, [query.data, search]);
  const totalContracts = groups.reduce((sum, g) => sum + g.contracts.length, 0);

  async function saveValue(kind: "troco" | "rps", id: string, raw: string, previous: number | null) {
    if (raw === String(previous ?? "")) return;
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && (!Number.isFinite(value) || value < 0 || (kind === "rps" && value > 100))) {
      toast.error(kind === "rps" ? "Informe um RPS entre 0 e 100%." : "Informe um troco válido, maior ou igual a zero.");
      await query.refetch();
      return;
    }
    setSaving(true);
    try {
      let clientRpsTotal: number | null = null;
      if (kind === "rps") {
        const { data, error } = await supabase.from("clients").select("valor_bruto").eq("id", id).single();
        if (error) throw error;
        clientRpsTotal = data.valor_bruto !== null && value !== null ? Number((data.valor_bruto * value / 100).toFixed(2)) : null;
      }
      const result = kind === "troco"
        ? await supabase.from("client_contracts").update({ valor_troco: value }).eq("id", id).select("id").single()
        : await supabase.from("clients").update({ taxa_rps: value, valor_rps_total: clientRpsTotal }).eq("id", id).select("id").single();
      if (result.error) throw result.error;
      await query.refetch();
      toast.success("Valor salvo");
    } catch { toast.error("Não foi possível salvar o valor. Atualize a tela e tente novamente."); }
    finally { setSaving(false); }
  }

  const isReport = documentMode === "report";
  const text = proposal ? (isReport ? buildPortabilityReport(proposal) : buildPortabilityProposal(proposal)) : null;
  const phone = formatPhoneForWhatsApp(proposal?.client.telefone ?? null);
  const copy = async () => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast.success(isReport ? "Relatório copiado" : "Proposta copiada"); }
    catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-xl font-bold"><ArrowRightLeft className="h-5 w-5 text-primary" />Portabilidade</h1>
          <p className="mt-1 text-sm text-muted-foreground">{totalContracts} contratos · {groups.length} clientes</p></div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching || saving}><RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
      </header>
      <div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar portabilidades" placeholder="Nome, CPF, banco ou contrato" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      {query.isPending && <p className="py-10 text-center text-muted-foreground">Carregando contratos...</p>}
      {query.isError && <div role="alert" className="border-y border-destructive/30 py-6 text-sm text-destructive">Não foi possível carregar os contratos. Tente atualizar a tela.</div>}
      {!query.isPending && !query.isError && groups.length === 0 && <p className="border-y border-border py-10 text-center text-sm text-muted-foreground">{search ? "Nenhum contrato encontrado." : "Nenhum contrato marcado para portar."}</p>}
      <div className="space-y-4">
        {groups.map(group => {
          const totals = portabilityTotals(group);
          return <article key={group.client.id} className="overflow-hidden rounded-lg border border-border bg-card" aria-label={`Portabilidade de ${group.client.nome}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0"><h2 className="break-words font-semibold">{group.client.nome}</h2><p className="text-xs text-muted-foreground">{group.client.cpf ? formatCPF(group.client.cpf) : "CPF não informado"}{group.client.orgao ? ` · ${group.client.orgao}` : ""}</p></div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1"><Label htmlFor={`rps-${group.client.id}`} className="text-xs">RPS do cliente (%)</Label><div className="relative w-28"><Input id={`rps-${group.client.id}`} key={`${group.client.id}-${group.client.taxa_rps}`} type="number" min="0" max="100" step="0.01" placeholder="—" defaultValue={group.client.taxa_rps ?? ""} className="h-8 pr-7 font-mono" disabled={saving} onBlur={e => saveValue("rps", group.client.id, e.target.value, group.client.taxa_rps)} /><span className="pointer-events-none absolute right-2 top-1.5 text-sm text-muted-foreground">%</span></div></div>
                <Button variant="outline" size="sm" disabled={!buildPortabilityReport(group) || saving || query.isFetching} onClick={() => { setDocumentMode("report"); setProposal(group); }}><FileText className="mr-2 h-4 w-4" />Relatório dos contratos</Button>
                <Button size="sm" disabled={!totals.complete || saving || query.isFetching} onClick={() => { setDocumentMode("proposal"); setProposal(group); }}><FileText className="mr-2 h-4 w-4" />Gerar proposta</Button>
              </div>
            </div>
            <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground lg:grid"><span>Banco / contrato</span><span>Parcela atual</span><span>Troco bruto (R$)</span><span>Valor RPS</span><span>Troco líquido</span></div>
            <ul className="divide-y divide-border">{group.contracts.map(contract => {
              const values = portabilityValues(contract.valor_troco, group.client.taxa_rps);
              return <li key={contract.id} className="grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
                <div className="col-span-2 min-w-0 sm:col-span-1"><p className="break-words text-sm font-medium">{contract.banco || "Banco não informado"}</p><p className="break-all text-xs text-muted-foreground">{contract.numero_contrato || "Contrato sem número"}</p></div>
                <div><span className="text-xs text-muted-foreground lg:hidden">Parcela atual</span><p className="text-sm font-mono">{contract.valor_parcela === null ? "—" : formatBRL(contract.valor_parcela)}</p></div>
                <div className="space-y-1"><Label htmlFor={`troco-${contract.id}`} className="text-xs text-muted-foreground lg:sr-only">Troco bruto (R$)</Label><Input id={`troco-${contract.id}`} key={`${contract.id}-${contract.valor_troco}`} aria-label={`Troco do contrato ${contract.numero_contrato || contract.id}`} className="h-8 w-full font-mono text-sm" type="number" min="0" step="0.01" placeholder="—" defaultValue={contract.valor_troco ?? ""} disabled={saving} onBlur={e => saveValue("troco", contract.id, e.target.value, contract.valor_troco)} /></div>
                <div><span className="text-xs text-muted-foreground lg:hidden">Valor RPS</span><p className="text-sm font-mono">{values ? formatBRL(values.rps) : "—"}</p></div>
                <div><span className="text-xs text-muted-foreground lg:hidden">Troco líquido</span><p className="text-sm font-mono font-semibold text-success">{values ? formatBRL(values.liquido) : "—"}</p></div>
              </li>;
            })}</ul>
            <footer className="flex flex-wrap justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 text-sm">
              <span className="text-xs text-muted-foreground">RPS sobre o troco bruto{!totals.complete ? " · Valores pendentes" : ""}</span>
              {totals.complete && <div className="flex flex-wrap gap-x-5 gap-y-1"><span>Troco: <b>{formatBRL(totals.bruto)}</b></span><span>RPS: <b>{formatBRL(totals.rps)}</b></span><span className="text-success">Líquido: <b>{formatBRL(totals.liquido)}</b></span></div>}
            </footer>
          </article>;
        })}
      </div>
      <Dialog open={Boolean(proposal)} onOpenChange={open => { if (!open) setProposal(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{isReport ? "Relatório dos contratos para portar" : "Proposta de portabilidade"}</DialogTitle><DialogDescription>{proposal?.client.nome}</DialogDescription></DialogHeader>
          <pre className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-4 font-mono text-sm leading-relaxed">{text}</pre>
          {!phone && <p className="text-xs text-warning">Telefone de contato ausente ou inválido.</p>}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={copy}><Copy className="mr-2 h-4 w-4" />{isReport ? "Copiar relatório" : "Copiar proposta"}</Button><Button disabled={!phone || !text} onClick={() => { if (phone && text) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }}><MessageCircle className="mr-2 h-4 w-4" />Enviar no WhatsApp</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}