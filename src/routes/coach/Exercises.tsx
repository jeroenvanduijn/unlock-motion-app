import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import { PROTOCOLS, PROTOCOL_LABELS } from "../../lib/protocols";
import { ProtocolBadge } from "../../components/ProtocolBadge";
import type { Exercise, Protocol } from "../../lib/database.types";

export default function Exercises() {
  const q = useQuery({
    queryKey: ["coach", "exercises"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .order("protocol")
        .order("hierarchy_level");
      return (data ?? []) as Exercise[];
    },
  });

  const grouped: Record<Protocol, Exercise[]> = {} as Record<Protocol, Exercise[]>;
  for (const p of PROTOCOLS) grouped[p] = [];
  for (const e of q.data ?? []) grouped[e.protocol].push(e);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Library</div>
          <h1 className="h-display h2 text-ink-900">Oefeningen</h1>
        </div>
        <Link to="/coach/exercises/new" className="btn-primary btn-sm">
          <Icon name="plus" size={14} /> Nieuw
        </Link>
      </header>

      {PROTOCOLS.map((p) => (
        <section key={p} className="space-y-2">
          <div className="flex items-center gap-3">
            <ProtocolBadge protocol={p} />
            <h2 className="text-sm uppercase tracking-wide text-ink-500">{PROTOCOL_LABELS[p]}</h2>
            <span className="text-xs muted">({grouped[p].length})</span>
          </div>
          {grouped[p].length === 0 && (
            <p className="text-sm muted px-1">Nog geen oefeningen — voeg er een toe.</p>
          )}
          <div className="space-y-1.5">
            {grouped[p].map((ex) => (
              <Link key={ex.id} to={`/coach/exercises/${ex.id}`} className="card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-ink-50 text-ink-700 flex items-center justify-center text-xs font-semibold">
                    {ex.hierarchy_level}
                  </span>
                  <span className="font-medium text-ink-900">{ex.title}</span>
                  {ex.bunny_video_id && <Icon name="video" size={14} />}
                </div>
                <Icon name="edit" size={14} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
