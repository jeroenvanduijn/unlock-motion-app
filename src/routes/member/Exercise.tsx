import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { BunnyPlayer } from "../../components/BunnyPlayer";
import { ProtocolBadge } from "../../components/ProtocolBadge";
import { Icon } from "../../components/Icon";
import type { Exercise as Ex } from "../../lib/database.types";

export default function Exercise() {
  const { id } = useParams();
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const exQ = useQuery({
    queryKey: ["exercise", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("*").eq("id", id!).maybeSingle();
      return data as Ex | null;
    },
  });

  const doneQ = useQuery({
    queryKey: ["exercise-done-today", id, userId],
    enabled: !!id && !!userId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("exercise_completions")
        .select("id")
        .eq("member_id", userId!)
        .eq("exercise_id", id!)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (doneQ.data) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase
          .from("exercise_completions")
          .delete()
          .eq("member_id", userId!)
          .eq("exercise_id", id!)
          .gte("completed_at", `${today}T00:00:00`)
          .lte("completed_at", `${today}T23:59:59`);
      } else {
        await supabase.from("exercise_completions").insert({
          member_id: userId!,
          exercise_id: id!,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercise-done-today", id] });
      qc.invalidateQueries({ queryKey: ["member"] });
    },
  });

  const ex = exQ.data;
  if (!ex && !exQ.isLoading) return <p className="muted">Oefening niet gevonden.</p>;
  if (!ex) return null;

  return (
    <div className="space-y-5">
      <Link to="/app/huiswerk" className="btn-ghost btn-sm w-fit">← Terug naar huiswerk</Link>
      <header className="space-y-2">
        <ProtocolBadge protocol={ex.protocol} level={ex.hierarchy_level} />
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>{ex.title}</h1>
      </header>
      <BunnyPlayer videoId={ex.bunny_video_id} title={ex.title} />
      {ex.description && (
        <section className="card p-5">
          <div className="eyebrow-ink mb-2">Uitleg</div>
          <p className="whitespace-pre-wrap text-ink-700">{ex.description}</p>
        </section>
      )}
      {ex.test_instructions && (
        <section className="card p-5">
          <div className="eyebrow-ink mb-2">Doorgroei-test</div>
          <p className="whitespace-pre-wrap text-ink-700">{ex.test_instructions}</p>
        </section>
      )}
      <button
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        className={doneQ.data ? "btn-ghost btn-lg w-full" : "btn-primary btn-lg w-full"}
      >
        <Icon name={doneQ.data ? "x" : "check"} size={18} />
        {doneQ.data ? "Vandaag al gedaan — terugzetten" : "Klaar — vink af voor vandaag"}
      </button>
    </div>
  );
}
