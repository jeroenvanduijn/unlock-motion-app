import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import type { EvaluationSlot, Evaluation } from "../../lib/database.types";

export default function EvaluationBook() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const slots = useQuery({
    queryKey: ["slots", "open"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data: openSlots } = await supabase
        .from("evaluation_slots")
        .select("*")
        .eq("is_published", true)
        .gte("starts_at", nowIso)
        .order("starts_at");
      const { data: booked } = await supabase
        .from("evaluation_bookings")
        .select("slot_id");
      const bookedIds = new Set((booked ?? []).map((b) => b.slot_id));
      return ((openSlots ?? []) as EvaluationSlot[]).filter((s) => !bookedIds.has(s.id));
    },
  });

  const myBookings = useQuery({
    queryKey: ["my-bookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluation_bookings")
        .select("id, slot_id, booked_at, evaluation_slots(starts_at, ends_at)")
        .eq("member_id", userId!)
        .order("booked_at", { ascending: false });
      return (data ?? []) as unknown as Array<{ id: string; slot_id: string; booked_at: string; evaluation_slots: { starts_at: string; ends_at: string } | null }>;
    },
  });

  const myPublishedEvals = useQuery({
    queryKey: ["my-evaluations", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*")
        .eq("member_id", userId!)
        .not("published_at", "is", null)
        .order("published_at", { ascending: false });
      return (data ?? []) as Evaluation[];
    },
  });

  const book = useMutation({
    mutationFn: async (slotId: string) => {
      await supabase.from("evaluation_bookings").insert({ slot_id: slotId, member_id: userId! });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-1">Heranalyse</div>
        <h1 className="h-display h2 text-ink-900">Evaluatie plannen</h1>
        <p className="muted text-sm mt-1">Kies een 15–20 min sessie met je coach.</p>
      </header>

      {(myBookings.data ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-ink-500">Geplande afspraken</h2>
          {(myBookings.data ?? []).map((b) => (
            b.evaluation_slots ? (
              <div key={b.id} className="card p-4 flex items-center gap-3">
                <Icon name="calendar" size={18} />
                <div className="flex-1">
                  <div className="font-medium text-ink-900">
                    {new Date(b.evaluation_slots.starts_at).toLocaleString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                  <div className="text-sm muted">
                    {new Date(b.evaluation_slots.starts_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(b.evaluation_slots.ends_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ) : null
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-ink-500">Beschikbare slots</h2>
        {slots.data?.length === 0 && (
          <p className="muted text-sm">Geen open slots — je coach moet er nog plannen.</p>
        )}
        {slots.data?.map((s) => (
          <button
            key={s.id}
            onClick={() => book.mutate(s.id)}
            disabled={book.isPending}
            className="card p-4 w-full flex items-center justify-between gap-3 hover:bg-teal-tint transition text-left"
          >
            <div>
              <div className="font-medium text-ink-900">
                {new Date(s.starts_at).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="text-sm muted">
                {new Date(s.starts_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                {" - "}
                {new Date(s.ends_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <span className="btn-primary btn-sm pointer-events-none"><Icon name="check" size={14} /> Boek</span>
          </button>
        ))}
      </section>

      {(myPublishedEvals.data ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-ink-500">Eerdere verslagen</h2>
          {(myPublishedEvals.data ?? []).map((e) => (
            <Link key={e.id} to={`/app/evaluatie/${e.id}`} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-ink-900">
                  Verslag {e.conducted_at ? new Date(e.conducted_at).toLocaleDateString("nl-NL") : ""}
                </div>
                <div className="text-xs muted">
                  Gepubliceerd {e.published_at && new Date(e.published_at).toLocaleDateString("nl-NL")}
                </div>
              </div>
              <Icon name="clipboard-list" size={16} />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
