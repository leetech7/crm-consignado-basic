import { useEffect, useRef, useState } from "react";
import { Copy, Calculator, RefreshCcw, FileText, Image as ImageIcon } from "lucide-react";
import { ReportImageDialog } from "@/components/ReportImageDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STAGES, ORGAOS, ORIGENS, onlyDigits, formatCPF, isValidCPF, type Client, type PipelineStage } from "@/lib/pipeline";
import { useAgeFactors, factorForAge } from "@/lib/ageFactors";

// Formata o telefone progressivamente da esquerda para a direita.
// Aceita digitação livre, sem prefixar DDI automaticamente.
// Formatos suportados:
//   - 10 dígitos: (11) 9999-9999
//   - 11 dígitos: (11) 99999-9999
//   - 12 dígitos: +55 (11) 9999-9999
//   - 13 dígitos: +55 (11) 99999-9999
const formatPhoneInput = (raw: string): string => {
  const d = onlyDigits(raw).slice(0, 13);
  if (!d) return "";

  let ddi = "";
  let rest = d;
  if (d.length > 11) {
    ddi = d.slice(0, d.length - 11);
    rest = d.slice(d.length - 11);
  }

  const ddd = rest.slice(0, 2);
  const sub = rest.slice(2);

  let out = "";
  if (ddi) out += `+${ddi} `;
  if (ddd) {
    out += `(${ddd}`;
    if (ddd.length === 2) out += ")";
  }
  if (sub) {
    out += " ";
    if (sub.length <= 4) out += sub;
    else if (sub.length <= 8) out += `${sub.slice(0, 4)}-${sub.slice(4)}`;
    else out += `${sub.slice(0, 5)}-${sub.slice(5)}`;
  }
  return out;
};
import { ProposalDialog } from "@/components/ProposalDialog";
import { ClientAttachments } from "@/components/ClientAttachments";

import { toast } from "sonner";

const copyToClipboard = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  } catch {
    toast.error("Não foi possível copiar");
  }
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client?: Client | null;
  onSaved?: () => void;
}

const empty = {
  nome: "",
  cpf: "",
  idade: "",
  data_nascimento: "",
  telefone: "",
  orgao: "",
  origem: "",
  endereco: "",
  observacoes: "",
  proximo_contato_data: "",
  proximo_contato_hora: "",
  taxa_rps: "",
  valor_bruto: "",
  compra_divida: "",
  margem_disponivel: "",
  fator: "",
  stage: "novo" as PipelineStage,
};

const draftKey = (id?: string | null) => `crm:client-draft:${id ?? "new"}`;

const readDraft = (id?: string | null): typeof empty | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as typeof empty) : null;
  } catch {
    return null;
  }
};

