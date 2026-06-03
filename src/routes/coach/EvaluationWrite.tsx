import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import type { Evaluation, EvaluationMedia, Profile } from "../../lib/database.types";

export default function EvaluationWrite() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const evalQ = useQuery({
    queryKey: ["evaluation-edit", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: e } = await supabase
        .from("evaluations")
        .select("*, profiles:member_id(id, full_name)")
        .eq("id", id!)
        .maybeSingle();
      const { data: media } = await supabase
        .from("evaluation_media")
        .select("*")
        .eq("evaluation_id", id!)
        .order("uploaded_at");
      return {
        evaluation: e as (Evaluation & { profiles: Pick<Profile, "id" | "full_name"> | null }) | null,
        media: (media ?? []) as EvaluationMedia[],
      };
    },
  });

  const [text, setText] = useState("");
  useEffect(() => {
    if (evalQ.data?.evaluation) setText(evalQ.data.evaluation.report_text ?? "");
  }, [evalQ.data?.evaluation]);

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      await supabase
        .from("evaluations")
        .update({
          report_text: text.trim() || null,
          published_at: publish ? new Date().toISOString() : evalQ.data?.evaluation?.published_at ?? null,
        })
        .eq("id", id!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluation-edit", id] });
      qc.invalidateQueries({ queryKey: ["coach"] });
    },
  });

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      for (const file of Array.from(files)) {
        const kind: "photo" | "video" = file.type.startsWith("video") ? "video" : "photo";
        const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("evaluation-media").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        await supabase.from("evaluation_media").insert({
          evaluation_id: id!,
          storage_path: path,
          kind,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation-edit", id] }),
  });

  const removeMedia = useMutation({
    mutationFn: async (m: EvaluationMedia) => {
      await supabase.storage.from("evaluation-media").remove([m.storage_path]);
      await supabase.from("evaluation_media").delete().eq("id", m.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation-edit", id] }),
  });

  const ev = evalQ.data?.evaluation;
  if (!ev) return <p className="muted">Verslag niet gevonden.</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      <Link to="/coach/evaluations" className="btn-ghost btn-sm w-fit">← Verslagen</Link>
      <header>
        <div className="eyebrow mb-1">Heranalyse</div>
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>
          {ev.profiles?.full_name ?? "Lid"}
        </h1>
        <p className="text-xs muted">
          {ev.published_at ? `Gepubliceerd ${new Date(ev.published_at).toLocaleString("nl-NL")}` : "Nog niet gepubliceerd"}
        </p>
      </header>

      <div className="card p-5 space-y-3">
        <label className="label">Verslag (zichtbaar voor lid na publiceren)</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="textarea" rows={10} />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => save.mutate(false)} disabled={save.isPending} className="btn-ghost btn-sm">
            <Icon name="check" size={14} /> Opslaan (concept)
          </button>
          <button onClick={() => save.mutate(true)} disabled={save.isPending} className="btn-primary btn-sm">
            <Icon name="send" size={14} /> {ev.published_at ? "Update publicatie" : "Publiceren"}
          </button>
        </div>
      </div>

      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Foto's en video's</h2>
          <button onClick={() => fileInput.current?.click()} className="btn-ghost btn-sm">
            <Icon name="plus" size={14} /> Upload
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && upload.mutate(e.target.files)}
          />
        </div>
        {upload.isPending && <p className="text-sm muted">Uploaden…</p>}
        <div className="grid grid-cols-2 gap-3">
          {evalQ.data?.media.map((m) => (
            <MediaThumb key={m.id} media={m} onDelete={() => removeMedia.mutate(m)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MediaThumb({ media, onDelete }: { media: EvaluationMedia; onDelete: () => void }) {
  const sign = useQuery({
    queryKey: ["coach-media-signed", media.id],
    queryFn: async () => {
      const { data } = await supabase.storage.from("evaluation-media").createSignedUrl(media.storage_path, 3600);
      return data?.signedUrl ?? "";
    },
  });
  return (
    <div className="relative">
      {sign.data ? (
        media.kind === "video" ? (
          <video src={sign.data} controls className="w-full aspect-square object-cover rounded-xl bg-black" />
        ) : (
          <img src={sign.data} alt="" className="w-full aspect-square object-cover rounded-xl" />
        )
      ) : (
        <div className="aspect-square bg-ink-50 rounded-xl" />
      )}
      <button onClick={onDelete} className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5">
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}
