import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STAGES, onlyDigits, formatCPF, isValidCPF, type Client, type PipelineStage } from "@/lib/pipeline";

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
import { ClientAttachments } from "@/components/ClientAttachments";
import { toast } from "sonner";

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
  endereco: "",
  observacoes: "",
  proximo_contato_data: "",
  proximo_contato_hora: "",
  taxa_rps: "",
  stage: "novo" as PipelineStage,
};

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (client) {
      const pc = client.proximo_contato ? new Date(client.proximo_contato) : null;
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = pc ? `${pc.getFullYear()}-${pad(pc.getMonth() + 1)}-${pad(pc.getDate())}` : "";
      const timeStr = pc ? `${pad(pc.getHours())}:${pad(pc.getMinutes())}` : "";
      setForm({
        nome: client.nome ?? "",
        cpf: client.cpf ? formatCPF(client.cpf) : "",
        idade: client.idade?.toString() ?? "",
        data_nascimento: client.data_nascimento ?? "",
        telefone: client.telefone ?? "",
        orgao: client.orgao ?? "",
        endereco: client.endereco ?? "",
        observacoes: client.observacoes ?? "",
        proximo_contato_data: dateStr,
        proximo_contato_hora: timeStr === "00:00" ? "" : timeStr,
        taxa_rps: client.taxa_rps?.toString() ?? "",
        stage: client.stage,
      });
    } else setForm(empty);
  }, [client, open]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
    setBusy(true);
    const payload = {
      owner_id: client?.owner_id ?? user.id,
      nome: form.nome.trim(),
      cpf: form.cpf ? formatCPF(form.cpf) : null,
      idade: form.idade ? parseInt(form.idade) : null,
      data_nascimento: form.data_nascimento || null,
      telefone: form.telefone || null,
      orgao: form.orgao || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
      proximo_contato: form.proximo_contato_data
        ? new Date(`${form.proximo_contato_data}T${form.proximo_contato_hora || "09:00"}`).toISOString()
        : null,
      taxa_rps: form.taxa_rps ? parseFloat(form.taxa_rps) : 0,
      stage: form.stage,
    };

    const { error } = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload);

    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(client ? "Cliente atualizado" : "Cliente cadastrado");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => update("nome", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
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
              className={form.cpf && !isValidCPF(form.cpf) ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {form.cpf && !isValidCPF(form.cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Data de nascimento</Label>
            <Input
              type="date"
              value={form.data_nascimento}
              onChange={(e) => handleDobChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Idade</Label>
            <Input
              type="number"
              value={form.idade}
              onChange={(e) => update("idade", e.target.value)}
              readOnly={!!form.data_nascimento}
              className={form.data_nascimento ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) => update("telefone", formatPhoneInput(e.target.value))}
              placeholder="+55 (11) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Órgão</Label>
            <Input value={form.orgao} onChange={(e) => update("orgao", e.target.value)} placeholder="INSS, SIAPE..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Próximo contato</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="flex-1"
                value={form.proximo_contato_data}
                onChange={(e) => update("proximo_contato_data", e.target.value)}
              />
              <Input
                type="time"
                className="w-[130px] px-3 py-2 text-base"
                value={form.proximo_contato_hora}
                onChange={(e) => update("proximo_contato_hora", e.target.value)}
                placeholder="--:--"
                disabled={!form.proximo_contato_data}
              />
            </div>
            <p className="text-xs text-muted-foreground">Horário opcional (padrão 09:00)</p>
          </div>
          <div className="space-y-1.5">
            <Label>Taxa RPS (R$)</Label>
            <Input type="number" step="0.01" value={form.taxa_rps} onChange={(e) => update("taxa_rps", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Estágio</Label>
            <Select value={form.stage} onValueChange={(v) => update("stage", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={3} value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} />
          </div>
          {client && (
            <div className="sm:col-span-2 space-y-2 rounded-md border border-border/50 p-3">
              <Label>Anexos (extratos, contracheques, etc.)</Label>
              <ClientAttachments clientId={client.id} />
            </div>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} style={{ background: "var(--gradient-primary)" }}>
              {busy ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
