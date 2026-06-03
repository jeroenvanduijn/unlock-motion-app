import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import { ProtocolBadge } from "../../components/ProtocolBadge";
import { PROTOCOLS, PROTOCOL_LABELS } from "../../lib/protocols";
import type { Exercise, HomeworkAssignment, Protocol } from "../../lib/database.types";

type Row = {
  position: number;
  coach_notes: string | null;
  exercises: Exercise | null;
};

export default function Homework() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const q = useQuery({
    queryKey: ["member", "homework", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: assignment } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("member_id", userId!)
        .eq("is_active", true)
        .maybeSingle();
      const a = assignment as HomeworkAssignment | null;
      if (!a) return { assignment: null, items: [] as Row[], done: new Set<string>() };
      const { data: items } = await supabase
        .from("homework_exercises")
        .select("position, coach_notes, exercises(*)")
        .eq("assignment_id", a.id)
        .order("position");
      const today = new Date().toISOString().slice(0, 10);
      const { data: completions } = await supabase
        .from("exercise_completions")
        .select("exercise_id")
        .eq("member_id", userId!)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);
      const done = new Set((completions ?? []).map((c) => c.exercise_id));
      return { assignment: a, items: (items ?? []) as unknown as Row[], done };
    },
  });

  const items = q.data?.items ?? [];
  const done = q.data?.done ?? new Set<string>();

  const grouped: Record<Protocol, Row[]> = {} as Record<Protocol, Row[]>;
  for (const p of PROTOCOLS) grouped[p] = [];
  for (const it of items) {
    if (it.exercises?.protocol) grouped[it.exercises.protocol].push(it);
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow mb-1">Jouw plan</div>
        <h1 className="h-display h2 text-ink-900">Huiswerk</h1>
        {q.data?.assignment?.notes && (
          <p className="muted text-sm mt-2 max-w-prose">{q.data.assignment.notes}</p>
        )}
      </header>

      {items.length === 0 && !q.isLoading && (
        <div className="card p-6 text-center">
          <p className="muted">Yari heeft nog geen huiswerk voor je klaargezet.</p>
        </div>
      )}

      {PROTOCOLS.map((p) => {
        const list = grouped[p];
        if (list.length === 0) return null;
        return (
          <section key={p} className="space-y-3">
            <div className="flex items-center gap-3">
              <ProtocolBadge protocol={p} />
              <h2 className="text-sm uppercase tracking-wide text-ink-500">{PROTOCOL_LABELS[p]}</h2>
            </div>
            <div className="space-y-2">
              {list.map((it) => {
                const ex = it.exercises;
                if (!ex) return null;
                const isDone = done.has(ex.id);
                return (
                  <Link
                    key={ex.id}
                    to={`/app/oefening/${ex.id}`}
                    className={`card p-4 flex items-center justify-between gap-3 transition ${isDone ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDone ? "bg-sage-tint text-sage" : "bg-teal-tint text-teal"}`}>
                        {isDone ? <Icon name="check" size={16} /> : <Icon name="play" size={14} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink-900 truncate">{ex.title}</div>
                        <div className="text-xs muted">Level {ex.hierarchy_level}</div>
                      </div>
                    </div>
                    <Icon name="play" size={16} />
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
