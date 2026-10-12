import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import type { Database } from "@/integrations/supabase/types";

export interface ExtractedContract {
  banco: string | null;
  numero_contrato: string | null;
  valor_parcela: number | null;
  prazo_total: number | null;
  parcelas_pagas: number | null;
  parcelas_restantes: number | null;
  saldo_devedor: number | null;
  data_inicio: string | null;
}

export interface ExtractResult {
  analysisId: string | null;
  data: ExtractedData;
}

export interface ExtractedData {
  nome: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  orgao: string | null;
  margem_disponivel: number | null;
  margem_rcc: number | null;
  margem_rmc: number | null;
  contratos: ExtractedContract[];
  observacao: string | null;
}

const ORGAOS = ["SIAPE", "CLT", "INSS", "MARINHA", "EXÉRCITO", "AERONÁUTICA", "PREFEITURA RJ", "PREFEITURA (OUTRAS)", "GOVERNO RJ", "GOVERNO (OUTROS)"];

const num = { type: ["number", "null"] };
const str = { type: ["string", "null"] };
const int = { type: ["integer", "null"] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nome", "cpf", "data_nascimento", "orgao", "margem_disponivel", "margem_rcc", "margem_rmc", "contratos", "observacao"],
  properties: {
    nome: str,
    cpf: str,
    data_nascimento: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
    orgao: { type: ["string", "null"], enum: [...ORGAOS, null] },
    margem_disponivel: num,
    margem_rcc: num,
    margem_rmc: num,
    observacao: str,
    contratos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["banco", "numero_contrato", "valor_parcela", "prazo_total", "parcelas_pagas", "parcelas_restantes", "saldo_devedor", "data_inicio"],
        properties: {
          banco: str,
          numero_contrato: str,
          valor_parcela: num,
          prazo_total: int,
          parcelas_pagas: int,
          parcelas_restantes: int,
          saldo_devedor: num,
          data_inicio: { type: ["string", "null"], description: "Formato YYYY-MM-DD" },
        },
      },
    },
  },
};

const INSTRUCTIONS = `Você é um analista de crédito consignado brasileiro. Leia o documento (extrato de consignações, histórico de empréstimos do INSS, contracheque, etc.) e extraia os dados do titular.
Regras:
- Use null quando o dado não estiver no documento. Nunca invente.
- CPF apenas com 11 dígitos, sem pontuação.
- Datas no formato YYYY-MM-DD.
- Valores em reais como número (ex.: 1234.56). Margens podem ser negativas.
- margem_disponivel = margem consignável de empréstimo disponível; margem_rcc = margem de cartão benefício (RCC); margem_rmc = margem de cartão consignado (RMC).
- orgao: escolha o mais adequado da lista ou null.
- contratos: apenas empréstimos consignados ATIVOS/vigentes (ignore excluídos/encerrados). Calcule parcelas_restantes = prazo_total - parcelas_pagas quando possível. saldo_devedor: use o valor do documento ou estime como valor_parcela × parcelas_restantes.
- observacao: uma frase curta com qualquer alerta relevante (ou null).`;

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

type ExtractCtx = {
  supabase: SupabaseClient<Database>;
  userId: string;
  clientId: string | null;
  attachmentId: string | null;
  fileName: string;
  mime: string;
  storagePath: string;
};

