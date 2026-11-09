import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange?: (v: string) => void;
  kind: "brl" | "pct";
  allowNegative?: boolean;
  readOnly?: boolean;
  className?: string;
  title?: string;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Campo numérico com máscara: R$ 1.234,56 ou 12,34 %. Dígitos entram pela direita. */
export function MaskedNumberInput({ value, onChange, kind, allowNegative, readOnly, className, title }: Props) {
  const n = value === "" || value == null ? null : parseFloat(value);
  const display = n == null || Number.isNaN(n) ? "" : kind === "brl" ? `R$ ${fmt(n)}` : `${fmt(n)} %`;
  return (
    <Input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      className={className}
      title={title}
      value={display}
      placeholder={kind === "brl" ? "R$ 0,00" : "0,00 %"}
      onChange={(e) => {
        if (!onChange) return;
        const raw = e.target.value;
        const neg = allowNegative && raw.includes("-");
        const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
        if (!digits) { onChange(neg ? "-0.00" : ""); return; }
        const v = parseInt(digits, 10) / 100;
        onChange((neg ? -v : v).toFixed(2));
      }}
      onFocus={(e) => { const el = e.currentTarget; requestAnimationFrame(() => { const p = kind === "pct" ? el.value.length - 2 : el.value.length; el.setSelectionRange(p, p); }); }}
    />
  );
}
