import { useMemo, useState, useEffect } from "react";
import { Copy, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatBRL, formatPhoneForWhatsApp } from "@/lib/pipeline";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  telefone?: string | null;
  valorBruto: number;
  taxaRps: number; // %
};

const firstName = (n: string) => (n ?? "").trim().split(/\s+/)[0] ?? "";

export function ProposalDialog({ open, onOpenChange, nome, telefone, valorBruto, taxaRps }: Props) {
  const [bruto, setBruto] = useState("");
  const [compraDivida, setCompraDivida] = useState("");
  const [taxa, setTaxa] = useState("");
  const [honorarios, setHonorarios] = useState("");

  useEffect(() => {
    if (!open) return;
    setBruto(valorBruto ? String(valorBruto) : "");
    setTaxa(taxaRps ? String(taxaRps) : "");
    setCompraDivida("");
    setHonorarios("");
  }, [open, valorBruto, taxaRps]);

  const n = (v: string) => parseFloat(String(v).replace(",", ".")) || 0;

  const calc = useMemo(() => {
    const vb = n(bruto);
    const cd = n(compraDivida);
    const tx = n(taxa);
    const vtx = (vb * tx) / 100;
    const hon = n(honorarios);
    return { vb, cd, tx, vtx, hon, liquido: vb - cd - vtx - hon };
  }, [bruto, compraDivida, taxa, honorarios]);

  const texto = useMemo(() => {
    const linhas = [
      `*PROPOSTA DE CRÉDITO CONSIGNADO*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Olá, *${firstName(nome)}*! Segue o resumo da sua proposta:`,
      ``,
      `\`\`\``,
      `Valor bruto .......... ${formatBRL(calc.vb)}`,
      `Compra de dívida ..... ${formatBRL(calc.cd)}`,
      `Taxas (${calc.tx.toLocaleString("pt-BR")}%) ${".".repeat(Math.max(1, 12 - calc.tx.toLocaleString("pt-BR").length))} ${formatBRL(calc.vtx)}`,
      `Honorários ........... ${formatBRL(calc.hon)}`,
      `---------------------------------`,
      `VALOR LÍQUIDO ........ ${formatBRL(calc.liquido)}`,
      `\`\`\``,
      ``,
      `Valores sujeitos à confirmação da margem e aprovação do banco.`,
      `Qualquer dúvida, estou à disposição.`,
    ];
    return linhas.join("\n");
  }, [nome, calc]);

  const enviar = () => {
    const phone = formatPhoneForWhatsApp(telefone ?? "");
    if (!phone) return toast.error("Telefone inválido — verifique DDD e número");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Proposta copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar proposta</DialogTitle>
          <DialogDescription>Confira os valores e envie a proposta por WhatsApp.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Valor bruto (R$)</Label>
            <Input inputMode="decimal" value={bruto} onChange={(e) => setBruto(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Compra de dívida (R$)</Label>
            <Input inputMode="decimal" value={compraDivida} onChange={(e) => setCompraDivida(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Taxas (%)</Label>
            <Input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} className="font-mono" />
            <p className="text-xs text-muted-foreground">Valor das taxas: {formatBRL(calc.vtx)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Honorários (R$)</Label>
            <Input inputMode="decimal" value={honorarios} onChange={(e) => setHonorarios(e.target.value)} className="font-mono" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Valor líquido (R$)</Label>
            <Input readOnly className="bg-muted font-mono" value={formatBRL(calc.liquido)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Pré-visualização</Label>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border/50 bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {texto}
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={copiar}>
            <Copy className="mr-2 h-4 w-4" />Copiar
          </Button>
          <Button type="button" onClick={enviar} style={{ background: "var(--gradient-primary)" }}>
            <MessageCircle className="mr-2 h-4 w-4" />Enviar no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
