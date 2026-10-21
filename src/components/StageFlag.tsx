import { stageColor, stageLabel, type PipelineStage } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

export function StageFlag({ stage, active = true, className }: { stage: PipelineStage; active?: boolean; className?: string }) {
  const color = stageColor(stage);
  return (
    <span
      className={cn("inline-flex h-6 items-center whitespace-nowrap pl-2 pr-4 text-[10px] font-bold uppercase tracking-wide", className)}
      style={{
        clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%)",
        backgroundColor: active ? color : `color-mix(in oklab, ${color} 18%, transparent)`,
        color: active ? "var(--background)" : color,
      }}
    >
      {stageLabel(stage)}
    </span>
  );
}
