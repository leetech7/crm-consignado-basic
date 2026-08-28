# Plano: Abrir o CRM no celular (PWA instalável)

## Objetivo
Permitir abrir o CRM-OSC - CONSIG no celular de forma fácil: como um app instalado na tela inicial, sem precisar baixar nada da loja de aplicativos.

## Como vai funcionar para você
1. Você publica o app no Lovable (botão **Publish** — gera o link `ocrm-consig.lovable.app`).
2. No celular, abre esse link no navegador (Chrome no Android ou Safari no iPhone).
3. Toca em **"Adicionar à tela inicial"** — o CRM vira um ícone na tela do celular.
4. Ao abrir pelo ícone, ele roda em **tela cheia, como um app nativo**, sem barra de navegador.

## O que será implementado (PWA)
- **Web App Manifest** (`manifest.webmanifest`): nome "CRM-OSC - CONSIG", cores do tema, modo `standalone` (tela cheia), orientação retrato.
- **Ícones do app**: gerar ícone 512x512 e 192x192 a partir do favicon atual, para a tela inicial do celular e splash screen.
- **Meta tags no `__root.tsx`**: `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon` (necessário para iPhone).
- **Link do manifest** no head da rota raiz.

## Fora de escopo (por enquanto)
- Service worker / modo offline (o app continuará precisando de internet, como hoje).
- Push notifications nativas.
- Publicação em Play Store / App Store (não é necessário para esse fluxo).

## Observação sobre custos
Publicar e usar pelo link `*.lovable.app` não exige mensalidade para acessar pelo celular — o PWA é só uma camada de instalação no navegador, sem custo extra.

## Verificação
- Build OK.
- Teste via Playwright confirmando que o manifest e as meta tags são servidos corretamente.
