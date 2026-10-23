import { portabilityReportData, type PortabilityGroup } from "./portabilidade";
import { formatBRL } from "./pipeline";

// Canvas pages preserve Portuguese accents identically in JPG and PDF.
export async function createPortabilityReportPages(group: PortabilityGroup) {
  const report = portabilityReportData(group);
  if (!report) throw new Error("Preencha os trocos dos contratos antes de gerar o relatório.");
  await document.fonts.ready;
  const styles = getComputedStyle(document.documentElement);
  const color = (role: string) => styles.getPropertyValue(`--report-${role}`).trim();
  const pages: HTMLCanvasElement[] = [];
  const initialContext = document.createElement("canvas").getContext("2d");
  if (!initialContext) throw new Error("Não foi possível gerar o relatório.");
  let ctx: CanvasRenderingContext2D = initialContext;
  let y = 0;
  const font = (size: number, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px Arial, sans-serif`; };
  const lines = (text: string, width: number) => {
    const result: string[] = [];
    let line = "";
    for (const char of text) {
      if (line && ctx.measureText(line + char).width > width) { result.push(line.trimEnd()); line = ""; }
      line += char;
    }
    if (line) result.push(line.trimEnd());
    return result;
  };
  const startPage = () => {
    const next = document.createElement("canvas");
    next.width = 1240; next.height = 1754;
    const context = next.getContext("2d");
    if (!context) throw new Error("Não foi possível gerar o relatório.");
    ctx = context; pages.push(next);
    ctx.fillStyle = color("paper"); ctx.fillRect(0, 0, next.width, next.height);
    ctx.fillStyle = color("accent"); ctx.fillRect(72, 72, 8, 108);
    font(26, true); ctx.fillText("CRM-OSC - CONSIG", 104, 104);
    ctx.fillStyle = color("ink"); font(38, true); ctx.fillText("Relatório de portabilidade", 104, 157);
    font(23); ctx.fillStyle = color("muted"); ctx.fillText("Contratos marcados para portar", 104, 198);
    ctx.fillStyle = color("ink"); font(30, true);
    const nameLines = lines(report.clientName, 1096);
    y = 267;
    for (const line of nameLines) { ctx.fillText(line, 72, y); y += 38; }
    y += 27;
    ctx.fillStyle = color("band"); ctx.fillRect(72, y, 1096, 54);
    ctx.fillStyle = color("muted"); font(22, true);
    ctx.fillText("BANCO / CONTRATO", 92, y + 35);
    ctx.fillText("PARCELA ATUAL", 700, y + 35);
    ctx.textAlign = "right"; ctx.fillText("TROCO", 1148, y + 35); ctx.textAlign = "left";
    y += 76;
  };
  startPage();
  for (const [index, contract] of report.contracts.entries()) {
    font(25, true);
    const bank = lines(`${index + 1}. ${contract.banco || "Banco não informado"}`, 550);
    font(22);
    const number = lines(`Contrato: ${contract.numero_contrato || "Não informado"}`, 550);
    const height = bank.length * 32 + number.length * 29 + 35;
    if (y + height > 1420) startPage();
    const top = y;
    ctx.fillStyle = color("ink"); font(25, true);
    for (const line of bank) { ctx.fillText(line, 92, y); y += 32; }
    ctx.fillStyle = color("muted"); font(22);
    for (const line of number) { ctx.fillText(line, 92, y); y += 29; }
    font(24); ctx.fillStyle = color("ink");
    ctx.fillText(contract.valor_parcela === null ? "—" : formatBRL(contract.valor_parcela), 700, top);
    ctx.textAlign = "right"; font(25, true); ctx.fillText(formatBRL(contract.valor_troco), 1148, top); ctx.textAlign = "left";
    y = top + height;
    ctx.strokeStyle = color("border"); ctx.beginPath(); ctx.moveTo(72, y - 18); ctx.lineTo(1168, y - 18); ctx.stroke();
  }
  if (y + 180 > 1530) startPage();
  y += 20;
  ctx.fillStyle = color("band"); ctx.fillRect(72, y, 1096, 128);
  ctx.fillStyle = color("muted"); font(23); ctx.fillText(`${report.contracts.length} contratos para portar`, 96, y + 38);
  ctx.fillStyle = color("accent"); font(30, true); ctx.fillText("TOTAL DOS TROCOS", 96, y + 91);
  ctx.textAlign = "right"; font(38, true); ctx.fillText(formatBRL(report.totalTroco), 1144, y + 91); ctx.textAlign = "left";
  for (const [index, page] of pages.entries()) {
    const context = page.getContext("2d");
    if (!context) continue;
    context.fillStyle = color("muted"); context.font = "22px Arial, sans-serif";
    context.fillText("Trocos brutos, antes do desconto de RPS.", 72, 1620);
    context.fillText("Valores sujeitos à aprovação do banco.", 72, 1653);
    context.textAlign = "right"; context.fillText(`${index + 1} / ${pages.length}`, 1168, 1653);
  }
  return pages;
}

export async function downloadPortabilityReport(group: PortabilityGroup, format: "jpg" | "pdf") {
  const pages = await createPortabilityReportPages(group);
  const filename = `portabilidade-${group.client.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() || "cliente"}`;
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setProperties({ title: `Portabilidade - ${group.client.nome}`, author: "CRM-OSC - CONSIG" });
    pages.forEach((page, index) => {
      if (index > 0) pdf.addPage();
      pdf.addImage(page.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
    });
    pdf.save(`${filename}.pdf`);
  } else {
    for (const [index, page] of pages.entries()) {
      const link = document.createElement("a");
      link.href = page.toDataURL("image/jpeg", 0.95);
      link.download = `${filename}${pages.length > 1 ? `-${index + 1}` : ""}.jpg`;
      link.click();
    }
  }
}