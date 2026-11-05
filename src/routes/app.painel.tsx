import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/pipeline";
import { FileCheck2, Handshake, Flame, Coins, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/painel")({
  head: () => ({ meta: [
    { title: "Painel de KPIs — CRM-OSC - CONSIG" },
    { name: "description", content: "Indicadores de contratos digitados, negociações, trocos de portabilidade e propostas enviadas." },
    { property: "og:title", content: "Painel de KPIs — CRM-OSC - CONSIG" },
    { property: "og:description", content: "Indicadores de contratos digitados, negociações, trocos de portabilidade e propostas enviadas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Painel,
});

type PropostaRecente = { id: string; created_at: string; canal: string; clients: { nome: string } | null };

function Painel() {
  const [digitados, setDigitados] = useState(0);
  const [negociacao, setNegociacao] = useState(0);
  const [quentes, setQuentes] = useState(0);
  const [totalTrocos, setTotalTrocos] = useState(0);
  const [contratosPortar, setContratosPortar] = useState(0);
  const [propostas, setPropostas] = useState(0);
  const [recentes, setRecentes] = useState<PropostaRecente[]>([]);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: clients, error: e1 }, { data: contratos, error: e2 }, { data: eventos, error: e3 }] = await Promise.all([
          supabase.from("clients").select("stage"),
          supabase.from("client_contracts").select("valor_troco").eq("portar", true),
          supabase.from("proposal_events").select("id, created_at, canal, clients(nome)").order("created_at", { ascending: false }),
        ]);
        if (e1 || e2 || e3) throw e1 ?? e2 ?? e3;
        const c = clients ?? [];
        setDigitados(c.filter((x) => x.stage === "digitado").length);
        setNegociacao(c.filter((x) => x.stage === "em_negociacao").length);
        setQuentes(c.filter((x) => x.stage === "quente").length);
        const t = contratos ?? [];
        setContratosPortar(t.length);
        setTotalTrocos(t.reduce((s, x) => s + Number(x.valor_troco ?? 0), 0));
        const ev = (eventos ?? []) as unknown as PropostaRecente[];
        setPropostas(ev.length);
        setRecentes(ev.slice(0, 8));
      } catch {
        setErro(true);
      }
    })();
  }, []);

  const kpis = [
    { label: "Contratos digitados", value: digitados, icon: FileCheck2, color: "oklch(0.7 0.18 300)" },
    { label: "Em negociação", value: negociacao, icon: Handshake, color: "var(--warning)" },
    { label: "Quentes", value: quentes, icon: Flame, color: "oklch(0.7 0.2 35)" },
    { label: "Total de trocos", value: formatBRL(totalTrocos), icon: Coins, color: "var(--success)", sub: `${contratosPortar} contratos para portar` },
    { label: "Propostas enviadas", value: propostas, icon: Send, color: "var(--info)" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Painel</h1>
        <p className="text-sm text-muted-foreground">Indicadores da operação em tempo real</p>
      </div>

      {erro && <div role="alert" className="border-y border-destructive/30 py-4 text-sm text-destructive">Não foi possível carregar os indicadores. Atualize a tela.</div>}

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4 transition-all hover:-translate-y-0.5" style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <span className="min-w-0 text-xs font-medium uppercase text-muted-foreground">{k.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${k.color} 15%, transparent)` }}>
                  <Icon className="h-4 w-4" style={{ color: k.color }} />
                </div>
              </div>
              <p className="mt-2 break-words text-xl font-bold md:text-2xl">{k.value}</p>
              {k.sub && <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>}
            </Card>
          );
        })}
      </div>

      <Card className="min-w-0 p-3 sm:p-5" style={{ background: "var(--gradient-card)" }}>
        <h3 className="mb-4 text-sm font-semibold">Últimas propostas enviadas</h3>
        {recentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma proposta enviada ainda. As propostas enviadas pelo WhatsApp aparecem aqui.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="min-w-0 break-words font-medium">{p.clients?.nome ?? "Cliente removido"}</span>
                <span className="text-xs text-muted-foreground">
                  {p.canal === "whatsapp" ? "WhatsApp" : p.canal} · {format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
