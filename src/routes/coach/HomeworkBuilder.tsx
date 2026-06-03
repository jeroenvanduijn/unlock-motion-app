import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import { ProtocolBadge } from "../../components/ProtocolBadge";
import { PROTOCOLS, PROTOCOL_LABELS } from "../../lib/protocols";
import type { Exercise, Profile, HomeworkAssignment, Protocol } from "../../lib/database.types";

export default function HomeworkBuilder() {
  const { id: memberId } = useParams<{ id: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();

  const memberQ = useQuery({
    queryKey: ["member-basic", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("id", memberId!).maybeSingle();
      return data as Pick<Profile, "id" | "full_name"> | null;
    },
  });

  const allExercises = useQuery({
    queryKey: ["all-exercises"],
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("*").order("protocol").order("hierarchy_level");
      return (data ?? []) as Exercise[];
    },
  });

  const activeQ = useQuery({
    queryKey: ["active-assignment", memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data: assignment } = await supabase
        .from("homework_assignments")
        .select("*")
        .eq("member_id", memberId!)
        .eq("is_active", true)
        .maybeSingle();
      const a = assignment as HomeworkAssignment | null;
      if (!a) return { assignment: null, exerciseIds: [] as string[], notes: "" };
      const { data: items } = await supabase
        .from("homework_exercises")
        .select("exercise_id, position")
        .eq("assignment_id", a.id)
        .order("position");
      return {
        assignment: a,
        exerciseIds: (items ?? []).map((i) => i.exercise_id),
        notes: a.notes ?? "",
      };
    },
  });

  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (activeQ.data) {
      setSelected(activeQ.data.exerciseIds);
      setNotes(activeQ.data.notes);
    }
  }, [activeQ.data]);

  function toggle(exerciseId: string) {
    setSelected((s) => s.includes(exerciseId) ? s.filter((id) => id !== exerciseId) : [...s, exerciseId]);
  }

  const save = useMutation({
    mutationFn: async () => {
      // Deactiveer bestaande actieve assignment.
      if (activeQ.data?.assignment) {
        await supabase
          .from("homework_assignments")
          .update({ is_active: false })
          .eq("id", activeQ.data.assignment.id);
      }
      // Nieuwe assignment.
      const { data: newA } = await supabase
        .from("homework_assignments")
        .insert({
          member_id: memberId!,
          assigned_by: session?.user.id,
          notes: notes.trim() || null,
          is_active: true,
        })
        .select("id")
        .single();
      if (!newA) throw new Error("Kon assignment niet aanmaken");
      // Items.
      const rows = selected.map((exercise_id, position) => ({
        assignment_id: newA.id,
        exercise_id,
        position,
        coach_notes: null,
      }));
      if (rows.length > 0) {
        await supabase.from("homework_exercises").insert(rows);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-assignment", memberId] });
      qc.invalidateQueries({ queryKey: ["member"] });
    },
  });

  const grouped: Record<Protocol, Exercise[]> = {} as Record<Protocol, Exercise[]>;
  for (const p of PROTOCOLS) grouped[p] = [];
  for (const e of allExercises.data ?? []) grouped[e.protocol].push(e);

  return (
    <div className="space-y-5">
      <Link to={`/coach/leden/${memberId}`} className="btn-ghost btn-sm w-fit">← {memberQ.data?.full_name ?? "Lid"}</Link>
      <header>
        <div className="eyebrow mb-1">Huiswerk samenstellen</div>
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>
          {memberQ.data?.full_name ?? "Lid"}
        </h1>
        <p className="muted text-sm mt-1">Tik om oefeningen aan/uit te zetten. Opslaan vervangt de huidige actieve toewijzing.</p>
      </header>

      <div className="card p-5">
        <label className="label">Notities (zichtbaar voor lid)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="textarea" rows={3} placeholder="Bv. focus 3x per week op deze set." />
      </div>

      {PROTOCOLS.map((p) => (
        <section key={p} className="space-y-2">
          <div className="flex items-center gap-2">
            <ProtocolBadge protocol={p} />
            <span className="text-sm uppercase tracking-wide text-ink-500">{PROTOCOL_LABELS[p]}</span>
          </div>
          <div className="space-y-1.5">
            {grouped[p].map((ex) => {
              const on = selected.includes(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggle(ex.id)}
                  className={`card p-3 w-full flex items-center justify-between text-left transition ${on ? "ring-2 ring-teal" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-ink-50 text-ink-700 flex items-center justify-center text-xs font-semibold">
                      {ex.hierarchy_level}
                    </span>
                    <span className="font-medium text-ink-900">{ex.title}</span>
                  </div>
                  {on ? <Icon name="check" size={16} /> : <Icon name="plus" size={16} />}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 lg:bottom-4 bg-bg pt-2">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-lg w-full shadow-cta">
          <Icon name="check" size={18} /> Opslaan ({selected.length} oefeningen)
        </button>
        {save.isSuccess && <p className="text-sm text-sage text-center mt-2">Opgeslagen ✓</p>}
      </div>
    </div>
  );
}
