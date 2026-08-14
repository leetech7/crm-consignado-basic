import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Copy, MessageCircle, Share2 } from "lucide-react";
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
  orgao?: string | null;
  valorBruto: number;
  taxaRps: number; // %
  compraDivida?: number;
  margem: number;
  fator?: number | null;
};

const firstName = (n: string) => (n ?? "").trim().split(/\s+/)[0] ?? "";
const num = (v: string) => parseFloat(String(v).replace(/\./g, "").replace(",", ".")) || 0;

export function ReportImageDialog({
  open, onOpenChange, nome, telefone, orgao, valorBruto, taxaRps, margem, fator,
}: Props) {
  const [bruto, setBruto] = useState("");
  const [compraDivida, setCompraDivida] = useState("");
  const [taxa, setTaxa] = useState("");
  const [honorarios, setHonorarios] = useState("");
  const [prazo, setPrazo] = useState("96");
  const [parcela, setParcela] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setBruto(valorBruto ? String(valorBruto) : "");
    setTaxa(taxaRps ? String(taxaRps) : "");
    setCompraDivida("");
    setHonorarios("");
    setParcela(margem ? String(margem) : "");
  }, [open, valorBruto, taxaRps, margem]);

  const calc = useMemo(() => {
    const vb = num(bruto);
    const cd = num(compraDivida);
    const tx = num(taxa);
    const vtx = (vb * tx) / 100;
    const hon = num(honorarios);
    const pz = parseInt(prazo, 10) || 0;
    const pc = num(parcela);
    return { vb, cd, tx, vtx, hon, pz, pc, total: pc * pz, liquido: vb - cd - vtx - hon };
  }, [bruto, compraDivida, taxa, honorarios, prazo, parcela]);

  const draw = useCallback(() => {
    const W = 1080;
    const H = 1350;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0b1220");
    bg.addColorStop(1, "#111c31");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // header
    const hg = ctx.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, "#1d4ed8");
    hg.addColorStop(1, "#38bdf8");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, 190);

    const sys = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 46px ${sys}`;
    ctx.fillText("CRM-OSC · CONSIG", 64, 88);
    ctx.font = `400 30px ${sys}`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("Simulação de Crédito Consignado", 64, 140);

    // cliente
    let y = 270;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `700 42px ${sys}`;
    ctx.fillText(firstName(nome) || "Cliente", 64, y);
    ctx.font = `400 28px ${sys}`;
    ctx.fillStyle = "#94a3b8";
    const sub = [orgao || null, new Date().toLocaleDateString("pt-BR")].filter(Boolean).join("  ·  ");
    ctx.fillText(sub, 64, y + 44);

    y += 110;
    const rows: Array<[string, string, boolean?]> = [
      ["Valor bruto", formatBRL(calc.vb)],
      ["Compra de dívida", formatBRL(calc.cd)],
      [`Taxa de honorários (RPS) ${calc.tx.toLocaleString("pt-BR")}%`, formatBRL(calc.vtx)],
      ["Honorários adicionais", formatBRL(calc.hon)],
      ["Prazo", calc.pz ? `${calc.pz} meses` : "-"],
      ["Parcela mensal", formatBRL(calc.pc)],
      ["Total das parcelas", formatBRL(calc.total)],
    ];
    if (fator) rows.push(["Fator utilizado", Number(fator).toFixed(5)]);
    if (margem) rows.push(["Margem disponível", formatBRL(margem)]);

    rows.forEach(([label, value], i) => {
      const ry = y + i * 76;
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.015)";
      ctx.fillRect(48, ry - 46, W - 96, 66);
      ctx.fillStyle = "#94a3b8";
      ctx.font = `400 30px ${sys}`;
      ctx.textAlign = "left";
      ctx.fillText(label, 72, ry);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = `600 32px ${sys}`;
      ctx.textAlign = "right";
      ctx.fillText(value, W - 72, ry);
      ctx.textAlign = "left";
    });

    // destaque líquido
    const by = y + rows.length * 76 + 40;
    const cardG = ctx.createLinearGradient(48, by, W - 48, by + 170);
    cardG.addColorStop(0, "#0f766e");
    cardG.addColorStop(1, "#10b981");
    ctx.fillStyle = cardG;
    ctx.beginPath();
    ctx.roundRect(48, by, W - 96, 170, 24);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 30px ${sys}`;
    ctx.fillText("VALOR LÍQUIDO A RECEBER", 80, by + 62);
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 64px ${sys}`;
    ctx.fillText(formatBRL(calc.liquido), 80, by + 132);

    ctx.fillStyle = "#64748b";
    ctx.font = `400 24px ${sys}`;
    ctx.fillText("Valores sujeitos à confirmação de margem e aprovação do banco.", 64, H - 70);

    setDataUrl(canvas.toDataURL("image/png"));
  }, [nome, orgao, calc, fator, margem]);

  useEffect(() => {
    if (open) draw();
  }, [open, draw]);

  const toBlob = () =>
    new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, "image/png") ?? resolve(null));

  const baixar = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `relatorio-${firstName(nome).toLowerCase() || "cliente"}.png`;
    a.click();
    toast.success("Imagem baixada");
  };

  const copiar = async () => {
    try {
      const blob = await toBlob();
      if (!blob) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Imagem copiada — cole no WhatsApp");
    } catch {
      toast.error("Não foi possível copiar. Use 'Baixar imagem'.");
    }
  };

  const compartilhar = async () => {
    const blob = await toBlob();
    if (!blob) return toast.error("Falha ao gerar imagem");
    const file = new File([blob], `relatorio-${firstName(nome) || "cliente"}.png`, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Relatório", text: `Olá ${firstName(nome)}, segue sua simulação.` });
        return;
      } catch {
        return;
      }
    }
    toast.info("Compartilhamento direto indisponível — imagem baixada, anexe no WhatsApp.");
    baixar();
  };

  const abrirWhats = () => {
    const phone = formatPhoneForWhatsApp(telefone ?? "");
    if (!phone) return toast.error("Telefone inválido — verifique DDD e número");
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(`Olá ${firstName(nome)}, segue o relatório da sua simulação em imagem.`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório em imagem</DialogTitle>
          <DialogDescription>Ajuste os valores e envie o relatório como imagem no WhatsApp.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor bruto (R$)</Label>
              <Input inputMode="decimal" className="font-mono" value={bruto} onChange={(e) => setBruto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Compra de dívida (R$)</Label>
              <Input inputMode="decimal" className="font-mono" value={compraDivida} onChange={(e) => setCompraDivida(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Taxa RPS (%)</Label>
              <Input inputMode="decimal" className="font-mono" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Honorários (R$)</Label>
              <Input inputMode="decimal" className="font-mono" value={honorarios} onChange={(e) => setHonorarios(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo (meses)</Label>
              <Input inputMode="numeric" className="font-mono" value={prazo} onChange={(e) => setPrazo(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-1.5">
              <Label>Parcela (R$)</Label>
              <Input inputMode="decimal" className="font-mono" value={parcela} onChange={(e) => setParcela(e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Valor líquido (R$)</Label>
              <Input readOnly className="bg-muted font-mono" value={formatBRL(calc.liquido)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pré-visualização</Label>
            {dataUrl ? (
              <img src={dataUrl} alt="Relatório do cliente" className="w-full rounded-md border border-border/50" />
            ) : (
              <div className="h-64 rounded-md border border-border/50 bg-muted/40" />
            )}
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button type="button" variant="outline" className="w-full" onClick={baixar}><Download className="mr-2 h-4 w-4" />Baixar</Button>
          <Button type="button" variant="outline" className="w-full" onClick={copiar}><Copy className="mr-2 h-4 w-4" />Copiar imagem</Button>
          <Button type="button" variant="secondary" className="w-full" onClick={abrirWhats}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button>
          <Button type="button" className="w-full" onClick={compartilhar} style={{ background: "var(--gradient-primary)" }}>
            <Share2 className="mr-2 h-4 w-4" />Enviar imagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
