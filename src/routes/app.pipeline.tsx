import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, formatBRL, type Client, type PipelineStage } from "@/lib/pipeline";
import { Button } from "@/components/ui/button";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";
import { GripVertical, Plus } from "lucide-react";
import { ClientFormDialog } from "@/components/ClientFormDialog";

export const Route = createFileRoute("/app/pipeline")({
  component: PipelinePage,
});

function ClientCard({ client, onEdit }: { client: Client; onEdit: (c: Client) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50, opacity: isDragging ? 0.6 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onEdit(client)}
      className="cursor-grab rounded-lg border border-border bg-card p-3 text-sm shadow-sm transition-all hover:border-primary/50 active:cursor-grabbing"
      title="Duplo clique para editar"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{client.nome}</div>
          {client.orgao && <div className="truncate text-xs text-muted-foreground">{client.orgao}</div>}
          {!!client.taxa_rps && (
            <div className="mt-1 text-xs font-mono text-primary">{formatBRL(Number(client.taxa_rps))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ stage, clients, onEdit }: { stage: typeof STAGES[number]; clients: Client[]; onEdit: (c: Client) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = clients.reduce((s, c) => s + Number(c.taxa_rps ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border bg-card/40"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{clients.length}</span>
        </div>
      </div>
      {total > 0 && <div className="mb-2 text-xs text-muted-foreground">{formatBRL(total)}</div>}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Vazio</div>
        ) : clients.map((c) => <ClientCard key={c.id} client={c} onEdit={onEdit} />)}
      </div>
    </div>
  );
}

function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data ?? []) as Client[]);
  };

  useEffect(() => { load(); }, []);

  const onDragEnd = async (e: DragEndEvent) => {
    const id = e.active.id as string;
    const newStage = e.over?.id as PipelineStage | undefined;
    if (!newStage) return;
    const client = clients.find((c) => c.id === id);
    if (!client || client.stage === newStage) return;
    setClients((cs) => cs.map((c) => (c.id === id ? { ...c, stage: newStage } : c)));
    const { error } = await supabase.from("clients").update({ stage: newStage }).eq("id", id);
    if (error) { toast.error(error.message); load(); }
    else toast.success(`Movido para ${STAGES.find((s) => s.id === newStage)?.label}`);
  };

  const handleEdit = (c: Client) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Arraste os cards para mover entre estágios. Duplo clique para editar.</p>
        </div>
        <Button onClick={handleNew} style={{ background: "var(--gradient-primary)" }}>
          <Plus className="h-4 w-4" /> Adicionar cliente
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <Column key={s.id} stage={s} clients={clients.filter((c) => c.stage === s.id)} onEdit={handleEdit} />
          ))}
        </div>
      </DndContext>
      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={editing}
        onSaved={load}
      />
    </div>
  );
}
