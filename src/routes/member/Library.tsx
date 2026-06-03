import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { PROTOCOLS, PROTOCOL_LABELS, PROTOCOL_DESCRIPTIONS, PROTOCOL_COLORS } from "../../lib/protocols";
import type { Protocol } from "../../lib/database.types";
import { Icon } from "../../components/Icon";

export default function Library() {
  const counts = useQuery({
    queryKey: ["library", "counts"],
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("protocol");
      const map: Record<Protocol, number> = { frontline: 0, backline: 0, rotation: 0, lateral: 0, recovery: 0 };
      for (const row of data ?? []) map[row.protocol as Protocol]++;
      return map;
    },
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow mb-1">Unlock Motion</div>
        <h1 className="h-display h2 text-ink-900">Library</h1>
        <p className="muted text-sm mt-1">Alle oefeningen — bekijk wanneer en wat je wilt.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {PROTOCOLS.map((p) => {
          const c = PROTOCOL_COLORS[p];
          return (
            <Link key={p} to={`/app/library/${p}`} className="card p-5 flex flex-col gap-2 hover:shadow-card transition">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
                  {PROTOCOL_LABELS[p]}
                </span>
                <span className="text-xs muted">{counts.data?.[p] ?? 0} oefeningen</span>
              </div>
              <h2 className="text-lg font-semibold text-ink-900">{PROTOCOL_LABELS[p]}</h2>
              <p className="text-sm muted">{PROTOCOL_DESCRIPTIONS[p]}</p>
              <div className="mt-2 flex items-center gap-1 text-teal text-sm font-medium">
                Bekijken <Icon name="play" size={12} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
