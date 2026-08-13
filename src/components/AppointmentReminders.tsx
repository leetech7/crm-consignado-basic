import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, X } from "lucide-react";

const STORAGE_KEY = "notified_appointments";

function BlinkingReminder({ nome, orgao, when, onDismiss }: { nome: string; orgao?: string | null; when: Date; onDismiss: () => void }) {
  const [blinking, setBlinking] = useState(true);
  return (
    <div
      onClick={() => setBlinking(false)}
      className={`pointer-events-auto flex w-full items-start gap-4 rounded-xl border border-warning/30 bg-card p-5 shadow-lg ${blinking ? "animate-toast-blink" : ""} cursor-pointer`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/20">
        <CalendarClock className="h-6 w-6 text-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold leading-tight">Contato agendado: {nome}</div>
        <div className="mt-1 text-base text-muted-foreground">
          {orgao ? orgao + " • " : ""}
          {format(when, "dd/MM 'às' HH:mm", { locale: ptBR })}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{blinking ? "Clique para parar o alerta" : "Alerta pausado"}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function getNotified(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveNotified(set: Set<string>) {
  // mantém só os últimos 200 ids
  const arr = Array.from(set).slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

export function AppointmentReminders() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const now = new Date();
      const horizon = new Date(now.getTime() + 60 * 1000); // próximo minuto
      const { data } = await supabase
        .from("clients")
        .select("id, nome, proximo_contato, orgao")
        .not("proximo_contato", "is", null)
        .lte("proximo_contato", horizon.toISOString());

      if (!data) return;
      const notified = getNotified();
      let changed = false;

      for (const c of data) {
        const when = new Date(c.proximo_contato!);
        // Notifica se chegou a hora (passou ou está dentro do próximo minuto) e ainda não foi notificado nesta janela
        const key = `${c.id}:${c.proximo_contato}`;
        if (when.getTime() <= horizon.getTime() && !notified.has(key)) {
          // só dispara se passou no máximo 24h da hora marcada para evitar floods de antigos
          const ageMs = now.getTime() - when.getTime();
          if (ageMs < 24 * 60 * 60 * 1000) {
            toast(`Contato agendado: ${c.nome}`, {
              description: `${c.orgao ? c.orgao + " • " : ""}${format(when, "dd/MM 'às' HH:mm", { locale: ptBR })}`,
              icon: <CalendarClock className="h-4 w-4 text-primary" />,
              duration: Infinity,
              closeButton: true,
            });
          }
          notified.add(key);
          changed = true;
        }
      }
      if (changed) saveNotified(notified);
    };

    check();
    intervalRef.current = setInterval(check, 30 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return null;
}
