import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Icon } from "../../components/Icon";
import type { Profile, Checkin, CheckinCadence } from "../../lib/database.types";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const memberQ = useQuery({
    queryKey: ["member-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id!).maybeSingle();
      return data as Profile | null;
    },
  });

  const checkinsQ = useQuery({
    queryKey: ["member-checkins", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", id!)
        .order("for_date", { ascending: false })
        .limit(60);
      return (data ?? []) as Checkin[];
    },
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cadence, setCadence] = useState<CheckinCadence>("weekly");

  useEffect(() => {
    if (memberQ.data) {
      setStartDate(memberQ.data.program_start_date ?? "");
      setEndDate(memberQ.data.program_end_date ?? "");
      setCadence(memberQ.data.checkin_cadence ?? "weekly");
    }
  }, [memberQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase
        .from("profiles")
        .update({
          program_start_date: startDate || null,
          program_end_date: endDate || null,
          checkin_cadence: cadence,
        })
        .eq("id", id!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-detail", id] }),
  });

  const m = memberQ.data;
  if (!m) return <p className="muted">Lid niet gevonden.</p>;

  const checkins = (checkinsQ.data ?? []).slice().reverse(); // chronologisch
  const max = 10;
  const chartW = 320;
  const chartH = 80;

  return (
    <div className="space-y-5">
      <Link to="/coach" className="btn-ghost btn-sm w-fit">← Leden</Link>
      <header>
        <h1 className="h-display h2 text-ink-900" style={{ textTransform: "none", letterSpacing: 0 }}>{m.full_name ?? "Onbekend"}</h1>
        <p className="muted text-sm">{m.phone}</p>
      </header>

      <section className="card p-5 space-y-3">
        <div className="eyebrow-ink">Programma</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Startdatum</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Einddatum</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label">Check-in ritme</label>
          <div className="flex gap-2">
            <button onClick={() => setCadence("daily")} className={cadence === "daily" ? "chip active" : "chip"}>Dagelijks</button>
            <button onClick={() => setCadence("weekly")} className={cadence === "weekly" ? "chip active" : "chip"}>Wekelijks</button>
          </div>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-sm w-fit">
          <Icon name="check" size={14} /> Opslaan
        </button>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow-ink">Klacht-intensiteit (NRS)</div>
          <span className="text-xs muted">{checkins.length} metingen</span>
        </div>
        {checkins.length === 0 ? (
          <p className="muted text-sm">Nog geen check-ins.</p>
        ) : (
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-20">
            <polyline
              fill="none"
              stroke="#2D5F5D"
              strokeWidth="2"
              points={checkins
                .map((c, i) => {
                  const x = (i / Math.max(1, checkins.length - 1)) * chartW;
                  const y = chartH - ((c.complaint_severity ?? 0) / max) * chartH;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
          </svg>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link to={`/coach/leden/${id}/huiswerk`} className="card p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-ink-900">Huiswerk</div>
            <div className="text-xs muted">Samenstellen / aanpassen</div>
          </div>
          <Icon name="list" size={18} />
        </Link>
        <div className="card p-4">
          <div className="font-medium text-ink-900">6-weken eval</div>
          <div className="text-xs muted">
            {m.program_start_date
              ? `Trigger op ${new Date(new Date(m.program_start_date).getTime() + 42 * 24 * 60 * 60 * 1000).toLocaleDateString("nl-NL")}`
              : "Geen startdatum"}
          </div>
        </div>
      </section>
    </div>
  );
}
