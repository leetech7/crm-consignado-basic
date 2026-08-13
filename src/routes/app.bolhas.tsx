import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, STAGES, type Client } from "@/lib/pipeline";
import { BubbleField, bubbleColor } from "@/components/BubbleField";
import { FireworksBurst, type Burst } from "@/components/FireworksBurst";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/app/bolhas")({
  head: () => ({
    meta: [
      { title: "Bolhas do Pipeline — CRM-OSC CONSIG" },
      { name: "description", content: "Visualização animada dos leads em bolhas flutuantes por estágio do pipeline." },
      { property: "og:title", content: "Bolhas do Pipeline — CRM-OSC CONSIG" },
      { property: "og:description", content: "Acompanhe seus leads em bolhas flutuantes e comemore cada venda paga." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BolhasPage,
});

const HIDDEN = new Set(["descartado", "pago"]);

function BolhasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [popping, setPopping] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Client | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const clientsRef = useRef<Client[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    const all = (data ?? []) as Client[];
    clientsRef.current = all;
    setClients(all.filter((c) => !HIDDEN.has(c.stage)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const celebrate = useCallback((client: Client, point: { x: number; y: number }) => {
    setPopping((p) => new Set(p).add(client.id));
    setBursts((b) => [
      ...b.slice(-8),
      { id: `${client.id}-${Date.now()}`, x: point.x, y: point.y, color: bubbleColor(client.stage) },
    ]);
    toast.success(`PAGO! ${client.nome} 🎉`);
    window.setTimeout(() => {
      setClients((cs) => cs.filter((c) => c.id !== client.id));
      setPopping((p) => {
        const n = new Set(p);
        n.delete(client.id);
        return n;
      });
    }, 650);
  }, []);

  const handlePop = useCallback(
    async (client: Client, point: { x: number; y: number }) => {
      if (client.stage === "pago") return;
      celebrate(client, point);
      const { error } = await supabase.from("clients").update({ stage: "pago" }).eq("id", client.id);
      if (error) {
        toast.error(error.message);
        load();
      }
    },
    [celebrate, load],
  );

  // Realtime: reflete mudanças de estágio ao vivo
  useEffect(() => {
    const channel = supabase
      .channel("bolhas-clients")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, (payload) => {
        const next = payload.new as Client | undefined;
        const prev = clientsRef.current.find((c) => c.id === next?.id);
        if (next && next.stage === "pago" && prev && prev.stage !== "pago") {
          celebrate(prev, { x: 0, y: 0 });
        }
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [celebrate, load]);

  const openClient = (c: Client) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const totals = STAGES.filter((s) => !HIDDEN.has(s.id)).map((s) => ({
    ...s,
    count: clients.filter((c) => c.stage === s.id).length,
  }));
  const totalValor = clients.reduce((s, c) => s + Number(c.valor_bruto ?? 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bolhas</h1>
        <p className="text-sm text-muted-foreground">
          Clique na bolha para abrir o cliente. Duplo clique estoura a bolha e marca como PAGO.
        </p>
      </div>

      <div className="relative">
        <BubbleField clients={clients} onOpen={openClient} onPop={handlePop} popping={popping} />
        <FireworksBurst bursts={bursts} />
      </div>

      <Card className="p-4" style={{ background: "var(--gradient-card)" }}>
        <div className="flex flex-wrap items-center gap-3">
          {totals.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bubbleColor(s.id) }} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-semibold">{s.count}</span>
            </div>
          ))}
          <div className="ml-auto text-sm font-semibold text-primary">Em jogo: {formatBRL(totalValor)}</div>
        </div>
      </Card>

      <ClientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} client={editing} onSaved={load} />
    </div>
  );
}
