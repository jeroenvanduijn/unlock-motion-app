import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import type { EvaluationSlot } from "../../lib/database.types";

export default function Slots() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const slotsQ = useQuery({
    queryKey: ["coach", "slots"],
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluation_slots")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at");
      const { data: bookings } = await supabase
        .from("evaluation_bookings")
        .select("slot_id, member_id, profiles:member_id(full_name)");
      const byId = new Map<string, { member_id: string; full_name: string | null }>();
      for (const b of bookings ?? []) {
        byId.set(b.slot_id, { member_id: b.member_id, full_name: (b as any).profiles?.full_name ?? null });
      }
      return ((data ?? []) as EvaluationSlot[]).map((s) => ({ ...s, booking: byId.get(s.id) ?? null }));
    },
  });

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(20);

  const create = useMutation({
    mutationFn: async () => {
      const starts = new Date(`${date}T${time}:00`);
      const ends = new Date(starts.getTime() + duration * 60_000);
      await supabase.from("evaluation_slots").insert({
        coach_id: session!.user.id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach", "slots"] });
      setDate(""); setTime("");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("evaluation_slots").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach", "slots"] }),
  });

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow mb-1">Coach</div>
        <h1 className="h-display h2 text-ink-900">Evaluatie-slots</h1>
      </header>

      <section className="card p-5 space-y-3">
        <div className="eyebrow-ink">Nieuw slot</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Datum</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Tijd</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Duur (min)</label>
            <input type="number" min={5} max={60} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
          </div>
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={!date || !time || create.isPending}
          className="btn-primary btn-sm w-fit"
        >
          <Icon name="plus" size={14} /> Toevoegen
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-ink-500">Komende slots</h2>
        {slotsQ.data?.length === 0 && <p className="muted text-sm">Geen slots.</p>}
        {slotsQ.data?.map((s) => (
          <div key={s.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-ink-900">
                {new Date(s.starts_at).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-xs muted">
                {s.booking ? `Geboekt door ${s.booking.full_name ?? "lid"}` : "Open"}
              </div>
            </div>
            {!s.booking && (
              <button onClick={() => remove.mutate(s.id)} className="btn-ghost btn-sm text-ink-500">
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
