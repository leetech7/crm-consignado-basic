import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatBRL, formatCPF, isValidCPF } from "@/lib/pipeline";
import { checkReceivingBank } from "@/lib/receivingBank";
import type { ExtractedData, ExtractedContract } from "@/lib/extract.functions";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Landmark } from "lucide-react";

export type AppliedFields = Partial<Record<"nome" | "cpf" | "data_nascimento" | "orgao" | "margem_disponivel" | "margem_rcc" | "margem_rmc" | "banco_recebimento" | "agencia_recebimento" | "conta_recebimento", string>>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId: string;
  pending?: boolean;
  analysisId?: string;
  fileName: string;
  data: ExtractedData | null;
  current: AppliedFields;
  onApply: (fields: AppliedFields) => void;
  onContractsSaved?: () => void;
  onPendingContracts?: (contracts: ExtractedContract[]) => void;
}

const FIELDS: { k: keyof AppliedFields; label: string; money?: boolean }[] = [
  { k: "nome", label: "Nome completo" },
  { k: "cpf", label: "CPF" },
  { k: "data_nascimento", label: "Data de nascimento" },
  { k: "orgao", label: "Órgão" },
  { k: "banco_recebimento", label: "Banco de recebimento" },
  { k: "agencia_recebimento", label: "Agência" },
  { k: "conta_recebimento", label: "Conta de recebimento" },
  { k: "margem_disponivel", label: "Margem disponível", money: true },
  { k: "margem_rcc", label: "Margem RCC", money: true },
  { k: "margem_rmc", label: "Margem RMC", money: true },
];

const fmtDate = (s?: string | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10).split("-").reverse().join("/") : s || "—");

