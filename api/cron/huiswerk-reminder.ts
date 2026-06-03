import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminClient, sendPushToMember } from "../_lib/push";

// Daily 18:00 — leden met active assignment en 0 completions vandaag krijgen reminder.

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const admin = adminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: assignments } = await admin
      .from("homework_assignments")
      .select("member_id")
      .eq("is_active", true);

    let pushed = 0;
    for (const a of assignments ?? []) {
      const { count } = await admin
        .from("exercise_completions")
        .select("id", { count: "exact", head: true })
        .eq("member_id", a.member_id)
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);
      if ((count ?? 0) > 0) continue;
      await sendPushToMember(a.member_id, {
        title: "Even Unlock-huiswerk?",
        body: "Je oefeningen staan klaar — 10 minuten is genoeg.",
        url: "/app/huiswerk",
        tag: "huiswerk-reminder",
      });
      pushed++;
    }
    return res.status(200).json({ ok: true, pushed });
  } catch (err) {
    console.error("huiswerk-reminder cron error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
