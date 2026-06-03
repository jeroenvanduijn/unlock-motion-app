import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import { PROTOCOL_LABELS, PROTOCOL_DESCRIPTIONS, PROTOCOLS } from "../../lib/protocols";
import type { Exercise, Protocol } from "../../lib/database.types";

export default function Track() {
  const { protocol } = useParams<{ protocol: string }>();
  const valid = PROTOCOLS.includes(protocol as Protocol);
  const p = protocol as Protocol;

  const q = useQuery({
    queryKey: ["track", p],
    enabled: valid,
    queryFn: async () => {
      const { data } = await supabase
        .from("exercises")
        .select("*")
        .eq("protocol", p)
        .order("hierarchy_level");
      return (data ?? []) as Exercise[];
    },
  });

  if (!valid) return <p className="muted">Onbekend protocol.</p>;
  const list = q.data ?? [];

  return (
    <div className="space-y-5">
      <Link to="/app/library" className="btn-ghost btn-sm w-fit">← Library</Link>
      <header>
        <div className="eyebrow mb-1">{PROTOCOL_DESCRIPTIONS[p]}</div>
        <h1 className="h-display h2 text-ink-900">{PROTOCOL_LABELS[p]}</h1>
      </header>

      {list.length === 0 && !q.isLoading && (
        <p className="muted text-sm">Nog geen oefeningen in deze track.</p>
      )}
      <div className="space-y-2">
        {list.map((ex) => (
          <Link key={ex.id} to={`/app/oefening/${ex.id}`} className="card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-ink-50 text-ink-700 flex items-center justify-center text-xs font-semibold">
                {ex.hierarchy_level}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-ink-900 truncate">{ex.title}</div>
                {ex.description && <div className="text-xs muted truncate">{ex.description.slice(0, 60)}</div>}
              </div>
            </div>
            <Icon name="play" size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}
