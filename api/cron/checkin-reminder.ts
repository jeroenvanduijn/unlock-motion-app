import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminClient, sendPushToMember } from "../_lib/push";

// Daily 07:30 — leden met cadence='daily' dagelijks, 'weekly' alleen maandag.
// Skip leden die vandaag al een check-in hebben.

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const admin = adminClient();
    const today = new Date().toISOString().slice(0, 10);
    const dayOfWeek = new Date().getUTCDay(); // 0 zo, 1 ma

    const { data: members } = await admin
      .from("profiles")
      .select("id, checkin_cadence")
      .eq("role", "member");

    let pushed = 0;
    for (const m of members ?? []) {
      if (m.checkin_cadence === "weekly" && dayOfWeek !== 1) continue;
      const { count } = await admin
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("member_id", m.id)
        .eq("for_date", today);
      if ((count ?? 0) > 0) continue;
      await sendPushToMember(m.id, {
        title: "Check-in tijd",
        body: "Hoe voel je je vandaag? 30 seconden werk.",
        url: "/app/checkin",
        tag: "checkin-reminder",
      });
      pushed++;
    }
    return res.status(200).json({ ok: true, pushed });
  } catch (err) {
    console.error("checkin-reminder cron error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
