import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { NrsSlider } from "../../components/NrsSlider";
import { Icon } from "../../components/Icon";

export default function Checkin() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const qc = useQueryClient();

  const existing = useQuery({
    queryKey: ["checkin", userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", userId!)
        .eq("for_date", today)
        .maybeSingle();
      return data;
    },
  });

  const [complaint, setComplaint] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [soreness, setSoreness] = useState(5);
  const [fatigue, setFatigue] = useState(5);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (existing.data) {
      setComplaint(existing.data.complaint_severity ?? 5);
      setEnergy(existing.data.energy ?? 5);
      setSoreness(existing.data.soreness ?? 5);
      setFatigue(existing.data.fatigue ?? 5);
      setNote(existing.data.note ?? "");
    }
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("checkins").upsert({
        member_id: userId!,
        for_date: today,
        complaint_severity: complaint,
        energy,
        soreness,
        fatigue,
        note: note.trim() || null,
      }, { onConflict: "member_id,for_date" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checkin"] }),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <header>
        <div className="eyebrow mb-1">Hoe gaat het?</div>
        <h1 className="h-display h2 text-ink-900">Check-in</h1>
        <p className="muted text-sm mt-1">
          Score van 1 (heel weinig / heel goed) tot 10 (extreem / heel slecht).
        </p>
      </header>

      <div className="card p-5 space-y-6">
        <NrsSlider label="Klacht-intensiteit" hint="1 = geen last · 10 = heel veel last" value={complaint} onChange={setComplaint} />
        <NrsSlider label="Energieniveau" hint="1 = geen energie · 10 = heel energiek" value={energy} onChange={setEnergy} />
        <NrsSlider label="Spierpijn" hint="1 = geen spierpijn · 10 = extreme spierpijn" value={soreness} onChange={setSoreness} />
        <NrsSlider label="Vermoeidheid" hint="1 = uitgerust · 10 = uitgeput" value={fatigue} onChange={setFatigue} />

        <div>
          <label className="label" htmlFor="note">Notitie (optioneel)</label>
          <textarea
            id="note"
            className="textarea"
            placeholder="Bv. iets specifiekers over hoe je je vandaag voelt"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-lg w-full">
          <Icon name="check" size={18} />
          {existing.data ? "Bijwerken" : "Versturen"}
        </button>
        {save.isSuccess && <p className="text-sm text-sage text-center">Opgeslagen ✓</p>}
      </div>
    </div>
  );
}
