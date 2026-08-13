import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRL, stageColor, stageLabel, type Client, type PipelineStage } from "@/lib/pipeline";

export interface BubbleFieldHandle {
  popAt: (id: string) => { x: number; y: number } | null;
}

const SIZE_BY_STAGE: Record<string, number> = {
  novo: 62,
  frio: 58,
  descartado: 50,
  quente: 88,
  em_negociacao: 92,
  remarketing: 80,
  digitado: 130,
  aguardando_link: 130,
  pago: 130,
};

const COLOR_BY_STAGE: Record<string, string> = {
  novo: "oklch(0.62 0.03 250)",
  frio: "oklch(0.6 0.03 245)",
  descartado: "oklch(0.5 0.02 250)",
  quente: "oklch(0.78 0.16 70)",
  em_negociacao: "oklch(0.8 0.16 85)",
  remarketing: "oklch(0.7 0.15 320)",
  digitado: "oklch(0.7 0.18 300)",
  aguardando_link: "oklch(0.72 0.15 200)",
  pago: "oklch(0.74 0.18 158)",
};

export const bubbleColor = (s: PipelineStage) => COLOR_BY_STAGE[s] ?? stageColor(s);

const firstName = (n: string) => (n || "").trim().split(/\s+/)[0] ?? "";

interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

interface Props {
  clients: Client[];
  onOpen: (c: Client) => void;
  onPop: (c: Client, point: { x: number; y: number }) => void;
  popping: Set<string>;
}

export function BubbleField({ clients, onOpen, onPop, popping }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const bodiesRef = useRef<Map<string, Body>>(new Map());
  const hoveredRef = useRef<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = useRef(false);

  const sized = useMemo(() => {
    const values = clients.map((c) => Number(c.valor_bruto ?? 0));
    const max = Math.max(1, ...values);
    return clients.map((c) => {
      const base = SIZE_BY_STAGE[c.stage] ?? 70;
      const scale = 1 + 0.35 * Math.sqrt(Math.max(0, Number(c.valor_bruto ?? 0)) / max);
      return { client: c, r: Math.round((base * scale) / 2) };
    });
  }, [clients]);

  useEffect(() => {
    reduced.current = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Sync bodies with clients
  useEffect(() => {
    const el = containerRef.current;
    const w = el?.clientWidth ?? 800;
    const h = el?.clientHeight ?? 600;
    const map = bodiesRef.current;
    const ids = new Set(sized.map((s) => s.client.id));
    for (const id of Array.from(map.keys())) if (!ids.has(id)) map.delete(id);
    sized.forEach(({ client, r }, i) => {
      const existing = map.get(client.id);
      if (existing) {
        existing.r = r;
        return;
      }
      map.set(client.id, {
        id: client.id,
        x: r + Math.random() * Math.max(1, w - 2 * r),
        y: r + Math.random() * Math.max(1, h - 2 * r),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r,
        phase: i * 0.7,
      });
    });
  }, [sized]);

  // Animation loop
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const step = () => {
      const el = containerRef.current;
      if (el) {
        const w = el.clientWidth;
        const h = el.clientHeight;
        t += 1;
        const bodies = Array.from(bodiesRef.current.values());
        for (const b of bodies) {
          if (!reduced.current && hoveredRef.current !== b.id) {
            b.x += b.vx;
            b.y += b.vy + Math.sin((t + b.phase * 40) / 90) * 0.18;
            if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
            if (b.x + b.r > w) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
            if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }
            if (b.y + b.r > h) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }
          }
          const node = nodesRef.current.get(b.id);
          if (node) {
            node.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
            node.style.width = `${b.r * 2}px`;
            node.style.height = `${b.r * 2}px`;
          }
        }
        // simple separation
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i], c = bodies[j];
            const dx = c.x - a.x, dy = c.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.01;
            const min = a.r + c.r;
            if (dist < min) {
              const push = (min - dist) / dist * 0.12;
              a.x -= dx * push; a.y -= dy * push;
              c.x += dx * push; c.y += dy * push;
            }
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePop = (c: Client) => {
    const b = bodiesRef.current.get(c.id);
    const point = b ? { x: b.x, y: b.y } : { x: 0, y: 0 };
    onPop(c, point);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-border"
      style={{ background: "var(--gradient-card)" }}
    >
      {sized.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Nenhum lead ativo para exibir
        </div>
      )}
      {sized.map(({ client, r }) => {
        const color = bubbleColor(client.stage);
        const isPopping = popping.has(client.id);
        const isHover = hovered === client.id;
        return (
          <div
            key={client.id}
            ref={(n) => {
              if (n) nodesRef.current.set(client.id, n);
              else nodesRef.current.delete(client.id);
            }}
            onMouseEnter={() => { hoveredRef.current = client.id; setHovered(client.id); }}
            onMouseLeave={() => { hoveredRef.current = null; setHovered((h) => (h === client.id ? null : h)); }}
            onClick={() => onOpen(client)}
            onDoubleClick={(e) => { e.stopPropagation(); handlePop(client); }}
            title={`${client.nome} • ${stageLabel(client.stage)} — clique para abrir, duplo clique para marcar como PAGO`}
            className={`absolute left-0 top-0 z-10 flex cursor-pointer select-none flex-col items-center justify-center rounded-full text-center transition-[opacity,filter] ${
              isPopping ? "bubble-pop" : "bubble-float"
            }`}
            style={{
              width: r * 2,
              height: r * 2,
              background: `radial-gradient(circle at 32% 28%, color-mix(in oklab, ${color} 85%, white 25%), color-mix(in oklab, ${color} 70%, transparent))`,
              border: `1px solid color-mix(in oklab, ${color} 70%, transparent)`,
              boxShadow: `0 0 ${isHover ? 34 : 18}px color-mix(in oklab, ${color} 45%, transparent), inset 0 -6px 14px color-mix(in oklab, black 25%, transparent)`,
              zIndex: isHover ? 20 : 10,
            }}
          >
            <span className="px-2 text-[11px] font-semibold leading-tight text-white drop-shadow sm:text-xs">
              {firstName(client.nome)}
            </span>
            {r > 34 && (
              <span className="px-2 text-[10px] font-mono text-white/85">
                {formatBRL(Number(client.valor_bruto ?? 0))}
              </span>
            )}
            {isHover && (
              <div className="pointer-events-none absolute -bottom-2 left-1/2 z-40 w-48 -translate-x-1/2 translate-y-full rounded-lg border border-border bg-popover p-2 text-left text-[11px] shadow-lg">
                <div className="truncate font-semibold text-popover-foreground">{client.nome}</div>
                <div className="text-muted-foreground">{stageLabel(client.stage)}</div>
                {client.cpf && <div className="text-muted-foreground">{client.cpf}</div>}
                {client.orgao && <div className="text-muted-foreground">{client.orgao}</div>}
                <div className="font-mono text-primary">{formatBRL(Number(client.valor_bruto ?? 0))}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
