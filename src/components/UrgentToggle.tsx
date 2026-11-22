import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function UrgentToggle({ clientId, value, onChange, showLabel = false, className }: {
  clientId: string; value: boolean; onChange?: (v: boolean) => void; showLabel?: boolean; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    const next = !value;
    setBusy(true);
    onChange?.(next);
    const { error } = await supabase.from("clients").update({ urgente: next }).eq("id", clientId);
    setBusy(false);
    if (error) { onChange?.(value); toast.error(error.message); }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      title={value ? "Urgente — clique para desmarcar" : "Marcar como contato urgente"}
      aria-pressed={value}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md p-1 transition-colors",
        value ? "text-destructive" : "text-muted-foreground/40 hover:text-destructive/70",
        showLabel && "border px-2 text-xs font-semibold",
        showLabel && (value ? "border-destructive bg-destructive/10" : "border-border"),
        className,
      )}
    >
      <AlertTriangle className={cn("h-4 w-4", value && "fill-destructive/20 animate-pulse")} />
      {showLabel && <span>Urgente</span>}
    </button>
  );
}
