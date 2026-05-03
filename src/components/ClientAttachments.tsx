import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Upload, FileText, Download, Trash2, Loader2, CalendarIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
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
const PAGE_SIZES = [5, 10, 25];

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

  // Filters
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  useEffect(() => { setPage(1); }, [filterCategoria, dateFrom, dateTo, pageSize]);

  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom.setHours(0, 0, 0, 0)).getTime() : null;
    const toTs = dateTo ? new Date(dateTo.setHours(23, 59, 59, 999)).getTime() : null;
    return items.filter((a) => {
      if (filterCategoria !== "all" && a.categoria !== filterCategoria) return false;
      const ts = new Date(a.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [items, filterCategoria, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize]
  );

  const hasFilters = filterCategoria !== "all" || dateFrom || dateTo;
  const clearFilters = () => { setFilterCategoria("all"); setDateFrom(undefined); setDateTo(undefined); };

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

  const startIdx = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, filtered.length);

  return (
    <div className="space-y-3">
      {/* Upload */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onFile} />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} variant="outline">
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Enviando..." : "Anexar arquivo"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF ou imagem, até {MAX_MB}MB</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-muted/20 p-2 sm:flex-row sm:items-center sm:flex-wrap">
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal sm:w-44", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("justify-start text-left font-normal sm:w-44", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />Limpar
          </Button>
        )}
      </div>

      {/* List */}
      <div className="rounded-md border border-border/50">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : paginated.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {items.length === 0 ? "Nenhum arquivo anexado" : "Nenhum arquivo nos filtros"}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {paginated.map((a) => (
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

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/50 p-2 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>{startIdx}-{endIdx} de {filtered.length}</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-16"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground">Página {currentPage}/{totalPages}</span>
              <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
