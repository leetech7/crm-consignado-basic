import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

const DOCS = [
  "Foto do RG (frente e verso legíveis, foto enquadrada)",
  "Vídeo do RG (conforme modelo)",
  "Comprovante de residência recente (conta de LUZ ou ÁGUA)",
  "Extrato de consignados",
  "3 últimos contracheques",
  "Extratos bancários (3 últimos meses)",
  "E-mail válido",
  "Telefone para contato",
];

export function DocsSiapeBaneseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const copiar = async () => {
    const texto = "Documentos necessários — Siape · Banese:\n" + DOCS.map((d, i) => `${i + 1}. ${d}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Lista copiada — cole no WhatsApp ou onde precisar.");
    } catch {
      toast.error("Não foi possível copiar a lista.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Docs para Siape - Banese</DialogTitle>
          <DialogDescription>Documentos necessários para a operação.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {DOCS.map((d) => (
            <li key={d} className="flex items-start gap-2 rounded-md border border-border/50 p-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={copiar}>
            <Copy className="h-4 w-4 mr-2" />Copiar lista
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
