import { useEffect, useState } from "react";
import { Copy, Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildPortabilityReport, portabilityReportData, portabilityValues, type PortabilityReportTerms, type PortabilityClient, type PortabilityGroup } from "@/lib/portabilidade";
import { formatBRL, formatPhoneForWhatsApp } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PortabilityReportContent({ group }: { group: PortabilityGroup }) {
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState<PortabilityReportTerms>({});
  const contracts = group.contracts.filter(c => c.portar);
  const report = portabilityReportData(group, terms);
  const text = buildPortabilityReport(group, terms);
  const phone = formatPhoneForWhatsApp(group.client.telefone);
  const download = async (format: "jpg" | "pdf") => {
    setBusy(true);
    try {
      const { downloadPortabilityReport } = await import("@/lib/portabilityExport");
      await downloadPortabilityReport(group, format, terms);
      toast.success(`Relatório ${format.toUpperCase()} baixado`);
    } catch { toast.error("Não foi possível gerar o arquivo."); }
    finally { setBusy(false); }
  };
  return <div className="space-y-4">
    {contracts.length === 0 ? <p className="py-6 text-center text-muted-foreground">Nenhum contrato marcado para portar.</p> : <>
      <ul className="divide-y divide-border border-y border-border" aria-label="Contratos para portar">{contracts.map(c => <li key={c.id} className="grid grid-cols-2 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_6rem] sm:gap-4">
        <div className="col-span-2 min-w-0 sm:col-span-1"><p className="break-words font-semibold">{c.banco || "Banco não informado"}</p><p className="break-all text-sm text-muted-foreground">Contrato: {c.numero_contrato || "Não informado"}</p></div>
        <div><p className="text-xs text-muted-foreground">Parcela atual</p><p className="font-mono text-sm">{c.valor_parcela === null ? "—" : formatBRL(c.valor_parcela)}</p></div>
        <div><p className="text-xs text-muted-foreground">Troco líquido</p><p className="font-mono text-sm font-semibold">{portabilityValues(c.valor_troco, group.client.taxa_rps) ? formatBRL(portabilityValues(c.valor_troco, group.client.taxa_rps)?.liquido ?? 0) : "Pendente"}</p></div>
        <div className="space-y-1"><Label htmlFor={`prazo-relatorio-${c.id}`} className="text-xs text-muted-foreground">Prazo (meses)</Label><Input id={`prazo-relatorio-${c.id}`} aria-label={`Prazo do contrato ${c.numero_contrato || c.id}`} className="h-8" type="number" min="1" step="1" placeholder="—" value={terms[c.id] ?? ""} onChange={e => { const raw = e.target.value; const value = Number(raw); if (!raw || (Number.isInteger(value) && value > 0)) setTerms(prev => ({ ...prev, [c.id]: raw ? value : null })); }} /></div>
      </li>)}</ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4"><span className="text-sm text-muted-foreground">{contracts.length} contratos para portar</span><span className="font-semibold text-success">Total dos trocos líquidos: {report ? formatBRL(report.totalTroco) : "Valores pendentes"}</span></div>
      {!report && <p className="text-sm text-warning">Preencha os trocos e o RPS do cliente para calcular os valores líquidos.</p>}
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant="outline" disabled={!report || busy} onClick={() => download("jpg")}><Download className="mr-2 h-4 w-4" />Baixar JPG</Button><Button type="button" variant="outline" disabled={!report || busy} onClick={() => download("pdf")}><Download className="mr-2 h-4 w-4" />Baixar PDF</Button></div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={!text} onClick={async () => { if (!text) return; try { await navigator.clipboard.writeText(text); toast.success("Relatório copiado"); } catch { toast.error("Não foi possível copiar."); } }}><Copy className="mr-2 h-4 w-4" />Copiar relatório</Button><Button type="button" disabled={!phone || !text} onClick={() => { if (phone && text) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer"); }}><MessageCircle className="mr-2 h-4 w-4" />Enviar no WhatsApp</Button></div>
      {!phone && <p className="text-xs text-warning">Telefone de contato ausente ou inválido.</p>}
    </>}
  </div>;
}

export function PortabilityReportDialog({ open, onOpenChange, client }: { open: boolean; onOpenChange: (open: boolean) => void; client: PortabilityClient }) {
  const [group, setGroup] = useState<PortabilityGroup | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setGroup(null); setError(false);
    supabase.from("client_contracts").select("*").eq("client_id", client.id).eq("portar", true).order("created_at").then(({ data, error }) => {
      if (!active) return;
      if (error) { setError(true); return; }
      setGroup({ client, contracts: (data ?? []).map(c => ({ ...c, clients: client })) });
    });
    return () => { active = false; };
  }, [open, client.id]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Relatório dos contratos para portar</DialogTitle><DialogDescription>{client.nome}</DialogDescription></DialogHeader>{error ? <p role="alert" className="text-destructive">Não foi possível carregar os contratos. Feche e tente novamente.</p> : group ? <PortabilityReportContent group={group} /> : <p className="py-6 text-muted-foreground">Carregando contratos...</p>}</DialogContent></Dialog>;
}