const clearDraft = (id?: string | null) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(id));
  } catch {
    /* ignore */
  }
};

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [openProposal, setOpenProposal] = useState(false);
  const [openReport, setOpenReport] = useState(false);

  const [valorBrutoTouched, setValorBrutoTouched] = useState(false);
  const [fatorTouched, setFatorTouched] = useState(false);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const hydratedRef = useRef(false);
  const { data: ageFactors } = useAgeFactors();

  // Autosave: grava rascunho no navegador enquanto o formulário está aberto
  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey(client?.id), JSON.stringify(form));
        setSavedAt(new Date());
      } catch {
        /* ignore */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [form, open, client?.id]);

  // Auto-preenche fator a partir da idade (a menos que editado manualmente)
  useEffect(() => {
    if (fatorTouched) return;
    const idadeNum = parseInt(form.idade, 10);
    const f = factorForAge(ageFactors, Number.isFinite(idadeNum) ? idadeNum : null);
    if (f == null) return;
    const formatted = f.toFixed(5);
    setForm((prev) => (prev.fator === formatted ? prev : { ...prev, fator: formatted }));
  }, [form.idade, ageFactors, fatorTouched]);

  const factorNum = Number(form.fator);
  const factorInvalid = form.fator !== "" && Number.isNaN(factorNum);

  // Auto-calcula valor bruto = margem / fator (a menos que o usuário tenha editado manualmente)
  useEffect(() => {
    if (valorBrutoTouched) return;
    const m = parseFloat(form.margem_disponivel);
    const f = parseFloat(form.fator);
    if (Number.isNaN(f) || f <= 0) {
      // Evita divisão por zero/fator inválido e limpa valor bruto se estava calculado
      setForm((prev) => (prev.valor_bruto === "" ? prev : { ...prev, valor_bruto: "" }));
      return;
    }
    if (m > 0) {
      const calc = (m / f).toFixed(2);
      setForm((prev) => (prev.valor_bruto === calc ? prev : { ...prev, valor_bruto: calc }));
    }
  }, [form.margem_disponivel, form.fator, valorBrutoTouched]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    const draft = readDraft(client?.id);
    if (client) {
      const pc = client.proximo_contato ? new Date(client.proximo_contato) : null;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = pc ? `${pc.getFullYear()}-${pad(pc.getMonth() + 1)}-${pad(pc.getDate())}` : "";
      const timeStr = pc ? `${pad(pc.getHours())}:${pad(pc.getMinutes())}` : "";
      setForm(draft ?? {
        nome: client.nome ?? "",
        cpf: client.cpf ? formatCPF(client.cpf) : "",
        idade: client.idade?.toString() ?? "",
        data_nascimento: client.data_nascimento ?? "",
        telefone: client.telefone ?? "",
        orgao: client.orgao ?? "",
        origem: client.origem ?? "",
        endereco: client.endereco ?? "",
        observacoes: client.observacoes ?? "",
        proximo_contato_data: dateStr,
        proximo_contato_hora: timeStr === "00:00" ? "" : timeStr,
        taxa_rps: client.taxa_rps?.toString() ?? "",
        valor_bruto: client.valor_bruto?.toString() ?? "",
        compra_divida: client.compra_divida?.toString() ?? "",
        margem_disponivel: client.margem_disponivel?.toString() ?? "",
        fator: client.fator != null ? Number(client.fator).toFixed(5) : "",
        stage: client.stage,
      });
    } else setForm(draft ?? empty);
    setRestored(!!draft);
    setSavedAt(null);
    setValorBrutoTouched(!!(draft?.valor_bruto || client?.valor_bruto));
    // Considera o fator existente como manual se já veio salvo (não sobrescreve ao trocar idade)
    setFatorTouched(!!(draft?.fator || client?.fator));
    hydratedRef.current = true;
  }, [client, open]);


  const update = (k: keyof typeof form, v: string) => {
    if (k === "fator") setFatorTouched(true);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const calcAge = (dob: string): string => {
    if (!dob) return "";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 && age < 150 ? String(age) : "";
  };

  const formatFactorDisplay = (raw: string): string => {
    if (!raw) return "";
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return "";
    const d = Math.round(n * 100000).toString().padStart(6, "0");
    return `${parseInt(d.slice(0, -5), 10)},${d.slice(-5)}`;
  };

  const handleDobChange = (v: string) => {
    setForm((f) => ({ ...f, data_nascimento: v, idade: calcAge(v) || f.idade }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (form.cpf && !isValidCPF(form.cpf)) {
      toast.error("CPF inválido. Verifique os dígitos.");
      return;
    }
    if (form.fator !== "" && Number.isNaN(Number(form.fator))) {
      toast.error("Fator inválido. Informe um número válido ou deixe em branco.");
      return;
    }
    setBusy(true);
    const payload = {
      owner_id: client?.owner_id ?? user.id,
      nome: form.nome.trim(),
      cpf: form.cpf ? formatCPF(form.cpf) : null,
      idade: form.idade ? parseInt(form.idade) : null,
      data_nascimento: form.data_nascimento || null,
      telefone: form.telefone || null,
      orgao: form.orgao || null,
      origem: form.origem || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
      proximo_contato: form.proximo_contato_data
        ? new Date(`${form.proximo_contato_data}T${form.proximo_contato_hora || "09:00"}`).toISOString()
        : null,
      taxa_rps: form.taxa_rps ? parseFloat(form.taxa_rps) : 0,
      valor_bruto: form.valor_bruto ? parseFloat(form.valor_bruto) : 0,
      valor_rps_total: form.valor_bruto && form.taxa_rps
        ? Number((parseFloat(form.valor_bruto) * parseFloat(form.taxa_rps) / 100).toFixed(2))
        : 0,
      compra_divida: form.compra_divida ? parseFloat(form.compra_divida) : 0,
      margem_disponivel: form.margem_disponivel ? parseFloat(form.margem_disponivel) : 0,
      fator: form.fator ? Number(parseFloat(form.fator).toFixed(5)) : null,
      stage: form.stage,
    };

    try {
      const { error } = client
        ? await supabase.from("clients").update(payload).eq("id", client.id)
        : await supabase.from("clients").insert(payload);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(client ? "Cliente atualizado" : "Cliente cadastrado");
      hydratedRef.current = false;
      clearDraft(client?.id);
      setRestored(false);
      setSavedAt(null);
      setForm(empty);
      onOpenChange(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const discardDraft = () => {
    hydratedRef.current = false;
    clearDraft(client?.id);
    setRestored(false);
    setSavedAt(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl w-[96vw] sm:w-[95vw] p-4 sm:p-6 max-h-[92dvh] overflow-y-auto rounded-xl"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {restored
              ? "Rascunho recuperado — suas alterações não salvas foram restauradas."
              : savedAt
                ? `Rascunho salvo automaticamente às ${savedAt.toLocaleTimeString("pt-BR")}`
                : "As alterações são guardadas automaticamente neste navegador."}
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => update("nome", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <Input
                value={form.cpf}
                onChange={(e) => update("cpf", formatCPF(e.target.value))}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v && !isValidCPF(v)) toast.error("CPF inválido");
                }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                aria-invalid={!!form.cpf && !isValidCPF(form.cpf)}
                className={`flex-1 ${form.cpf && !isValidCPF(form.cpf) ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={!form.cpf}
                onClick={() => copyToClipboard(form.cpf)}
                title="Copiar CPF"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {form.cpf && !isValidCPF(form.cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento</Label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                type="date"
                value={form.data_nascimento}
                onChange={(e) => handleDobChange(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={!form.data_nascimento}
                onClick={() => copyToClipboard(form.data_nascimento)}
                title="Copiar data de nascimento"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Idade</Label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                type="number"
                value={form.idade}
                onChange={(e) => update("idade", e.target.value)}
                readOnly={!!form.data_nascimento}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={!form.idade}
                onClick={() => copyToClipboard(form.idade)}
                title="Copiar idade"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={form.telefone}
                onChange={(e) => update("telefone", formatPhoneInput(e.target.value))}
                placeholder="+55 (11) 99999-9999"
                inputMode="tel"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={!form.telefone}
                onClick={() => copyToClipboard(form.telefone)}
                title="Copiar telefone"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Órgão</Label>
            <Select value={form.orgao || undefined} onValueChange={(v) => update("orgao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ORGAOS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                {form.orgao && !ORGAOS.includes(form.orgao as typeof ORGAOS[number]) && (
                  <SelectItem value={form.orgao} disabled>(legado: {form.orgao})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Origem do lead</Label>
            <Select value={form.origem || undefined} onValueChange={(v) => update("origem", v)}>
              <SelectTrigger><SelectValue placeholder="De onde veio..." /></SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                {form.origem && !ORIGENS.includes(form.origem as typeof ORIGENS[number]) && (
                  <SelectItem value={form.origem} disabled>(legado: {form.origem})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Agendado para</Label>
            <Input
              type="date"
              value={form.proximo_contato_data}
              onChange={(e) => update("proximo_contato_data", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horário</Label>
            <Input
              type="time"
              className="px-3 py-2 text-base"
              value={form.proximo_contato_hora}
              onChange={(e) => update("proximo_contato_hora", e.target.value)}
              placeholder="--:--"
              disabled={!form.proximo_contato_data}
            />
            <p className="text-xs text-muted-foreground">Opcional (padrão 09:00)</p>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Compra de dívida — R$</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.compra_divida}
              onChange={(e) => update("compra_divida", e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">Valor destinado à quitação de dívidas anteriores do cliente.</p>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Margem disponível (global) — R$</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.margem_disponivel}
              onChange={(e) => update("margem_disponivel", e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">Margem total disponível do cliente em todas as operações.</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
                Valor bruto (a receber) — R$
              </Label>
              {valorBrutoTouched && (
                <span className="text-[10px] text-amber-500 font-medium">Editado manualmente</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                className="flex-1"
                type="number"
                step="0.01"
                min="0"
                value={form.valor_bruto}
                onChange={(e) => {
                  setValorBrutoTouched(true);
                  update("valor_bruto", e.target.value);
                }}
                placeholder="0,00"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 px-2 sm:px-3"
                title="Recalcular: Margem ÷ Fator"
                disabled={!form.margem_disponivel || !form.fator || Number(form.fator) <= 0}
                onClick={() => {
                  setValorBrutoTouched(false);
                  update("valor_bruto", "");
                }}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Recalcular</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Calculado automaticamente: Margem ÷ Fator. Você pode editar manualmente e usar o botão para voltar ao cálculo automático.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>RPS Total (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.taxa_rps}
              onChange={(e) => update("taxa_rps", e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Fator</Label>
            <div className="flex items-center gap-2">
              <Input
                className={`flex-1 ${factorInvalid ? "border-destructive focus-visible:ring-destructive text-right font-mono" : "text-right font-mono"}`}
                type="text"
                inputMode="numeric"
                value={formatFactorDisplay(form.fator)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10);
                  if (!digits) { update("fator", ""); return; }
                  update("fator", (parseInt(digits, 10) / 100000).toFixed(5));
                }}
                onFocus={(e) => {
                  const el = e.currentTarget;
                  requestAnimationFrame(() => {
                    const len = el.value.length;
                    el.setSelectionRange(len, len);
                  });
                }}
                onClick={(e) => {
                  const el = e.currentTarget;
                  const len = el.value.length;
                  el.setSelectionRange(len, len);
                }}
                placeholder="0,00000"
                aria-invalid={factorInvalid}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={!form.fator}
                onClick={() => copyToClipboard(formatFactorDisplay(form.fator))}
                title="Copiar fator"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {factorInvalid && (
              <p className="text-xs text-destructive">O fator deve ser um número válido.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Opcional. Digite apenas números — os dígitos entram pela direita (ex.: 234 → 0,00234).
            </p>
            <p className="text-xs text-muted-foreground">Preenchido com 5 casas decimais.</p>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Valor RPS (R$)</Label>
            <Input
              readOnly
              className="bg-muted font-mono"
              value={
                form.valor_bruto && form.taxa_rps
                  ? (parseFloat(form.valor_bruto) * parseFloat(form.taxa_rps) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "R$ 0,00"
              }
            />
            <p className="text-xs text-muted-foreground">Calculado automaticamente: Valor bruto × RPS Total (%)</p>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Valor Líquido Cliente (R$)</Label>
            <Input
              readOnly
              className="bg-muted font-mono"
              value={(() => {
                const vb = parseFloat(form.valor_bruto) || 0;
                const tx = parseFloat(form.taxa_rps) || 0;
                const rps = vb * tx / 100;
                return (vb - rps).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
              })()}
            />
            <p className="text-xs text-muted-foreground">Calculado automaticamente: Valor bruto − Valor RPS</p>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Estágio</Label>
            <Select value={form.stage} onValueChange={(v) => update("stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={8} className="min-h-[180px]" value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} />
          </div>
          {client && (
            <div className="col-span-2 lg:col-span-3 space-y-2 rounded-md border border-border/50 p-3">
              <Label>Anexos (extratos, contracheques, etc.)</Label>
              <ClientAttachments clientId={client.id} />
            </div>
          )}
          <DialogFooter className="col-span-2 lg:col-span-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" variant="secondary" className="w-full" onClick={() => setOpenProposal(true)}>
              <FileText className="mr-2 h-4 w-4" />Gerar proposta
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => setOpenReport(true)}>
              <ImageIcon className="mr-2 h-4 w-4" />Relatório (imagem)
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={discardDraft}>Cancelar</Button>
            <Button type="submit" className="w-full" disabled={busy} style={{ background: "var(--gradient-primary)" }}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>

        </form>
        <ProposalDialog
          open={openProposal}
          onOpenChange={setOpenProposal}
          nome={form.nome}
          telefone={form.telefone}
          valorBruto={parseFloat(form.valor_bruto) || 0}
          taxaRps={parseFloat(form.taxa_rps) || 0}
          compraDivida={parseFloat(form.compra_divida) || 0}
        />
        <ReportImageDialog
          open={openReport}
          onOpenChange={setOpenReport}
          nome={form.nome}
          telefone={form.telefone}
          orgao={form.orgao}
          valorBruto={parseFloat(form.valor_bruto) || 0}
          taxaRps={parseFloat(form.taxa_rps) || 0}
          compraDivida={parseFloat(form.compra_divida) || 0}
          margem={parseFloat(form.margem_disponivel) || 0}
          fator={form.fator ? parseFloat(form.fator) : null}
        />
      </DialogContent>
    </Dialog>

  );
}
