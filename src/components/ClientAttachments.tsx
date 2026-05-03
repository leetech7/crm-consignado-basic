import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Attachment {
  id: string;
  client_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  categoria: string;
  created_at: string;
}

const CATEGORIAS = [
  { id: "extrato", label: "Extrato de consignações" },
  { id: "contracheque", label: "Contracheque" },
  { id: "documento", label: "Documento pessoal" },
  { id: "contrato", label: "Contrato" },
  { id: "outro", label: "Outro" },
];

const BUCKET = "client-attachments";
const MAX_MB = 10;

function fmtSize(b: number | null) {
  if (!b) return "-";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function ClientAttachments({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState("extrato");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_attachments")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Attachment[]);
    setLoading(false);
  };

  useEffect(() => {
    if (clientId) load();
  }, [clientId]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      return toast.error(`Arquivo maior que ${MAX_MB}MB`);
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${clientId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { error: insErr } = await supabase.from("client_attachments").insert({
      client_id: clientId,
      uploaded_by: user.id,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      categoria,
    });
    setUploading(false);
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      return toast.error(insErr.message);
    }
    toast.success("Arquivo enviado");
    load();
  };

  const download = async (a: Attachment) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Erro ao gerar link");
    window.open(data.signedUrl, "_blank");
  };

  const remove = async (a: Attachment) => {
    if (!confirm(`Excluir "${a.file_name}"?`)) return;
    const { error: dbErr } = await supabase.from("client_attachments").delete().eq("id", a.id);
    if (dbErr) return toast.error(dbErr.message);
    await supabase.storage.from(BUCKET).remove([a.storage_path]);
    toast.success("Arquivo removido");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={onFile}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          variant="outline"
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Enviando..." : "Anexar arquivo"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF ou imagem, até {MAX_MB}MB</span>
      </div>

      <div className="rounded-md border border-border/50">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Nenhum arquivo anexado</div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.file_name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORIAS.find((c) => c.id === a.categoria)?.label ?? a.categoria}
                    </Badge>
                    <span>{fmtSize(a.size_bytes)}</span>
                    <span>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => download(a)} title="Baixar">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(a)} title="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
