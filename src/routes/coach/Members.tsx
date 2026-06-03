import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import type { Profile } from "../../lib/database.types";

export default function Members() {
  const q = useQuery({
    queryKey: ["coach", "members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "member")
        .order("full_name", { nullsFirst: false });
      return (data ?? []) as Profile[];
    },
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow mb-1">Coach</div>
        <h1 className="h-display h2 text-ink-900">Leden</h1>
      </header>

      <div className="space-y-2">
        {q.data?.length === 0 && <p className="muted text-sm">Nog geen leden — provisioning vanuit GymOps komt automatisch zodra een SportBit-abonnement Unlock wordt geactiveerd.</p>}
        {q.data?.map((m) => {
          const start = m.program_start_date ? new Date(m.program_start_date) : null;
          const weeks = start ? Math.floor((Date.now() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) : null;
          return (
            <Link key={m.id} to={`/coach/leden/${m.id}`} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-tint text-teal-ink flex items-center justify-center font-semibold">
                  {(m.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-ink-900">{m.full_name ?? "Onbekend"}</div>
                  <div className="text-xs muted">
                    {weeks !== null ? `Week ${weeks + 1}` : "Geen startdatum"}
                    {m.checkin_cadence === "daily" && " · dagelijkse check-in"}
                  </div>
                </div>
              </div>
              <Icon name="user" size={16} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