// Lê o documento com IA e extrai os dados. clientId/attachmentId nulos = leitura
// de arquivo pendente (cliente ainda não salvo): nada é registrado em client_ai_analyses.
async function runExtraction(ctx: ExtractCtx): Promise<ExtractResult> {
  const { supabase, userId, clientId, attachmentId, fileName } = ctx;
  let analysisId: string | null = null;
  if (clientId && attachmentId) {
    const { data: analysis, error: aErr } = await supabase
      .from("client_ai_analyses")
      .insert({ client_id: clientId, attachment_id: attachmentId, user_id: userId, file_name: fileName, status: "processando" })
      .select("id")
      .single();
    if (aErr || !analysis) throw new Error("Não foi possível registrar a leitura.");
    analysisId = analysis.id;
  }
  const fail = async (msg: string): Promise<never> => {
    if (analysisId) await supabase.from("client_ai_analyses").update({ status: "erro", erro: msg }).eq("id", analysisId);
    throw new Error(msg);
  };

  const mime = ctx.mime || (fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (mime !== "application/pdf" && !mime.startsWith("image/")) {
    return fail("Só é possível ler PDF ou imagem.");
  }

  const { data: blob, error: dlErr } = await supabase.storage.from("client-attachments").download(ctx.storagePath);
  if (dlErr || !blob) return fail("Não foi possível abrir o arquivo.");
  const b64 = toBase64(await blob.arrayBuffer());
  const dataUrl = `data:${mime};base64,${b64}`;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return fail("IA não configurada.");

  const filePart = mime === "application/pdf"
    ? { type: "input_file", filename: fileName, file_data: dataUrl }
    : { type: "input_image", image_url: dataUrl };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content: [filePart, { type: "input_text", text: "Extraia os dados deste documento." }] }],
      reasoning: { effort: "low" },
      store: false,
      stream: true,
      text: { format: { type: "json_schema", name: "extrato", strict: true, schema: SCHEMA } },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error(`AI gateway [${res.status}]: ${body}`);
    if (res.status === 402) return fail("Créditos de IA esgotados. Adicione créditos no workspace.");
    if (res.status === 429) return fail("Muitas solicitações. Aguarde um instante e tente de novo.");
    if (res.status === 403) return fail("Acesso à IA bloqueado para este workspace.");
    return fail(`Falha na leitura pela IA (${res.status}).`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let failure: string | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
        else if (ev.type === "response.refusal.delta") failure = "A IA recusou ler este documento.";
        else if (ev.type === "response.failed" || ev.type === "error") {
          failure = ev.response?.error?.message || ev.message || "Falha na leitura pela IA.";
        }
      } catch { /* ignore */ }
    }
  }
  if (failure) return fail(failure);
  try {
    const parsed = JSON.parse(text) as ExtractedData;
    parsed.contratos = parsed.contratos ?? [];
    if (analysisId) await supabase.from("client_ai_analyses").update({ status: "lido" }).eq("id", analysisId);
    return { analysisId, data: parsed };
  } catch {
    return fail("A IA não retornou dados legíveis deste documento.");
  }
}

export const extractFromAttachment = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: { attachmentId: string }) => {
    if (!input?.attachmentId || typeof input.attachmentId !== "string") throw new Error("Anexo inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<ExtractResult> => {
    const { supabase, userId } = context;
    const { data: att, error } = await supabase
      .from("client_attachments")
      .select("storage_path, file_name, mime_type, client_id")
      .eq("id", data.attachmentId)
      .maybeSingle();
    if (error || !att) throw new Error("Anexo não encontrado ou sem permissão.");
    return runExtraction({
      supabase,
      userId,
      clientId: att.client_id,
      attachmentId: data.attachmentId,
      fileName: att.file_name,
      mime: att.mime_type ?? "",
      storagePath: att.storage_path,
    });
  });

// Leitura de arquivo enviado antes de salvar o cliente (caminho pending/{userId}/...)
export const extractFromUpload = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .validator((input: { path: string; fileName: string; mimeType?: string | null }) => {
    if (!input?.path || typeof input.path !== "string") throw new Error("Arquivo inválido");
    if (!input?.fileName || typeof input.fileName !== "string") throw new Error("Arquivo inválido");
    return input;
  })
  .handler(async ({ data, context }): Promise<ExtractResult> => {
    const { supabase, userId } = context;
    const prefix = `pending/${userId}/`;
    if (!data.path.startsWith(prefix) || data.path.split("/").some((p) => p === "..")) {
      throw new Error("Arquivo não autorizado.");
    }
    return runExtraction({
      supabase,
      userId,
      clientId: null,
      attachmentId: null,
      fileName: data.fileName,
      mime: data.mimeType ?? "",
      storagePath: data.path,
    });
  });
