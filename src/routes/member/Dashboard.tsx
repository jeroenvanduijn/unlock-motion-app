import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import { ProtocolBadge } from "../../components/ProtocolBadge";
import type { Exercise, HomeworkAssignment, Protocol } from "../../lib/database.types";

type HomeworkRow = {
  position: number;
  coach_notes: string | null;
  exercises: Exercise | null;
};

export default function Dashboard() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const homework = useQuery({
    queryKey: ["member", "today-homework", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: assignment } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("member_id", userId!)
        .eq("is_active", true)
        .maybeSingle();
      const a = assignment as HomeworkAssignment | null;
      if (!a) return { assignment: null, items: [] as HomeworkRow[] };
      const { data: items } = await supabase
        .from("homework_exercises")
        .select("position, coach_notes, exercises(*)")
        .eq("assignment_id", a.id)
        .order("position");
      return { assignment: a, items: (items ?? []) as unknown as HomeworkRow[] };
    },
  });

  const todayDone = useQuery({
    queryKey: ["member", "today-completions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("exercise_completions")
        .select("exercise_id, completed_at")
        .eq("member_id", userId!)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);
      return new Set((data ?? []).map((r) => r.exercise_id));
    },
  });

  const nextBooking = useQuery({
    queryKey: ["member", "next-booking", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("evaluation_bookings")
        .select("id, slot_id, evaluation_slots(starts_at, ends_at)")
        .eq("member_id", userId!)
        .order("booked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as { id: string; slot_id: string; evaluation_slots: { starts_at: string; ends_at: string } | null } | null;
    },
  });

  const items = homework.data?.items ?? [];
  const groupedByProtocol = items.reduce<Record<Protocol, HomeworkRow[]>>((acc, it) => {
    const p = it.exercises?.protocol;
    if (!p) return acc;
    (acc[p] ??= []).push(it);
    return acc;
  }, {} as Record<Protocol, HomeworkRow[]>);

  const total = items.length;
  const done = items.filter((it) => it.exercises && todayDone.data?.has(it.exercises.id)).length;

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-1">Welkom terug</div>
        <h1 className="h-display h2 text-ink-900">Hoi {profile?.full_name?.split(" ")[0] ?? ""}</h1>
        {profile?.program_start_date && (
          <p className="muted text-sm mt-1">
            Programma gestart op {new Date(profile.program_start_date).toLocaleDateString("nl-NL")}
          </p>
        )}
      </header>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow-ink">Vandaag</div>
            <h2 className="text-lg font-semibold text-ink-900">Huiswerk</h2>
          </div>
          <Link to="/app/huiswerk" className="btn-ghost btn-sm">
            Alles zien <Icon name="list" size={14} />
          </Link>
        </div>
        {total === 0 ? (
          <p className="muted text-sm">Geen actief huiswerk. Yari stelt je oefeningen samen na je volgende evaluatie.</p>
        ) : (
          <>
            <div className="progress"><div style={{ width: `${(done / total) * 100}%` }} /></div>
            <p className="text-sm muted">{done} van {total} oefeningen vandaag afgevinkt</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(groupedByProtocol) as Protocol[]).map((p) => (
                <ProtocolBadge key={p} protocol={p} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow-ink">Dagelijkse meting</div>
            <h2 className="text-lg font-semibold text-ink-900">Check-in invullen</h2>
            <p className="muted text-sm mt-1">Vul snel je klacht, energie, spierpijn en vermoeidheid in.</p>
          </div>
          <Link to="/app/checkin" className="btn-primary btn-sm">
            <Icon name="activity" size={14} /> Open
          </Link>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="eyebrow-ink">Volgende afspraak</div>
            <h2 className="text-lg font-semibold text-ink-900">Evaluatie</h2>
            {nextBooking.data?.evaluation_slots ? (
              <p className="muted text-sm mt-1">
                {new Date(nextBooking.data.evaluation_slots.starts_at).toLocaleString("nl-NL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <p className="muted text-sm mt-1">Nog geen afspraak — plan er één in.</p>
            )}
          </div>
          <Link to="/app/evaluatie" className="btn-ghost btn-sm">
            <Icon name="calendar" size={14} /> Plannen
          </Link>
        </div>
      </section>
    </div>
  );
}
