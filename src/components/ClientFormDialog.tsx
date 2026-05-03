import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STAGES, type Client, type PipelineStage } from "@/lib/pipeline";
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
  telefone: "",
  orgao: "",
  endereco: "",
  observacoes: "",
  proximo_contato: "",
  taxa_rps: "",
  stage: "novo" as PipelineStage,
};

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        nome: client.nome ?? "",
        cpf: client.cpf ?? "",
        idade: client.idade?.toString() ?? "",
        telefone: client.telefone ?? "",
        orgao: client.orgao ?? "",
        endereco: client.endereco ?? "",
        observacoes: client.observacoes ?? "",
        proximo_contato: client.proximo_contato ? client.proximo_contato.slice(0, 16) : "",
        taxa_rps: client.taxa_rps?.toString() ?? "",
        stage: client.stage,
      });
    } else setForm(empty);
  }, [client, open]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const payload = {
      owner_id: client?.owner_id ?? user.id,
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      idade: form.idade ? parseInt(form.idade) : null,
      telefone: form.telefone || null,
      orgao: form.orgao || null,
      endereco: form.endereco || null,
      observacoes: form.observacoes || null,
      proximo_contato: form.proximo_contato ? new Date(form.proximo_contato).toISOString() : null,
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
            <Input value={form.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1.5">
            <Label>Idade</Label>
            <Input type="number" value={form.idade} onChange={(e) => update("idade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => update("telefone", e.target.value)} placeholder="(11) 99999-9999" />
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
            <Input type="datetime-local" value={form.proximo_contato} onChange={(e) => update("proximo_contato", e.target.value)} />
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
