import { useEffect, useRef } from "react";

export interface Burst {
  id: string;
  x: number;
  y: number;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const PALETTE = [
  "#ffd166",
  "#ef476f",
  "#06d6a0",
  "#118ab2",
  "#f78c6b",
  "#c77dff",
  "#ffffff",
];

/** Canvas overlay that renders firework particle bursts. */
export function FireworksBurst({ bursts }: { bursts: Burst[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  // Spawn particles for new bursts
  useEffect(() => {
    for (const b of bursts) {
      if (seenRef.current.has(b.id)) continue;
      seenRef.current.add(b.id);
      const count = 90;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.5 + Math.random() * 5.5;
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 55 + Math.random() * 45,
          color: Math.random() < 0.25 && b.color ? b.color : PALETTE[Math.floor(Math.random() * PALETTE.length)],
          size: 1.5 + Math.random() * 2.5,
        });
      }
    }
  }, [bursts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const ps = particlesRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += 1;
        p.vy += 0.055; // gravity
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        const t = p.life / p.maxLife;
        if (t >= 1) {
          ps.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-30" />;
}
