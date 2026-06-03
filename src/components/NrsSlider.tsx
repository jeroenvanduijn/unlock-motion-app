import { useState } from "react";

export function NrsSlider({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const [local, setLocal] = useState(value ?? 5);
  const current = value ?? local;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-ink-700">{label}</label>
        <span className="text-2xl font-display font-semibold text-teal">{current}</span>
      </div>
      {hint && <p className="text-xs muted">{hint}</p>}
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={current}
        onChange={(e) => {
          const v = Number(e.target.value);
          setLocal(v);
          onChange(v);
        }}
        className="w-full accent-teal"
      />
      <div className="flex justify-between text-[10px] muted px-1">
        <span>1</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
