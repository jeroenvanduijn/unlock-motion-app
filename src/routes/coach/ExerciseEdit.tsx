import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { Icon } from "../../components/Icon";
import { BunnyPlayer } from "../../components/BunnyPlayer";
import { PROTOCOLS, PROTOCOL_LABELS } from "../../lib/protocols";
import type { Exercise, Protocol } from "../../lib/database.types";

export default function ExerciseEdit() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const { session } = useAuth();

  const existing = useQuery({
    queryKey: ["exercise", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data } = await supabase.from("exercises").select("*").eq("id", id!).maybeSingle();
      return data as Exercise | null;
    },
  });

  const [protocol, setProtocol] = useState<Protocol>("frontline");
  const [level, setLevel] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoId, setVideoId] = useState("");
  const [test, setTest] = useState("");

  useEffect(() => {
    if (existing.data) {
      setProtocol(existing.data.protocol);
      setLevel(existing.data.hierarchy_level);
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? "");
      setVideoId(existing.data.bunny_video_id ?? "");
      setTest(existing.data.test_instructions ?? "");
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        protocol,
        hierarchy_level: level,
        title: title.trim(),
        description: description.trim() || null,
        bunny_video_id: videoId.trim() || null,
        test_instructions: test.trim() || null,
        created_by: session?.user.id,
      };
      if (isNew) {
        const { data } = await supabase.from("exercises").insert(payload).select("id").single();
        return data?.id;
      }
      await supabase.from("exercises").update(payload).eq("id", id!);
      return id!;
    },
    onSuccess: (newId) => {
      qc.invalidateQueries({ queryKey: ["coach", "exercises"] });
      qc.invalidateQueries({ queryKey: ["exercise"] });
      if (newId) nav(`/coach/exercises/${newId}`, { replace: true });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (id) await supabase.from("exercises").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach", "exercises"] });
      nav("/coach/exercises");
    },
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <Link to="/coach/exercises" className="btn-ghost btn-sm w-fit">← Oefeningen</Link>
      <header>
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>
          {isNew ? "Nieuwe oefening" : title || "Oefening"}
        </h1>
      </header>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Protocol</label>
            <select value={protocol} onChange={(e) => setProtocol(e.target.value as Protocol)} className="select">
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>{PROTOCOL_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Niveau (1 = makkelijkst)</label>
            <input type="number" min={1} max={20} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Titel</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Bunny video-ID</label>
          <input value={videoId} onChange={(e) => setVideoId(e.target.value)} className="input" placeholder="bv. 0d2b1a4c-..." />
          <p className="text-xs muted mt-1">Library-ID staat in env. Vul hier alleen het video-ID in.</p>
        </div>
        {videoId && (
          <div>
            <div className="label">Preview</div>
            <BunnyPlayer videoId={videoId} />
          </div>
        )}
        <div>
          <label className="label">Beschrijving (uitleg voor het lid)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" rows={4} />
        </div>
        <div>
          <label className="label">Doorgroei-test</label>
          <textarea value={test} onChange={(e) => setTest(e.target.value)} className="textarea" rows={3} placeholder="Wanneer is het lid klaar voor de volgende stap?" />
        </div>

        <div className="flex gap-2 justify-between">
          <button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()} className="btn-primary">
            <Icon name="check" size={14} /> {isNew ? "Aanmaken" : "Opslaan"}
          </button>
          {!isNew && (
            <button onClick={() => confirm("Weet je het zeker?") && remove.mutate()} className="btn-ghost text-ink-500">
              <Icon name="trash" size={14} /> Verwijder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
