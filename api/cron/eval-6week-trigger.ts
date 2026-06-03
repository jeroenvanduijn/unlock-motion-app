import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminClient, sendPushToMember } from "../_lib/push";

// Daily — leden waar program_start_date + 42 dagen == vandaag krijgen
// een uitnodiging om een evaluatie te plannen.

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const admin = adminClient();
    const target = new Date();
    target.setUTCDate(target.getUTCDate() - 42);
    const startDate = ymd(target);

    const { data: members } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "member")
      .eq("program_start_date", startDate);

    let pushed = 0;
    for (const m of members ?? []) {
      await sendPushToMember(m.id, {
        title: "Tijd voor je 6-weken evaluatie",
        body: "Plan je heranalyse met je coach in.",
        url: "/app/evaluatie",
        tag: "eval-6week",
      });
      pushed++;
    }
    return res.status(200).json({ ok: true, pushed, startDate });
  } catch (err) {
    console.error("eval-6week-trigger cron error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
