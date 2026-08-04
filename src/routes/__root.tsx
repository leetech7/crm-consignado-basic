import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CRM-OSC - CONSIG" },
      { name: "description", content: "CRM SaaS para equipes de vendas de crédito consignado." },
      { property: "og:title", content: "CRM-OSC - CONSIG" },
      { name: "twitter:title", content: "CRM-OSC - CONSIG" },
      { property: "og:description", content: "CRM SaaS para equipes de vendas de crédito consignado." },
      { name: "twitter:description", content: "CRM SaaS para equipes de vendas de crédito consignado." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1fa9a16b-f486-4220-9bd1-88a99da304ba/id-preview-3c5da1fe--2826a3ca-55aa-4d94-85e6-1317d59f8cb2.lovable.app-1777685950975.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1fa9a16b-f486-4220-9bd1-88a99da304ba/id-preview-3c5da1fe--2826a3ca-55aa-4d94-85e6-1317d59f8cb2.lovable.app-1777685950975.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],

  }),
  shellComponent: RootShell,
  component: () => (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">Voltar ao início</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
