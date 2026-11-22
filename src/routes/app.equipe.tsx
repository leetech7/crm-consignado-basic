import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/equipe")({
  head: () => ({ meta: [
    { title: "Equipe — CRM-OSC - CONSIG" },
    { name: "description", content: "Gestão dos membros da equipe de vendas." },
    { property: "og:title", content: "Equipe — CRM-OSC - CONSIG" },
    { property: "og:description", content: "Gestão dos membros da equipe de vendas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EquipePage,
});

interface Member {
  id: string;
  full_name: string;
  email: string;
  commission_rate: number;
  roles: AppRole[];
  referenceAccess: boolean;
}

function EquipePage() {
  const { isAdmin, loading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [savingAccess, setSavingAccess] = useState<string | null>(null);

  const load = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const { data: approvals, error: approvalError } = await supabase.from("team_reference_access").select("user_id");
    if (approvalError) {
      toast.error("Não foi possível carregar as permissões de comunicados e fatores.");
      return;
    }
    const merged = (profiles ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      referenceAccess: (approvals ?? []).some((a) => a.user_id === p.id),
    }));
    setMembers(merged as Member[]);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!isAdmin) return <Navigate to="/app/dashboard" />;

  const updateRate = async (id: string, rate: number) => {
    const { error } = await supabase.from("profiles").update({ commission_rate: rate }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comissão atualizada");
    load();
  };

  const setRole = async (userId: string, role: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Função atualizada");
    load();
  };

  const setReferenceAccess = async (member: Member) => {
    setSavingAccess(member.id);
    try {
      const { error } = member.referenceAccess
        ? await supabase.from("team_reference_access").delete().eq("user_id", member.id)
        : await supabase.from("team_reference_access").insert({ user_id: member.id });
      if (error) {
        toast.error("Não foi possível alterar o acesso. Tente novamente.");
        return;
      }
      toast.success(member.referenceAccess ? "Acesso revogado" : "Acesso aprovado");
      await load();
    } finally {
      setSavingAccess(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Equipe</h1>
        <p className="text-sm text-muted-foreground">Gerencie funções e taxas de comissão</p>
        <p className="mt-2 text-sm text-muted-foreground">Novos vendedores precisam de aprovação para consultar comunicados e fatores. Administradores e gerentes têm acesso pela função. Esta permissão não altera o acesso às demais telas.</p>
      </div>

      <Card className="overflow-hidden" style={{ background: "var(--gradient-card)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Função</th>
                <th className="px-4 py-3 text-left">Comissão (%)</th>
                <th className="px-4 py-3 text-left">Acesso a comunicados e fatores</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.full_name || "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={m.roles[0] ?? "vendedor"} onValueChange={(v) => setRole(m.id, v as AppRole)}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        defaultValue={m.commission_rate}
                        className="w-24"
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== Number(m.commission_rate)) updateRate(m.id, v);
                        }}
                      />
                      <Badge variant="outline">%</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.roles.some((role) => role === "admin" || role === "gerente") ? (
                      <Badge variant="outline">Permitido pela função</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{m.referenceAccess ? "Aprovado" : "Não aprovado"}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingAccess !== null}
                          aria-label={`${m.referenceAccess ? "Revogar" : "Aprovar"} acesso a comunicados e fatores de ${m.full_name || "usuário"}`}
                          onClick={() => setReferenceAccess(m)}
                        >
                          {savingAccess === m.id ? "Salvando..." : m.referenceAccess ? "Revogar" : "Aprovar"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
