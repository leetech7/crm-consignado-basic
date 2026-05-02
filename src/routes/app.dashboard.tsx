import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { STAGES, formatBRL, type PipelineStage, stageLabel } from "@/lib/pipeline";
import { TrendingUp, Users, DollarSign, CheckCircle2, Flame, CalendarClock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [counts, setCounts] = useState<Record<PipelineStage, number>>({} as any);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalPagos, setTotalPagos] = useState(0);
  const [valorPago, setValorPago] = useState(0);
  const [comissaoTotal, setComissaoTotal] = useState(0);
  const [proximos, setProximos] = useState(0);
  const [evolucao, setEvolucao] = useState<{ dia: string; pagos: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: clients } = await supabase.from("clients").select("stage, taxa_rps, paid_at, proximo_contato");
      const c = clients ?? [];
      const stageCounts: any = {};
      STAGES.forEach((s) => (stageCounts[s.id] = 0));
      let pagos = 0, valor = 0, prox = 0;
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 86400000);
      c.forEach((cli) => {
        stageCounts[cli.stage] = (stageCounts[cli.stage] ?? 0) + 1;
        if (cli.stage === "pago") {
          pagos++;
          valor += Number(cli.taxa_rps ?? 0);
        }
        if (cli.proximo_contato && new Date(cli.proximo_contato) <= in7 && new Date(cli.proximo_contato) >= now) prox++;
      });
      setCounts(stageCounts);
      setTotalClientes(c.length);
      setTotalPagos(pagos);
      setValorPago(valor);
      setProximos(prox);

      const { data: comm } = await supabase.from("commissions").select("valor");
      setComissaoTotal((comm ?? []).reduce((s, x) => s + Number(x.valor ?? 0), 0));

      // Evolução últimos 14 dias
      const days: { dia: string; pagos: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = startOfDay(subDays(now, i));
        const next = new Date(d.getTime() + 86400000);
        const count = c.filter((x) => x.paid_at && new Date(x.paid_at) >= d && new Date(x.paid_at) < next).length;
        days.push({ dia: format(d, "dd/MM", { locale: ptBR }), pagos: count });
      }
      setEvolucao(days);
    })();
  }, []);

  const kpis = [
    { label: "Clientes", value: totalClientes, icon: Users, color: "var(--info)" },
    { label: "Vendas PAGAS", value: totalPagos, icon: CheckCircle2, color: "var(--success)" },
    { label: "Receita gerada", value: formatBRL(valorPago), icon: DollarSign, color: "var(--success)" },
    { label: "Comissões", value: formatBRL(comissaoTotal), icon: TrendingUp, color: "var(--accent)" },
    { label: "Em negociação", value: counts["em_negociacao"] ?? 0, icon: Flame, color: "var(--warning)" },
    { label: "Retornos 7d", value: proximos, icon: CalendarClock, color: "var(--info)" },
  ];

  const pipelineData = STAGES.filter((s) => s.id !== "descartado").map((s) => ({
    name: stageLabel(s.id),
    value: counts[s.id] ?? 0,
    fill: s.color,
  }));

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua operação</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card
              key={k.label}
              className="p-4 transition-all hover:-translate-y-0.5"
              style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in oklab, ${k.color} 15%, transparent)` }}>
                  <Icon className="h-4 w-4" style={{ color: k.color }} />
                </div>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight md:text-2xl">{k.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5" style={{ background: "var(--gradient-card)" }}>
          <h3 className="mb-4 text-sm font-semibold">Pipeline por estágio</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5" style={{ background: "var(--gradient-card)" }}>
          <h3 className="mb-4 text-sm font-semibold">Vendas pagas — últimos 14 dias</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="pagos" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2" style={{ background: "var(--gradient-card)" }}>
          <h3 className="mb-4 text-sm font-semibold">Distribuição do pipeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pipelineData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {pipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
