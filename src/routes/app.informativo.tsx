import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Plus, Pencil, Trash2, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/app/informativo")({
  component: InformativoPage,
});

type Prioridade = "normal" | "importante" | "urgente";

type Comunicado = {
  id: string;
  titulo: string;
  conteudo: string;
  data_comunicado: string;
  prioridade: Prioridade;
  author_id: string;
  created_at: string;
};

const PRIORIDADES: { value: Prioridade; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "importante", label: "Importante" },
  { value: "urgente", label: "Urgente" },
];

const PRIORITY_STYLE: Record<Prioridade, string> = {
  normal: "bg-muted text-muted-foreground",
  importante: "bg-primary/15 text-primary",
  urgente: "bg-destructive/15 text-destructive",
};

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const now = new Date();
  const tz = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
}

function InformativoPage() {
  const { user, roles } = useAuth();
  const canManage = roles.includes("admin") || roles.includes("gerente");

  const [items, setItems] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Comunicado | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [data, setData] = useState(todayISO());
  const [prioridade, setPrioridade] = useState<Prioridade>("normal");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any)
      .from("comunicados")
      .select("*")
      .order("data_comunicado", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((rows ?? []) as Comunicado[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setTitulo("");
    setConteudo("");
    setData(todayISO());
    setPrioridade("normal");
    setOpen(true);
  };

  const openEdit = (c: Comunicado) => {
    setEditing(c);
    setTitulo(c.titulo);
    setConteudo(c.conteudo ?? "");
    setData(c.data_comunicado);
    setPrioridade(c.prioridade);
    setOpen(true);
  };

  const save = async () => {
    if (!titulo.trim()) {
      toast.error("Informe o título do comunicado");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        conteudo: conteudo.trim(),
        data_comunicado: data || todayISO(),
        prioridade,
      };
      if (editing) {
        const { error } = await (supabase as any)
          .from("comunicados")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Comunicado atualizado");
      } else {
        const { error } = await (supabase as any)
          .from("comunicados")
          .insert({ ...payload, author_id: user?.id });
        if (error) throw error;
        toast.success("Comunicado publicado");
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Comunicado) => {
    if (!confirm(`Remover o comunicado "${c.titulo}"?`)) return;
    const { error } = await (supabase as any).from("comunicados").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Comunicado removido");
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Megaphone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">Informativo</h1>
            <p className="text-sm text-muted-foreground">Comunicados importantes da equipe</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo comunicado
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando comunicados...</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum comunicado publicado até o momento.
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((c) => (
            <Card key={c.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_STYLE[c.prioridade] ?? PRIORITY_STYLE.normal}`}
                    >
                      {PRIORIDADES.find((p) => p.value === c.prioridade)?.label ?? "Normal"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(c.data_comunicado)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold md:text-lg">{c.titulo}</h2>
                  {c.conteudo && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {c.conteudo}
                    </p>
                  )}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar comunicado" : "Novo comunicado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Nova tabela de fatores"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={prioridade} onValueChange={(v) => setPrioridade(v as Prioridade)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conteudo">Mensagem</Label>
              <Textarea
                id="conteudo"
                rows={6}
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Escreva o comunicado..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar" : "Publicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
