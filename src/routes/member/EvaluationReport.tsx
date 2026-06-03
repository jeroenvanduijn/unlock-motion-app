import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import type { Evaluation, EvaluationMedia } from "../../lib/database.types";

export default function EvaluationReport() {
  const { id } = useParams();

  const q = useQuery({
    queryKey: ["evaluation", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: ev } = await supabase.from("evaluations").select("*").eq("id", id!).maybeSingle();
      const { data: media } = await supabase
        .from("evaluation_media")
        .select("*")
        .eq("evaluation_id", id!)
        .order("uploaded_at");
      return { evaluation: ev as Evaluation | null, media: (media ?? []) as EvaluationMedia[] };
    },
  });

  if (q.isLoading) return <p className="muted">Laden…</p>;
  const ev = q.data?.evaluation;
  if (!ev) return <p className="muted">Verslag niet gevonden of nog niet gepubliceerd.</p>;

  return (
    <div className="space-y-5">
      <Link to="/app/evaluatie" className="btn-ghost btn-sm w-fit">← Terug</Link>
      <header>
        <div className="eyebrow mb-1">Heranalyse-verslag</div>
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>
          {ev.conducted_at ? new Date(ev.conducted_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "Evaluatie"}
        </h1>
      </header>

      {ev.report_text && (
        <section className="card p-5">
          <div className="eyebrow-ink mb-2">Bevindingen</div>
          <p className="whitespace-pre-wrap text-ink-700">{ev.report_text}</p>
        </section>
      )}

      {q.data?.media && q.data.media.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-wide text-ink-500">Beeldmateriaal</h2>
          <div className="grid grid-cols-2 gap-3">
            {q.data.media.map((m) => (
              <MediaCard key={m.id} media={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MediaCard({ media }: { media: EvaluationMedia }) {
  const sign = useQuery({
    queryKey: ["media-signed", media.id],
    queryFn: async () => {
      const { data } = await supabase.storage.from("evaluation-media").createSignedUrl(media.storage_path, 3600);
      return data?.signedUrl ?? "";
    },
  });
  if (!sign.data) {
    return <div className="aspect-square bg-ink-50 rounded-xl flex items-center justify-center"><Icon name={media.kind === "video" ? "video" : "image"} size={20} /></div>;
  }
  if (media.kind === "video") {
    return <video src={sign.data} controls className="w-full aspect-square object-cover rounded-xl bg-black" />;
  }
  return <img src={sign.data} alt="" className="w-full aspect-square object-cover rounded-xl" />;
}
