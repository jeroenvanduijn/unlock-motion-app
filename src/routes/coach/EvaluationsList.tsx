import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import type { Evaluation, EvaluationBooking, EvaluationSlot, Profile } from "../../lib/database.types";

type BookingRow = EvaluationBooking & {
  evaluation_slots: EvaluationSlot | null;
  profiles: Pick<Profile, "id" | "full_name"> | null;
};

export default function EvaluationsList() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const pendingQ = useQuery({
    queryKey: ["coach", "pending-evaluations"],
    queryFn: async () => {
      // Bookings die geen evaluation-row hebben en in het verleden liggen → wachten op verslag.
      const { data: bookings } = await supabase
        .from("evaluation_bookings")
        .select("*, evaluation_slots(*), profiles:member_id(id, full_name)")
        .order("booked_at", { ascending: false });
      const { data: evals } = await supabase.from("evaluations").select("booking_id");
      const handled = new Set((evals ?? []).map((e) => e.booking_id).filter(Boolean));
      return ((bookings ?? []) as unknown as BookingRow[]).filter((b) => !handled.has(b.id));
    },
  });

  const draftsQ = useQuery({
    queryKey: ["coach", "drafts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*")
        .is("published_at", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as Evaluation[];
    },
  });

  const publishedQ = useQuery({
    queryKey: ["coach", "published-evals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluations")
        .select("*, profiles:member_id(full_name)")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Array<Evaluation & { profiles: { full_name: string | null } | null }>;
    },
  });

  const createDraft = useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = (pendingQ.data ?? []).find((b) => b.id === bookingId);
      if (!booking) throw new Error("Booking niet gevonden");
      const { data } = await supabase
        .from("evaluations")
        .insert({
          member_id: booking.member_id,
          coach_id: session!.user.id,
          booking_id: bookingId,
          conducted_at: booking.evaluation_slots?.starts_at ?? new Date().toISOString(),
        })
        .select("id")
        .single();
      return data?.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["coach"] });
      if (id) window.location.href = `/coach/evaluations/${id}`;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-1">Coach</div>
        <h1 className="h-display h2 text-ink-900">Verslagen</h1>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-ink-500">Te verwerken (boekingen zonder verslag)</h2>
        {pendingQ.data?.length === 0 && <p className="muted text-sm">Geen openstaande boekingen.</p>}
        {pendingQ.data?.map((b) => (
          <div key={b.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-ink-900">{b.profiles?.full_name ?? "Lid"}</div>
              <div className="text-xs muted">
                {b.evaluation_slots?.starts_at && new Date(b.evaluation_slots.starts_at).toLocaleString("nl-NL")}
              </div>
            </div>
            <button onClick={() => createDraft.mutate(b.id)} className="btn-primary btn-sm">
              <Icon name="edit" size={14} /> Open verslag
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-ink-500">Concepten</h2>
        {draftsQ.data?.length === 0 && <p className="muted text-sm">Geen concepten.</p>}
        {draftsQ.data?.map((e) => (
          <Link key={e.id} to={`/coach/evaluations/${e.id}`} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-ink-900">Concept</div>
              <div className="text-xs muted">{new Date(e.created_at).toLocaleString("nl-NL")}</div>
            </div>
            <Icon name="edit" size={16} />
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-ink-500">Gepubliceerd</h2>
        {publishedQ.data?.map((e) => (
          <Link key={e.id} to={`/coach/evaluations/${e.id}`} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-ink-900">{e.profiles?.full_name ?? "Lid"}</div>
              <div className="text-xs muted">{e.published_at && new Date(e.published_at).toLocaleDateString("nl-NL")}</div>
            </div>
            <Icon name="clipboard-list" size={16} />
          </Link>
        ))}
      </section>
    </div>
  );
}
