import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp, type Client } from "@/lib/pipeline";
import { CalendarClock, MessageCircle, Phone } from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/app/agenda")({
  component: AgendaPage,
});

function AgendaPage() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .not("proximo_contato", "is", null)
        .order("proximo_contato", { ascending: true });
      setClients((data ?? []) as Client[]);
    })();
  }, []);

  const groups: Record<string, Client[]> = { atrasados: [], hoje: [], proximos: [] };
  clients.forEach((c) => {
    const d = new Date(c.proximo_contato!);
    if (isPast(d) && !isToday(d)) groups.atrasados.push(c);
    else if (isToday(d)) groups.hoje.push(c);
    else groups.proximos.push(c);
  });

  const openWhatsApp = (c: Client) => {
    const phone = formatPhoneForWhatsApp(c.telefone);
    if (!phone) return toast.error("Telefone inválido");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${c.nome.split(" ")[0]}!`)}`, "_blank");
  };

  const renderGroup = (title: string, items: Client[], color: string) => (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">Nada por aqui</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const d = new Date(c.proximo_contato!);
            const days = differenceInDays(d, new Date());
            return (
              <Card key={c.id} className="p-4" style={{ background: "var(--gradient-card)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.nome}</div>
                    <div className="text-xs text-muted-foreground">{c.orgao ?? ""}</div>
                  </div>
                  <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div>{format(d, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</div>
                  <div className="font-medium" style={{ color }}>
                    {days === 0 ? "Hoje" : days < 0 ? `${Math.abs(days)} dia(s) atrasado` : `Em ${days} dia(s)`}
                  </div>
                </div>
                {c.telefone && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openWhatsApp(c)}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${c.telefone}`}><Phone className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Agenda de retornos</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seus próximos contatos</p>
      </div>
      {renderGroup("Atrasados", groups.atrasados, "var(--destructive)")}
      {renderGroup("Hoje", groups.hoje, "var(--warning)")}
      {renderGroup("Próximos", groups.proximos, "var(--info)")}
    </div>
  );
}
