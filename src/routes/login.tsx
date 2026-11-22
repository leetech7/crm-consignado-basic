import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Entrar — CRM-OSC - CONSIG" },
    { name: "description", content: "Acesso seguro ao CRM de crédito consignado." },
    { property: "og:title", content: "Entrar — CRM-OSC - CONSIG" },
    { property: "og:description", content: "Acesso seguro ao CRM de crédito consignado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app/clientes" });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Bem-vindo de volta!");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4" style={{ backgroundImage: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex min-w-0 items-center justify-center gap-2 sm:mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="truncate text-lg font-bold sm:text-xl">CRM-OSC - CONSIG</span>
        </Link>

        <Card className="border-border/60 p-4 sm:p-6" style={{ background: "var(--gradient-card)", boxShadow: "var(--shadow-card)" }}>
          <h1 className="mb-4 text-center text-lg font-semibold">Entrar</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={busy} className="w-full font-semibold" style={{ background: "var(--gradient-primary)" }}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
              <p className="mt-4 text-center text-xs text-muted-foreground">Acesso somente por convite do administrador.</p>

        </Card>
      </div>
    </div>
  );
}
