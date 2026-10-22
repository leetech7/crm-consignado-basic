import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Início — CRM-OSC - CONSIG" },
    { name: "description", content: "Acesse seu CRM de crédito consignado." },
    { property: "og:title", content: "Início — CRM-OSC - CONSIG" },
    { property: "og:description", content: "Acesse seu CRM de crédito consignado." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  return <Navigate to={user ? "/app/dashboard" : "/login"} />;
}