export function ExtractReviewDialog({ open, onOpenChange, clientId, pending = false, analysisId, fileName, data, current, onApply, onContractsSaved, onPendingContracts }: Props) {
  const { user } = useAuth();
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [selC, setSelC] = useState<boolean[]>([]);
  const [busy, setBusy] = useState(false);

  const suggested = (k: keyof AppliedFields): string | null => {
    if (!data) return null;
    const v = data[k];
    if (v == null || v === "") return null;
    if (k === "cpf") return formatCPF(String(v));
    return String(v);
  };

  useEffect(() => {
    if (!data) return;
    const s: Record<string, boolean> = {};
    FIELDS.forEach((f) => {
      const v = suggested(f.k);
      s[f.k] = v != null && v.toLowerCase() !== (current[f.k] ?? "").toLowerCase() && !(f.k === "cpf" && !isValidCPF(v));
    });
    setSel(s);
    setSelC(data.contratos.map(() => true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const show = (k: keyof AppliedFields, v: string | null | undefined, money?: boolean) => {
    if (v == null || v === "") return "—";
    if (money) return formatBRL(Number(v));
    if (k === "data_nascimento") return fmtDate(v);
    return v;
  };

  // Conferência do banco que recebe o salário contra o que consta no documento.
  const bankCheck = data
    ? checkReceivingBank(
        { banco_recebimento: current.banco_recebimento ?? null, agencia_recebimento: current.agencia_recebimento ?? null, conta_recebimento: current.conta_recebimento ?? null },
        { banco_recebimento: data.banco_recebimento, agencia_recebimento: data.agencia_recebimento, conta_recebimento: data.conta_recebimento },
      )
    : null;

  const apply = async () => {
    if (!data || !user) return;
    setBusy(true);
    const fields: AppliedFields = {};
    FIELDS.forEach((f) => { const v = suggested(f.k); if (sel[f.k] && v != null) fields[f.k] = v; });
    const contracts = data.contratos.filter((_, i) => selC[i]);

    // Cliente novo ainda não salvo: devolve os contratos ao formulário; nada é gravado.
    if (pending) {
      if (contracts.length) onPendingContracts?.(contracts);
      onApply(fields);
      setBusy(false);
      onOpenChange(false);
      toast.success(
        Object.keys(fields).length > 0
          ? "Dados aplicados ao formulário. Revise e clique em Salvar."
          : contracts.length
            ? "Contratos marcados — serão salvos junto com o cliente."
            : "Nada foi selecionado.",
      );
      return;
    }

    if (contracts.length) {
      const { error } = await supabase.from("client_contracts").insert(
        contracts.map((c) => ({ ...c, client_id: clientId, created_by: user.id, origem: "ia" })),
      );
      if (error) { setBusy(false); return toast.error(error.message); }
      onContractsSaved?.();
    }
    await supabase.from("activities").insert({
      client_id: clientId, user_id: user.id, tipo: "ia",
      descricao: `Dados importados do extrato "${fileName}" (${Object.keys(fields).length} campos, ${contracts.length} contratos)`,
    });
    if (analysisId) {
      await supabase.from("client_ai_analyses").update({
        status: "aplicado",
        campos_aplicados: Object.keys(fields).length,
        contratos_aplicados: contracts.length,
        applied_at: new Date().toISOString(),
      }).eq("id", analysisId);
    }
    onApply(fields);
    setBusy(false);
    onOpenChange(false);
    toast.success("Dados aplicados. Revise e clique em Salvar.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados encontrados no extrato</DialogTitle>
          <DialogDescription>{fileName} — marque o que deseja aplicar ao cliente.</DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-4">
            {data.observacao && <p className="rounded-md border border-warning/50 bg-warning/10 p-2 text-sm">{data.observacao}</p>}
            {bankCheck && (
              <div
                className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                  bankCheck === "diferente"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : bankCheck === "ok"
                      ? "border-success/50 bg-success/10"
                      : "border-warning/50 bg-warning/10 text-warning-foreground"
                }`}
              >
                {bankCheck === "diferente" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                ) : bankCheck === "ok" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div>
                  {bankCheck === "diferente" ? (
                    <>
                      <span className="font-semibold">Conferir: o banco que recebe o salário é diferente do cadastrado.</span>
                      <div>Documento: {data.banco_recebimento ?? "—"} — Ag. {data.agencia_recebimento ?? "—"} — Conta {data.conta_recebimento ?? "—"}</div>
                      <div>Cadastrado: {current.banco_recebimento || "—"} — Ag. {current.agencia_recebimento || "—"} — Conta {current.conta_recebimento || "—"}</div>
                    </>
                  ) : bankCheck === "ok" ? (
                    <>
                      <span className="font-semibold">Banco de recebimento confere com o cadastrado.</span>
                      <div>{data.banco_recebimento ?? "—"} — Ag. {data.agencia_recebimento ?? "—"} — Conta {data.conta_recebimento ?? "—"}</div>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Conferir se o banco que recebe o salário é o mesmo que consta no contracheque.</span>
                      <div>Documento: {data.banco_recebimento ?? "—"} — Ag. {data.agencia_recebimento ?? "—"} — Conta {data.conta_recebimento ?? "—"}</div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-md border border-border/50">
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-3 border-b border-border/50 p-2 text-xs font-medium text-muted-foreground">
                <span /> <span>Campo</span><span>Atual</span><span>Encontrado</span>
              </div>
              {FIELDS.map((f) => {
                const v = suggested(f.k);
                const bad = f.k === "cpf" && v != null && !isValidCPF(v);
                return (
                  <label key={f.k} className="grid grid-cols-[auto_1fr_1fr_1fr] items-center gap-x-3 border-b border-border/30 p-2 text-sm last:border-0">
                    <Checkbox disabled={v == null} checked={!!sel[f.k]} onCheckedChange={(c) => setSel((s) => ({ ...s, [f.k]: !!c }))} />
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="truncate">{show(f.k, current[f.k], f.money)}</span>
                    <span className={`truncate font-medium ${bad ? "text-destructive" : ""}`}>{show(f.k, v, f.money)}{bad && " (inválido)"}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Contratos consignados vigentes ({data.contratos.length})</div>
              {data.contratos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contrato vigente encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {data.contratos.map((c, i) => (
                    <label key={i} className="flex items-start gap-3 rounded-md border border-border/50 p-2 text-sm">
                      <Checkbox checked={!!selC[i]} onCheckedChange={(v) => setSelC((s) => s.map((x, j) => (j === i ? !!v : x)))} />
                      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-0.5 sm:grid-cols-4">
                        <span className="col-span-2 font-medium">{c.banco ?? "Banco?"} {c.numero_contrato && <span className="text-muted-foreground">nº {c.numero_contrato}</span>}</span>
                        <span>Parcela: {formatBRL(c.valor_parcela)}</span>
                        <span>Início: {fmtDate(c.data_inicio)}</span>
                        <span>Prazo: {c.prazo_total ?? "—"}</span>
                        <span>Pagas: {c.parcelas_pagas ?? "—"}</span>
                        <span>Restantes: {c.parcelas_restantes ?? "—"}</span>
                        <span>Saldo: {formatBRL(c.saldo_devedor)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {analysisId && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await supabase.from("client_ai_analyses").update({ status: "descartado" }).eq("id", analysisId);
                setBusy(false);
                onOpenChange(false);
                toast.info("Leitura descartada. Nada foi alterado.");
              }}
            >
              Descartar
            </Button>
          )}
          <Button onClick={apply} disabled={busy}>{busy ? "Aplicando..." : "Aplicar selecionados"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
