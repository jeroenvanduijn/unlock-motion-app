import { PROTOCOL_LABELS, PROTOCOL_COLORS } from "../lib/protocols";
import type { Protocol } from "../lib/database.types";

export function ProtocolBadge({ protocol, level }: { protocol: Protocol; level?: number }) {
  const c = PROTOCOL_COLORS[protocol];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      <span>{PROTOCOL_LABELS[protocol]}</span>
      {typeof level === "number" && (
        <span className="opacity-70">· L{level}</span>
      )}
    </span>
  );
}
